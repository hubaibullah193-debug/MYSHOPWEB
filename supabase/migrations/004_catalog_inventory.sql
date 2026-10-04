-- =============================================================================
-- 004_catalog_inventory.sql
--
-- T003 — Products, Categories & Inventory (admin catalogue).
--
-- Adds the Phase 1 product-catalogue foundation:
--   * categories hierarchy (category -> subcategory)
--   * product fields: subcategory, availability (is_active), SEO (slug, seo_title,
--     seo_description), sale pricing window (sale_price + optional sale_starts_at /
--     sale_ends_at), related category ids, and a JSONB image gallery
--   * product_variants with optional per-variant price and independent stock
--     (product_inventory.variant_id)
--   * inventory_logs.variant_id for variant-level audit
--   * public.current_price() — the single source of truth for the effective
--     selling price (sale price while the sale window is active)
--   * order-price integrity: create_order_with_payment now prices from
--     current_price(), and transition_order_status deducts stock without a
--     partial-deduction guard-race (sum-based sufficiency check + FIFO across
--     variant rows when no variant is specified)
--   * RLS policies for the new tables, delete support on products/inventory,
--     and a public `product-images` storage bucket (admin-managed uploads)
--
-- Safe to run after migrations 001 -> 002 -> 003. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Product categories (hierarchy: category -> subcategory)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  parent_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- New product columns (multiple images, availability, SEO, sale, hierarchy)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id  UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory     TEXT,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS slug            TEXT,
  ADD COLUMN IF NOT EXISTS seo_title       TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS sale_price      NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS sale_starts_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sale_ends_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS images          JSONB NOT NULL DEFAULT '[]';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sale_price_check,
  ADD CONSTRAINT products_sale_price_check CHECK (sale_price IS NULL OR sale_price >= 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sale_window_check,
  ADD CONSTRAINT products_sale_window_check CHECK (
    sale_price IS NULL
    OR (sale_starts_at IS NULL AND sale_ends_at IS NULL)
    OR (sale_starts_at IS NOT NULL AND sale_ends_at IS NOT NULL AND sale_ends_at > sale_starts_at)
  );

-- One slug per product; NULL slugs stay out of the unique index.
DROP INDEX IF EXISTS products_slug_unique;
CREATE UNIQUE INDEX products_slug_unique ON public.products(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active_updated ON public.products(is_active, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Product variants (independent stock via product_inventory.variant_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      NUMERIC(10, 2),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_price_check,
  ADD CONSTRAINT product_variants_price_check CHECK (price IS NULL OR price >= 0);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id, is_active);

-- ---------------------------------------------------------------------------
-- Inventory becomes variant-aware.
-- product_inventory stays unique per (product_id, variant_id); a product-level
-- row is variant_id IS NULL and is THE stock row for products without variants.
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_inventory
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE;

ALTER TABLE public.product_inventory
  DROP CONSTRAINT IF EXISTS product_inventory_product_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.product_inventory'::regclass AND conname = 'product_inventory_product_variant_unique'
  ) THEN
    ALTER TABLE public.product_inventory
      ADD CONSTRAINT product_inventory_product_variant_unique UNIQUE (product_id, variant_id);
  END IF;
END
$$;

DROP INDEX IF EXISTS product_inventory_product_only_unique;
CREATE UNIQUE INDEX product_inventory_product_only_unique
  ON public.product_inventory(product_id) WHERE variant_id IS NULL;

ALTER TABLE public.inventory_logs
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Effective selling price — STABLE so it can be used in SQL queries guardedly.
-- Sale is active when a sale price exists and the window covers NOW() (an open
-- window with both dates NULL means "sale always on").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_price(prod public.products)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN prod.sale_price IS NOT NULL
         AND (prod.sale_starts_at IS NULL OR prod.sale_starts_at <= NOW())
         AND (prod.sale_ends_at IS NULL OR prod.sale_ends_at >= NOW())
    THEN prod.sale_price
    ELSE prod.price
  END
$$;

REVOKE ALL ON FUNCTION public.current_price(public.products) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_price(public.products) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Order pricing integrity: order totals are computed from the EFFECTIVE price.
-- (signature unchanged; verification suite below still matches 13 args)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_payment(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_items JSONB,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_delivery_method TEXT,
  p_idempotency_key TEXT,
  p_request_hash TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_payment_evidence TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_order public.orders;
  created_order public.orders;
  initial_status TEXT;
  item JSONB;
  local_product_id UUID;
  requested_quantity INT;
  product_price NUMERIC;
  calculated_total NUMERIC := 0;
  verified_items JSONB := '[]'::jsonb;
BEGIN
  IF p_idempotency_key IS NULL OR char_length(trim(p_idempotency_key)) < 16 OR char_length(trim(p_idempotency_key)) > 128 THEN
    RAISE EXCEPTION 'Invalid idempotency key';
  END IF;

  IF p_request_hash IS NULL OR char_length(trim(p_request_hash)) <> 64 THEN
    RAISE EXCEPTION 'Invalid request hash';
  END IF;

  SELECT o.* INTO existing_order
  FROM public.order_idempotency_keys k
  JOIN public.orders o ON o.id = k.order_id
  WHERE k.key = trim(p_idempotency_key);

  IF FOUND THEN
    IF (SELECT request_hash FROM public.order_idempotency_keys WHERE key = trim(p_idempotency_key)) <> p_request_hash THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different request';
    END IF;
    RETURN existing_order;
  END IF;

  IF p_payment_method NOT IN ('cod', 'jazz_cash', 'easypaisa')
     OR p_delivery_method NOT IN ('self', 'courier')
     OR p_customer_name IS NULL
     OR char_length(trim(p_customer_name)) = 0
     OR p_customer_email IS NULL
     OR char_length(trim(p_customer_email)) = 0
     OR p_customer_email NOT ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     OR p_customer_phone IS NULL
     OR char_length(trim(p_customer_phone)) = 0
     OR p_customer_phone NOT ~ '^(?:\+92|0|92)3[0-9]{8,9}$'
     OR (p_delivery_method = 'courier' AND (p_customer_address IS NULL OR char_length(trim(p_customer_address)) = 0)) THEN
    RAISE EXCEPTION 'Invalid order details';
  END IF;

  IF p_payment_method = 'cod' AND NULLIF(trim(p_transaction_id), '') IS NOT NULL THEN
    RAISE EXCEPTION 'COD orders cannot include a transaction reference';
  END IF;

  IF p_payment_method <> 'cod' AND NULLIF(trim(p_transaction_id), '') IS NULL THEN
    RAISE EXCEPTION 'Payment transaction reference is required';
  END IF;

  IF p_payment_method = 'cod' AND NULLIF(trim(p_payment_evidence), '') IS NOT NULL THEN
    RAISE EXCEPTION 'COD orders cannot include payment evidence';
  END IF;

  IF p_payment_method <> 'cod' AND (
    p_payment_evidence IS NULL
    OR char_length(trim(p_payment_evidence)) < 1
    OR char_length(trim(p_payment_evidence)) > 500
    OR trim(p_payment_evidence) NOT ~ '^payment-evidence/[0-9a-fA-F-]{36}\.(png|jpe?g|webp)$'
  ) THEN
    RAISE EXCEPTION 'A valid payment screenshot is required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Invalid order items';
  END IF;
  IF jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Invalid order items';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(item) <> 'object'
       OR item ->> 'product_id' IS NULL
       OR item ->> 'quantity' IS NULL
       OR NOT (item ->> 'product_id') ~ '^[0-9a-fA-F-]{36}$'
       OR NOT (item ->> 'quantity') ~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'Invalid order item';
    END IF;

    local_product_id := (item ->> 'product_id')::UUID;
    requested_quantity := (item ->> 'quantity')::INT;
    IF requested_quantity > 100 THEN
      RAISE EXCEPTION 'Invalid order item quantity';
    END IF;

    -- Price from the effective selling price (sale-aware) — migration 004.
    SELECT public.current_price(p.*)
    INTO product_price
    FROM public.products p
    WHERE p.id = local_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product no longer available';
    END IF;

    calculated_total := calculated_total + product_price * requested_quantity;
    verified_items := verified_items || jsonb_build_object(
      'product_id', local_product_id,
      'product_name', (SELECT name FROM public.products WHERE id = local_product_id),
      'price', product_price,
      'quantity', requested_quantity
    );
  END LOOP;

  IF p_total_amount IS NULL OR round(calculated_total, 2) <> round(p_total_amount, 2) THEN
    RAISE EXCEPTION 'Order total does not match product prices';
  END IF;

  initial_status := CASE WHEN p_payment_method = 'cod' THEN 'received' ELSE 'pending_payment' END;

  INSERT INTO public.orders (
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    items,
    total_amount,
    status,
    payment_method,
    payment_status,
    delivery_method
  ) VALUES (
    p_customer_id,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    trim(p_customer_phone),
    trim(COALESCE(p_customer_address, '')),
    verified_items,
    round(calculated_total, 2),
    initial_status,
    p_payment_method,
    'pending',
    p_delivery_method
  )
  RETURNING * INTO created_order;

  INSERT INTO public.payments (order_id, amount, method, status, transaction_id, payment_evidence_url)
  VALUES (created_order.id, round(calculated_total, 2), p_payment_method, 'pending', NULLIF(trim(p_transaction_id), ''), NULLIF(trim(p_payment_evidence), ''));

  INSERT INTO public.order_idempotency_keys (key, request_hash, order_id)
  VALUES (trim(p_idempotency_key), p_request_hash, created_order.id);

  RETURN created_order;
EXCEPTION
  WHEN unique_violation THEN
    SELECT o.* INTO existing_order
    FROM public.order_idempotency_keys k
    JOIN public.orders o ON o.id = k.order_id
    WHERE k.key = trim(p_idempotency_key);

    IF FOUND THEN
      IF (SELECT request_hash FROM public.order_idempotency_keys WHERE key = trim(p_idempotency_key)) <> p_request_hash THEN
        RAISE EXCEPTION 'Idempotency key was already used for a different request';
      END IF;
      RETURN existing_order;
    END IF;
    RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- Stock deduction on Received -> Processing.
-- Safety, sum check BEFORE any partial update; then FIFO across variant rows
-- when no variant row exists (product-level row is preferred). Exactly-once is
-- still guarded by orders.inventory_deducted_at.
-- (signature unchanged; suite still matches uuid, text, uuid, text)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_order public.orders;
  previous_status TEXT;
  item JSONB;
  local_product_id UUID;
  requested_quantity INT;
  collected_quantity INT;
  remaining INT;
  fifo_row RECORD;
  inventory_row_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_id AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_new_status NOT IN ('pending_payment', 'received', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;

  SELECT * INTO current_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  previous_status := current_order.status;
  IF previous_status = p_new_status THEN
    RETURN current_order;
  END IF;

  IF p_new_status = 'cancelled' THEN
    IF previous_status NOT IN ('pending_payment', 'received') THEN
      RAISE EXCEPTION 'Order cannot be cancelled after processing';
    END IF;
    IF current_order.payment_status IN ('paid', 'refunded') THEN
      RAISE EXCEPTION 'Paid orders cannot be cancelled';
    END IF;
  ELSIF previous_status = 'pending_payment' AND p_new_status = 'received' THEN
    IF current_order.payment_method <> 'cod' AND current_order.payment_status <> 'paid' THEN
      RAISE EXCEPTION 'Payment must be verified first';
    END IF;
  ELSIF previous_status = 'received' AND p_new_status = 'processing' THEN
    IF jsonb_typeof(current_order.items) <> 'array' THEN
      RAISE EXCEPTION 'Order has no inventory items';
    END IF;
    IF jsonb_array_length(current_order.items) < 1 THEN
      RAISE EXCEPTION 'Order has no inventory items';
    END IF;
    IF current_order.inventory_deducted_at IS NULL THEN

      -- Sufficiency pre-pass over ALL items BEFORE any deduction.
      FOR item IN SELECT * FROM jsonb_array_elements(current_order.items) LOOP
        IF jsonb_typeof(item) <> 'object'
           OR NOT (item ->> 'product_id') ~ '^[0-9a-fA-F-]{36}$'
           OR NOT (item ->> 'quantity') ~ '^[1-9][0-9]*$' THEN
          RAISE EXCEPTION 'Invalid inventory item';
        END IF;
        local_product_id := (item ->> 'product_id')::UUID;
        requested_quantity := (item ->> 'quantity')::INT;
        IF requested_quantity > 100 THEN
          RAISE EXCEPTION 'Invalid inventory quantity';
        END IF;

        -- Effective available quantity = product-level row OR sum across variants.
        SELECT COALESCE(SUM(q.quantity), 0)::INT INTO collected_quantity
        FROM public.product_inventory q
        WHERE q.product_id = local_product_id;

        IF collected_quantity < requested_quantity THEN
          RAISE EXCEPTION 'Insufficient inventory for product %', local_product_id;
        END IF;
      END LOOP;

      -- Deduction pass (FIFO across variant rows).
      FOR item IN SELECT * FROM jsonb_array_elements(current_order.items) LOOP
        local_product_id := (item ->> 'product_id')::UUID;
        requested_quantity := (item ->> 'quantity')::INT;

        -- Prefer the product-level row when the product inventory is not variant-based.
        SELECT q.id INTO inventory_row_id
        FROM public.product_inventory q
        WHERE q.product_id = local_product_id AND q.variant_id IS NULL
        LIMIT 1;

        IF FOUND THEN
          UPDATE public.product_inventory
          SET quantity = quantity - requested_quantity, last_updated = NOW()
          WHERE id = inventory_row_id;
          INSERT INTO public.inventory_logs (
            product_id, variant_id, quantity_change, reason, order_id, created_by
          ) VALUES (
            local_product_id, NULL, -requested_quantity, 'order_processing', p_order_id, p_admin_id
          );
        ELSE
          -- Variant-provided stock: FIFO across variant rows by creation order.
          remaining := requested_quantity;
          FOR fifo_row IN
            SELECT q.id AS inventory_id, q.quantity, q.variant_id
            FROM public.product_inventory q
            WHERE q.product_id = local_product_id AND q.variant_id IS NOT NULL
            ORDER BY q.last_updated, q.id
            FOR UPDATE
          LOOP
            IF remaining = 0 THEN EXIT; END IF;
            IF fifo_row.quantity > 0 THEN
              IF fifo_row.quantity >= remaining THEN
                UPDATE public.product_inventory
                SET quantity = quantity - remaining, last_updated = NOW()
                WHERE id = fifo_row.inventory_id;
                INSERT INTO public.inventory_logs (
                  product_id, variant_id, quantity_change, reason, order_id, created_by
                ) VALUES (
                  local_product_id, fifo_row.variant_id, -remaining, 'order_processing', p_order_id, p_admin_id
                );
                remaining := 0;
              ELSE
                UPDATE public.product_inventory
                SET quantity = 0, last_updated = NOW()
                WHERE id = fifo_row.inventory_id;
                INSERT INTO public.inventory_logs (
                  product_id, variant_id, quantity_change, reason, order_id, created_by
                ) VALUES (
                  local_product_id, fifo_row.variant_id, -fifo_row.quantity, 'order_processing', p_order_id, p_admin_id
                );
                remaining := remaining - fifo_row.quantity;
              END IF;
            END IF;
          END LOOP;
          IF remaining > 0 THEN
            RAISE EXCEPTION 'Insufficient inventory for product %', local_product_id;
          END IF;
        END IF;
      END LOOP;

      UPDATE public.orders SET inventory_deducted_at = NOW() WHERE id = p_order_id;
    END IF;
  ELSIF NOT (
    (previous_status = 'processing' AND p_new_status = 'ready') OR
    (previous_status = 'ready' AND p_new_status = 'out_for_delivery') OR
    (previous_status = 'out_for_delivery' AND p_new_status = 'delivered')
  ) THEN
    RAISE EXCEPTION 'Invalid order transition';
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      admin_notes = COALESCE(p_notes, admin_notes),
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO current_order;

  INSERT INTO public.activity_logs (
    admin_id, action, entity_type, entity_id, changes
  ) VALUES (
    p_admin_id,
    'order_status_updated',
    'order',
    p_order_id,
    jsonb_build_object('from', previous_status, 'to', p_new_status)
  );

  RETURN current_order;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin catalogue operations — SECURITY DEFINER, service_role only.
-- All writes to products / product_variants / product_inventory go through
-- these RPCs so that creation, variant inventory setup and the
-- product-level <-> variant mode invariant are applied transactionally.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._catalog_admin_check(p_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_uid AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_product(
  p_creator_id UUID,
  p_product JSONB,
  p_variants JSONB DEFAULT '[]'
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_row public.products;
  new_product_id UUID;
  resolved_category_id UUID;
  resolved_subcategory_id UUID;
  variant RECORD;
  variant_price NUMERIC;
  variant_stock INT;
BEGIN
  PERFORM public._catalog_admin_check(p_creator_id);

  IF p_product IS NULL OR jsonb_typeof(p_product) <> 'object' THEN
    RAISE EXCEPTION 'Invalid product details';
  END IF;
  IF NULLIF(p_product ->> 'name', '') IS NULL OR char_length(p_product ->> 'name') < 1 OR char_length(p_product ->> 'name') > 140 THEN
    RAISE EXCEPTION 'Invalid product name';
  END IF;
  IF (p_product ->> 'price') IS NULL OR NOT (p_product ->> 'price') ~ '^[0-9]+\.?[0-9]*$' OR (p_product ->> 'price')::NUMERIC <= 0 THEN
    RAISE EXCEPTION 'Invalid product price';
  END IF;
  IF (p_product ->> 'sale_price') IS NOT NULL AND ((p_product ->> 'sale_price')::NUMERIC < 0) THEN
    RAISE EXCEPTION 'Invalid sale price';
  END IF;

  -- Category integrity: a subcategory must exist and always resolves its parent.
  IF p_product ->> 'subcategory_id' IS NOT NULL THEN
    SELECT c.parent_id, c.id INTO resolved_category_id, resolved_subcategory_id
    FROM public.categories c
    WHERE c.id = (p_product ->> 'subcategory_id')::UUID AND c.is_active = TRUE;
    IF NOT FOUND OR resolved_category_id IS NULL THEN
      RAISE EXCEPTION 'Invalid subcategory';
    END IF;
  END IF;
  IF p_product ->> 'category_id' IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = (p_product ->> 'category_id')::UUID AND c.is_active = TRUE AND c.parent_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Invalid category';
    END IF;
    IF resolved_subcategory_id IS NOT NULL AND resolved_category_id <> (p_product ->> 'category_id')::UUID THEN
      RAISE EXCEPTION 'Category and subcategory do not match';
    END IF;
    IF resolved_subcategory_id IS NULL THEN
      resolved_category_id := (p_product ->> 'category_id')::UUID;
    END IF;
  END IF;

  INSERT INTO public.products (
    name, description, price, category, image_url,
    category_id, subcategory_id, subcategory, is_active, slug,
    seo_title, seo_description, sale_price, sale_starts_at, sale_ends_at, images
  ) VALUES (
    trim(p_product ->> 'name'),
    NULLIF(p_product ->> 'description', ''),
    (p_product ->> 'price')::NUMERIC,
    NULL,
    NULLIF(p_product ->> 'image_url', ''),
    resolved_category_id,
    resolved_subcategory_id,
    NULLIF(p_product ->> 'subcategory', ''),
    CASE WHEN (p_product ->> 'is_active') IS NULL THEN TRUE ELSE (p_product ->> 'is_active')::BOOLEAN END,
    NULLIF(p_product ->> 'slug', ''),
    NULLIF(p_product ->> 'seo_title', ''),
    NULLIF(p_product ->> 'seo_description', ''),
    CASE WHEN (p_product ->> 'sale_price') IS NULL THEN NULL ELSE (p_product ->> 'sale_price')::NUMERIC END,
    CASE WHEN (p_product ->> 'sale_starts_at') IS NULL THEN NULL ELSE (p_product ->> 'sale_starts_at')::TIMESTAMPTZ END,
    CASE WHEN (p_product ->> 'sale_ends_at') IS NULL THEN NULL ELSE (p_product ->> 'sale_ends_at')::TIMESTAMPTZ END,
    CASE WHEN jsonb_typeof(p_product -> 'images') = 'array' THEN p_product -> 'images' ELSE '[]'::jsonb END
  )
  RETURNING * INTO product_row;

  new_product_id := product_row.id;

  IF p_variants IS NULL OR jsonb_typeof(p_variants) <> 'array' OR jsonb_array_length(p_variants) = 0 THEN
    INSERT INTO public.product_inventory (product_id, quantity) VALUES (new_product_id, 0);
  ELSE
    FOR variant IN SELECT value FROM jsonb_array_elements(p_variants) LOOP
      IF NULLIF(variant.value ->> 'name', '') IS NULL THEN
        RAISE EXCEPTION 'Invalid variant name';
      END IF;
      variant_price := CASE
        WHEN variant.value ->> 'price' IS NULL OR (variant.value ->> 'price') = '' THEN NULL
        ELSE (variant.value ->> 'price')::NUMERIC
      END;
      IF variant_price IS NOT NULL AND (variant_price < 0) THEN
        RAISE EXCEPTION 'Invalid variant price';
      END IF;
      variant_stock := CASE WHEN variant.value ->> 'stock' IS NULL THEN 0 ELSE (variant.value ->> 'stock')::INT END;
      IF variant_stock < 0 THEN
        RAISE EXCEPTION 'Invalid variant stock';
      END IF;
      INSERT INTO public.product_variants (product_id, name, price, is_active)
      VALUES (new_product_id, trim(variant.value ->> 'name'), variant_price, COALESCE((variant.value ->> 'is_active')::BOOLEAN, TRUE))
      RETURNING * INTO variant;
      INSERT INTO public.product_inventory (product_id, variant_id, quantity)
      VALUES (new_product_id, variant.id, variant_stock);
      IF variant_stock > 0 THEN
        INSERT INTO public.inventory_logs (product_id, variant_id, quantity_change, reason, order_id, created_by)
        VALUES (new_product_id, variant.id, variant_stock, 'initial_stock', NULL, p_creator_id);
      END IF;
    END LOOP;
  END IF;

  RETURN product_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_creator_id UUID,
  p_product_id UUID,
  p_product JSONB,
  p_variants JSONB DEFAULT '[]'
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_row public.products;
  resolved_category_id UUID;
  resolved_subcategory_id UUID;
  keep_ids UUID[] := ARRAY[]::UUID[];
  variant RECORD;
  variant_price NUMERIC;
  existing_id UUID;
  new_variant_id UUID;
  old_product_stock INT;
BEGIN
  PERFORM public._catalog_admin_check(p_creator_id);

  SELECT * INTO product_row FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF p_product IS NULL OR jsonb_typeof(p_product) <> 'object' THEN
    RAISE EXCEPTION 'Invalid product details';
  END IF;
  IF NULLIF(p_product ->> 'name', '') IS NULL OR char_length(p_product ->> 'name') < 1 OR char_length(p_product ->> 'name') > 140 THEN
    RAISE EXCEPTION 'Invalid product name';
  END IF;
  IF (p_product ->> 'price') IS NULL OR NOT (p_product ->> 'price') ~ '^[0-9]+\.?[0-9]*$' OR (p_product ->> 'price')::NUMERIC <= 0 THEN
    RAISE EXCEPTION 'Invalid product price';
  END IF;
  IF (p_product ->> 'sale_price') IS NOT NULL AND ((p_product ->> 'sale_price')::NUMERIC < 0) THEN
    RAISE EXCEPTION 'Invalid sale price';
  END IF;

  IF p_product ->> 'subcategory_id' IS NOT NULL THEN
    SELECT c.parent_id, c.id INTO resolved_category_id, resolved_subcategory_id
    FROM public.categories c
    WHERE c.id = (p_product ->> 'subcategory_id')::UUID AND c.is_active = TRUE;
    IF NOT FOUND OR resolved_category_id IS NULL THEN
      RAISE EXCEPTION 'Invalid subcategory';
    END IF;
  END IF;
  IF p_product ->> 'category_id' IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = (p_product ->> 'category_id')::UUID AND c.is_active = TRUE AND c.parent_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Invalid category';
    END IF;
    IF resolved_subcategory_id IS NOT NULL AND resolved_category_id <> (p_product ->> 'category_id')::UUID THEN
      RAISE EXCEPTION 'Category and subcategory do not match';
    END IF;
    IF resolved_subcategory_id IS NULL THEN
      resolved_category_id := (p_product ->> 'category_id')::UUID;
    END IF;
  END IF;

  UPDATE public.products SET
    name = trim(p_product ->> 'name'),
    description = NULLIF(p_product ->> 'description', ''),
    price = (p_product ->> 'price')::NUMERIC,
    category = NULL,
    image_url = NULLIF(p_product ->> 'image_url', ''),
    category_id = resolved_category_id,
    subcategory_id = resolved_subcategory_id,
    subcategory = NULLIF(p_product ->> 'subcategory', ''),
    is_active = CASE WHEN (p_product ->> 'is_active') IS NULL THEN TRUE ELSE (p_product ->> 'is_active')::BOOLEAN END,
    slug = NULLIF(p_product ->> 'slug', ''),
    seo_title = NULLIF(p_product ->> 'seo_title', ''),
    seo_description = NULLIF(p_product ->> 'seo_description', ''),
    sale_price = CASE WHEN (p_product ->> 'sale_price') IS NULL THEN NULL ELSE (p_product ->> 'sale_price')::NUMERIC END,
    sale_starts_at = CASE WHEN (p_product ->> 'sale_starts_at') IS NULL THEN NULL ELSE (p_product ->> 'sale_starts_at')::TIMESTAMPTZ END,
    sale_ends_at = CASE WHEN (p_product ->> 'sale_ends_at') IS NULL THEN NULL ELSE (p_product ->> 'sale_ends_at')::TIMESTAMPTZ END,
    images = CASE WHEN jsonb_typeof(p_product -> 'images') = 'array' THEN p_product -> 'images' ELSE '[]'::jsonb END,
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING * INTO product_row;

  -- Variant reconciliation: p_variants is the FULL desired set.
  IF p_variants IS NULL OR jsonb_typeof(p_variants) <> 'array' OR jsonb_array_length(p_variants) = 0 THEN
    -- Entering product-level mode: consolidate existing variant stock into the
    -- product-level row, then drop the variant rows (cascades their inventory).
    SELECT COALESCE(SUM(q.quantity), 0)::INT INTO old_product_stock
    FROM public.product_inventory q
    WHERE q.product_id = p_product_id AND q.variant_id IS NOT NULL;

    DELETE FROM public.product_inventory WHERE product_id = p_product_id AND variant_id IS NOT NULL;
    DELETE FROM public.product_variants WHERE product_id = p_product_id;

    IF EXISTS (
      SELECT 1 FROM public.product_inventory q
      WHERE q.product_id = p_product_id AND q.variant_id IS NULL
    ) THEN
      UPDATE public.product_inventory
      SET quantity = quantity + old_product_stock, last_updated = NOW()
      WHERE product_id = p_product_id AND variant_id IS NULL;
    ELSE
      INSERT INTO public.product_inventory (product_id, quantity) VALUES (p_product_id, old_product_stock);
    END IF;
  ELSE
    -- Leaving product-level mode: refuse if base stock remains unassigned.
    SELECT quantity INTO old_product_stock
    FROM public.product_inventory
    WHERE product_id = p_product_id AND variant_id IS NULL
    FOR UPDATE;
    IF FOUND AND old_product_stock > 0 THEN
      RAISE EXCEPTION 'Transfer the base stock to a variant before adding variants';
    END IF;
    DELETE FROM public.product_inventory WHERE product_id = p_product_id AND variant_id IS NULL;

    FOR variant IN SELECT value FROM jsonb_array_elements(p_variants) LOOP
      IF NULLIF(variant.value ->> 'name', '') IS NULL THEN
        RAISE EXCEPTION 'Invalid variant name';
      END IF;
      existing_id := NULLIF(variant.value ->> 'id', '')::UUID;
      IF existing_id IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.product_variants v
          WHERE v.id = existing_id AND v.product_id = p_product_id
        ) THEN
          RAISE EXCEPTION 'Invalid variant reference';
        END IF;
        keep_ids := keep_ids || existing_id;
        variant_price := CASE
          WHEN variant.value ->> 'price' IS NULL OR (variant.value ->> 'price') = '' THEN NULL
          ELSE (variant.value ->> 'price')::NUMERIC
        END;
        IF variant_price IS NOT NULL AND (variant_price < 0) THEN
          RAISE EXCEPTION 'Invalid variant price';
        END IF;
        UPDATE public.product_variants
        SET name = trim(variant.value ->> 'name'),
            price = variant_price,
            is_active = COALESCE((variant.value ->> 'is_active')::BOOLEAN, TRUE),
            updated_at = NOW()
        WHERE id = existing_id;
      ELSE
        variant_price := CASE
          WHEN variant.value ->> 'price' IS NULL OR (variant.value ->> 'price') = '' THEN NULL
          ELSE (variant.value ->> 'price')::NUMERIC
        END;
        INSERT INTO public.product_variants (product_id, name, price, is_active)
        VALUES (p_product_id, trim(variant.value ->> 'name'), variant_price, COALESCE((variant.value ->> 'is_active')::BOOLEAN, TRUE))
        RETURNING id INTO new_variant_id;
        keep_ids := keep_ids || new_variant_id;
        INSERT INTO public.product_inventory (product_id, variant_id, quantity)
        VALUES (p_product_id, new_variant_id, 0);
      END IF;
    END LOOP;

    DELETE FROM public.product_variants v
    WHERE v.product_id = p_product_id AND NOT (v.id = ANY(keep_ids));
  END IF;

  RETURN product_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_product(
  p_creator_id UUID,
  p_product_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._catalog_admin_check(p_creator_id);

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  DELETE FROM public.products WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_inventory(
  p_creator_id UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_quantity_change INT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_quantity INT;
BEGIN
  PERFORM public._catalog_admin_check(p_creator_id);

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF NULLIF(p_reason, '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;

  IF p_variant_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.product_variants v WHERE v.product_id = p_product_id) THEN
      RAISE EXCEPTION 'This product uses variants — adjust a specific variant instead';
    END IF;
    SELECT quantity INTO current_quantity
    FROM public.product_inventory
    WHERE product_id = p_product_id AND variant_id IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.product_inventory (product_id, variant_id, quantity)
      VALUES (p_product_id, NULL, 0)
      RETURNING quantity INTO current_quantity;
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.product_variants v WHERE v.id = p_variant_id AND v.product_id = p_product_id) THEN
      RAISE EXCEPTION 'Invalid variant';
    END IF;
    SELECT quantity INTO current_quantity
    FROM public.product_inventory
    WHERE product_id = p_product_id AND variant_id = p_variant_id
    FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.product_inventory (product_id, variant_id, quantity)
      VALUES (p_product_id, p_variant_id, 0)
      RETURNING quantity INTO current_quantity;
    END IF;
  END IF;

  IF current_quantity IS NULL THEN current_quantity := 0; END IF;
  IF current_quantity + p_quantity_change < 0 THEN
    RAISE EXCEPTION 'Insufficient existing stock';
  END IF;

  IF p_variant_id IS NULL THEN
    UPDATE public.product_inventory
    SET quantity = quantity + p_quantity_change, last_updated = NOW()
    WHERE product_id = p_product_id AND variant_id IS NULL;
  ELSE
    UPDATE public.product_inventory
    SET quantity = quantity + p_quantity_change, last_updated = NOW()
    WHERE product_id = p_product_id AND variant_id = p_variant_id;
  END IF;

  INSERT INTO public.inventory_logs (product_id, variant_id, quantity_change, reason, order_id, created_by)
  VALUES (p_product_id, p_variant_id, p_quantity_change, trim(p_reason), NULL, p_creator_id);

  RETURN jsonb_build_object('quantity', current_quantity + p_quantity_change);
END;
$$;

REVOKE ALL ON FUNCTION public._catalog_admin_check(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_product(UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_product(UUID, UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_product(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_adjust_inventory(UUID, UUID, UUID, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_order_status(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_payment(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._catalog_admin_check(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_product(UUID, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_product(UUID, UUID, JSONB, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory(UUID, UUID, UUID, INT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- products: public read; admins write (incl. permanent delete, spec 6.4)
DROP POLICY IF EXISTS "Admins insert products" ON public.products;
DROP POLICY IF EXISTS "Admins update products" ON public.products;
DROP POLICY IF EXISTS "Admins delete products" ON public.products;
CREATE POLICY "Admins insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update products" ON public.products
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete products" ON public.products
  FOR DELETE USING (public.is_admin());

-- product_inventory: public read; admins write
DROP POLICY IF EXISTS "Admins insert inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "Admins delete inventory" ON public.product_inventory;
CREATE POLICY "Admins insert inventory" ON public.product_inventory
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete inventory" ON public.product_inventory
  FOR DELETE USING (public.is_admin());

-- inventory_logs: admins view (system and RPC writes via service_role)
DROP POLICY IF EXISTS "Admins insert inventory logs" ON public.inventory_logs;

-- categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins manage variants" ON public.product_variants;
CREATE POLICY "Anyone can view active variants" ON public.product_variants
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Admins manage variants" ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant ON public.inventory_logs(variant_id);

-- ---------------------------------------------------------------------------
-- Public product-images storage bucket (admin-managed image gallery)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Admins delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images');