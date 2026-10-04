-- =============================================================================
-- 005_delivery_zones.sql
--
-- T005 — Delivery Zones & Shop Pickup.
--
-- Adds the Phase 1 delivery configuration:
--   * delivery_zones table (name, fixed fee, availability, display order)
--     with RLS: anyone can read active zones, admins manage all
--   * orders.delivery_zone_id (FK -> delivery_zones, ON DELETE SET NULL)
--   * create_order_with_payment now (14th arg p_delivery_zone_id):
--       - courier: a zone is required and must be active; the delivery fee is
--         DERIVED from the zone (never from the client)
--       - self (shop pickup): no zone allowed, fee is PKR 0
--       - total_amount is validated as items total + zone fee
--       - orders.delivery_fee and delivery_zone_id are stored; the payment
--         amount is the full payable (items + fee)
--
-- Safe to run after migrations 001 -> 002 -> 003 -> 004. Idempotent.
-- The verify suite (supabase/tests/verify_phase1.sql) is updated in lockstep
-- to the 14-argument signature.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Delivery zones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  fee           NUMERIC(10, 2) NOT NULL CHECK (fee >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_zones
  DROP CONSTRAINT IF EXISTS delivery_zones_name_key,
  ADD CONSTRAINT delivery_zones_name_key UNIQUE (name);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Admins manage delivery zones" ON public.delivery_zones;
CREATE POLICY "Anyone can view active delivery zones" ON public.delivery_zones
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Admins manage delivery zones" ON public.delivery_zones
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Orders reference the zone they were placed against.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_orders_delivery_zone;
CREATE INDEX idx_orders_delivery_zone ON public.orders(delivery_zone_id);

-- ---------------------------------------------------------------------------
-- Order creation with a delivery zone (fee derived from the active zone).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
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
  p_payment_evidence TEXT DEFAULT NULL,
  p_delivery_zone_id UUID DEFAULT NULL
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
  delivery_fee NUMERIC := 0;
  resolved_zone_id UUID := NULL;
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

  -- Delivery zone enforcement (T005): fee is derived server-side from the zone.
  IF p_delivery_method = 'courier' THEN
    IF p_delivery_zone_id IS NULL THEN
      RAISE EXCEPTION 'Select a delivery zone';
    END IF;
    SELECT id, fee INTO resolved_zone_id, delivery_fee
    FROM public.delivery_zones
    WHERE id = p_delivery_zone_id AND is_active = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Delivery zone is not available';
    END IF;
  ELSIF p_delivery_zone_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pickup orders do not use a delivery zone';
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

  IF p_total_amount IS NULL OR round(calculated_total + delivery_fee, 2) <> round(p_total_amount, 2) THEN
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
    delivery_fee,
    delivery_zone_id,
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
    round(calculated_total + delivery_fee, 2),
    round(delivery_fee, 2),
    resolved_zone_id,
    initial_status,
    p_payment_method,
    'pending',
    p_delivery_method
  )
  RETURNING * INTO created_order;

  INSERT INTO public.payments (order_id, amount, method, status, transaction_id, payment_evidence_url)
  VALUES (created_order.id, round(calculated_total + delivery_fee, 2), p_payment_method, 'pending', NULLIF(trim(p_transaction_id), ''), NULLIF(trim(p_payment_evidence), ''));

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

REVOKE ALL ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;