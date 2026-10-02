CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.orders
  ALTER COLUMN customer_id DROP NOT NULL,
  ALTER COLUMN customer_address DROP NOT NULL,
  ADD COLUMN customer_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN admin_notes TEXT,
  ADD COLUMN delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN inventory_deducted_at TIMESTAMPTZ;

UPDATE public.orders
SET customer_phone = CASE
  WHEN customer_phone ~ '^0[0-9]{10}$' THEN '92' || substring(customer_phone from 2)
  WHEN customer_phone ~ '^\+92[0-9]{10}$' THEN substring(customer_phone from 2)
  WHEN customer_phone ~ '^92[0-9]{10}$' THEN customer_phone
  ELSE regexp_replace(customer_phone, '[^0-9]', '', 'g')
END
WHERE customer_phone ~ '^[+0-9 ]+$';

ALTER TABLE public.payments
  ADD COLUMN refund_reference TEXT,
  ADD COLUMN failure_reason TEXT,
  ADD COLUMN payment_evidence_url TEXT;

UPDATE public.orders
SET status = 'received'
WHERE status = 'confirmed';

UPDATE public.orders
SET status = 'out_for_delivery'
WHERE status = 'shipped';

UPDATE public.orders
SET payment_status = 'paid'
WHERE payment_status = 'confirmed';

UPDATE public.payments
SET status = 'paid'
WHERE status = 'confirmed';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_payment', 'received', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE public.users
  ADD COLUMN admin_notes TEXT,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.inventory_logs
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.activity_logs
  ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE public.inventory_logs
  DROP CONSTRAINT IF EXISTS inventory_logs_product_id_fkey,
  ADD CONSTRAINT inventory_logs_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_admin_id_fkey,
  ADD CONSTRAINT activity_logs_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_customer_id_fkey,
  ADD CONSTRAINT orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.order_idempotency_keys (
  key TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.order_idempotency_keys
  ADD COLUMN IF NOT EXISTS request_hash TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT NOT NULL CHECK (char_length(review) BETWEEN 1 AND 2000),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_removed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews
  DROP COLUMN IF EXISTS customer_email;

REVOKE SELECT ON public.reviews FROM anon, authenticated;

CREATE OR REPLACE VIEW public.public_reviews AS
SELECT id, product_id, customer_name, rating, review, is_featured, created_at
FROM public.reviews
WHERE NOT is_removed;

REVOKE ALL ON public.public_reviews FROM public;
GRANT SELECT ON public.public_reviews TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.business_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL CHECK (char_length(note) BETWEEN 1 AND 2000),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE public.order_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin_staff', 'super_admin', 'owner')
        AND is_active = TRUE
    ),
    FALSE
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'owner')
        AND is_active = TRUE
    ),
    FALSE
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Customers see only their own profile" ON public.users;
DROP POLICY IF EXISTS "Admin staff see all customers" ON public.users;
DROP POLICY IF EXISTS "Only owner/super_admin modify roles" ON public.users;
DROP POLICY IF EXISTS "Customers create profiles" ON public.users;
CREATE POLICY "Users see own profile or admin data" ON public.users
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Customers create own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'customer');
CREATE POLICY "Super admins update user roles" ON public.users
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin() OR public.current_user_role() = 'owner');

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Only admin staff modify products" ON public.products;
DROP POLICY IF EXISTS "Only admin staff modify products (update)" ON public.products;
DROP POLICY IF EXISTS "Only admin staff delete products" ON public.products;
DROP POLICY IF EXISTS "Admins create products" ON public.products;
DROP POLICY IF EXISTS "Admins update products" ON public.products;
DROP POLICY IF EXISTS "Admins delete products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Anyone can view inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "Only admin staff modify inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "Admins create inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "Admins update inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "Admins delete inventory" ON public.product_inventory;
CREATE POLICY "Anyone can view inventory" ON public.product_inventory
  FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admin staff view inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "System insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins view inventory logs" ON public.inventory_logs
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Customers see their own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers create orders" ON public.orders;
DROP POLICY IF EXISTS "Admin staff update orders" ON public.orders;
DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Customers see own orders or admins see all" ON public.orders
  FOR SELECT
  USING (auth.uid() = customer_id OR public.is_admin());

DROP POLICY IF EXISTS "Customers see own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin staff manage payments" ON public.payments;
DROP POLICY IF EXISTS "Admin staff update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins create payments" ON public.payments;
DROP POLICY IF EXISTS "Admins update payments" ON public.payments;
CREATE POLICY "Customers see own payments or admins see all" ON public.payments
  FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers see own requests" ON public.order_requests;
DROP POLICY IF EXISTS "Customers create requests" ON public.order_requests;
DROP POLICY IF EXISTS "Admin staff update requests" ON public.order_requests;
CREATE POLICY "Customers see own requests or admins see all" ON public.order_requests
  FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "Customers create own requests" ON public.order_requests
  FOR INSERT
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));
CREATE POLICY "Admins update requests" ON public.order_requests
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin staff view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System insert activity logs" ON public.activity_logs;
CREATE POLICY "Admins view activity logs" ON public.activity_logs
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Public reads active reviews" ON public.reviews
  FOR SELECT
  USING (NOT is_removed OR public.is_admin());
CREATE POLICY "Customers create own reviews" ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update reviews" ON public.reviews
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete reviews" ON public.reviews
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Admins view business settings" ON public.business_settings
  FOR SELECT
  USING (public.is_admin());
CREATE POLICY "Super admins update business settings" ON public.business_settings
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Admins view customer notes" ON public.customer_notes
  FOR SELECT
  USING (public.is_admin());
CREATE POLICY "Admins create customer notes" ON public.customer_notes
  FOR INSERT
  WITH CHECK (public.is_admin() AND created_by = auth.uid());
CREATE POLICY "Admins update customer notes" ON public.customer_notes
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Admins view sessions" ON public.admin_sessions
  FOR SELECT
  USING (public.is_admin());

DROP FUNCTION IF EXISTS public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT);
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

    SELECT price INTO product_price
    FROM public.products
    WHERE id = local_product_id;

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
  current_quantity INT;
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

        SELECT quantity INTO current_quantity
        FROM public.product_inventory
        WHERE product_id = local_product_id
        FOR UPDATE;

        IF NOT FOUND OR current_quantity < requested_quantity THEN
          RAISE EXCEPTION 'Insufficient inventory for product %', local_product_id;
        END IF;

        UPDATE public.product_inventory
        SET quantity = quantity - requested_quantity, last_updated = NOW()
        WHERE product_id = local_product_id;

        INSERT INTO public.inventory_logs (
          product_id, quantity_change, reason, order_id, created_by
        ) VALUES (
          local_product_id, -requested_quantity, 'order_processing', p_order_id, p_admin_id
        );
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

CREATE OR REPLACE FUNCTION public.verify_payment(
  p_payment_id UUID,
  p_admin_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_payment public.payments;
  current_order public.orders;
  next_status TEXT;
  normalized_reference TEXT := NULLIF(trim(p_transaction_id), '');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_id AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_action NOT IN ('confirm', 'fail', 'refund') THEN
    RAISE EXCEPTION 'Invalid payment action';
  END IF;

  SELECT * INTO current_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  SELECT * INTO current_order FROM public.orders WHERE id = current_payment.order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF current_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot have payment changes';
  END IF;

  IF p_action = 'confirm' THEN
    IF current_payment.status NOT IN ('pending', 'failed') THEN
      RAISE EXCEPTION 'Payment cannot be confirmed from its current status';
    END IF;
    IF current_payment.method <> 'cod' AND current_order.status <> 'pending_payment' THEN
      RAISE EXCEPTION 'Online payment must be verified before the order is received';
    END IF;
    IF current_payment.method <> 'cod' AND normalized_reference IS NULL AND current_payment.transaction_id IS NULL THEN
      RAISE EXCEPTION 'Payment transaction reference is required';
    END IF;
    next_status := 'paid';
  ELSIF p_action = 'fail' THEN
    IF current_payment.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending payments can be failed';
    END IF;
    IF NULLIF(trim(p_notes), '') IS NULL THEN
      RAISE EXCEPTION 'A failure reason is required';
    END IF;
    next_status := 'failed';
  ELSE
    IF current_payment.status <> 'paid' THEN
      RAISE EXCEPTION 'Only paid payments can be refunded';
    END IF;
    IF normalized_reference IS NULL THEN
      RAISE EXCEPTION 'A refund reference is required';
    END IF;
    next_status := 'refunded';
  END IF;

  UPDATE public.payments
  SET status = next_status,
      transaction_id = CASE
        WHEN p_action = 'confirm' THEN COALESCE(normalized_reference, transaction_id)
        ELSE transaction_id
      END,
      verified_by_admin_id = p_admin_id,
      verified_at = NOW(),
      admin_notes = NULLIF(trim(p_notes), ''),
      failure_reason = CASE WHEN p_action = 'fail' THEN NULLIF(trim(p_notes), '') ELSE failure_reason END,
      refund_reference = CASE WHEN p_action = 'refund' THEN normalized_reference ELSE refund_reference END,
      updated_at = NOW()
  WHERE id = p_payment_id
  RETURNING * INTO current_payment;

  UPDATE public.orders
  SET payment_status = next_status,
      status = CASE
        WHEN p_action = 'confirm' AND status = 'pending_payment' THEN 'received'
        ELSE status
      END,
      updated_at = NOW()
  WHERE id = current_order.id;

  INSERT INTO public.activity_logs (
    admin_id, action, entity_type, entity_id, changes
  ) VALUES (
    p_admin_id,
    'payment_' || p_action,
    'payment',
    p_payment_id,
    jsonb_build_object('status', next_status)
  );

  RETURN current_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_order_delivery(
  p_order_id UUID,
  p_admin_id UUID,
  p_delivery_method TEXT,
  p_delivery_date DATE,
  p_delivery_time_slot TEXT,
  p_assigned_to UUID DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_order public.orders;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_id AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_delivery_method NOT IN ('self', 'courier') OR p_delivery_date IS NULL OR char_length(trim(p_delivery_time_slot)) < 1 THEN
    RAISE EXCEPTION 'Invalid delivery assignment';
  END IF;

  UPDATE public.orders
  SET delivery_method = p_delivery_method,
      delivery_date = p_delivery_date,
      delivery_time_slot = trim(p_delivery_time_slot),
      assigned_to = p_assigned_to,
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO updated_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  INSERT INTO public.activity_logs (
    admin_id, action, entity_type, entity_id, changes
  ) VALUES (
    p_admin_id,
    'delivery_assigned',
    'order',
    p_order_id,
    jsonb_build_object('method', p_delivery_method, 'date', p_delivery_date, 'time_slot', p_delivery_time_slot)
  );

  RETURN updated_order;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_inventory(UUID, INT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_inventory(UUID, INT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.deduct_inventory(UUID, INT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_inventory(UUID, INT, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_payment(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.transition_order_status(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_order_status(UUID, TEXT, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.transition_order_status(UUID, TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_status(UUID, TEXT, UUID, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.verify_payment(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_payment(UUID, UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.verify_payment(UUID, UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.assign_order_delivery(UUID, UUID, TEXT, DATE, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_order_delivery(UUID, UUID, TEXT, DATE, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.assign_order_delivery(UUID, UUID, TEXT, DATE, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_delivery(UUID, UUID, TEXT, DATE, TEXT, UUID) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id
  ON public.payments(transaction_id)
  WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON public.reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON public.customer_notes(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON public.admin_sessions(admin_id, started_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-evidence', 'payment-evidence', false)
ON CONFLICT (id) DO NOTHING;