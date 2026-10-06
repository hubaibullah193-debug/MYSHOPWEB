-- =============================================================================
-- 006_product_requests_and_reviews.sql
--
-- T007 — Customer Features & Communication.
--
-- Adds the Phase 1 customer-facing features:
--   * product_requests table (spec §14): customers ask for unavailable
--     products (name, WhatsApp, product name, quantity, optional message)
--     with a Pending -> Contacted -> Completed/Cancelled workflow. All access
--     goes through server API routes with the service role, so RLS is enabled
--     as a default-deny fence and no anon/authenticated policies are created.
--   * reviews.order_id (verifiable purchase link) + one review per
--     (order, product) — enforced by submit_review and a partial unique index.
--   * submit_review(p_order_id, p_product_id, p_phone, p_rating, p_review)
--     — completes only for a DELIVERED order whose stored WhatsApp number
--     matches the caller and that actually contains the product; the name is
--     taken from the order (never from the client); reviews appear immediately
--     through the existing public_reviews view (spec §15.2).
--   * remove_review(p_review_id, p_admin_id) — the ONLY supported admin write
--     on a review: flips is_removed to TRUE and logs it. Content is never
--     editable (spec §15.2), enforced at the data layer.
--   * admin_update_product_request(p_request_id, p_admin_id, p_status, notes)
--     — admin follows up and advances the request workflow (spec §14.2) with
--     activity logging.
--
-- All enforcement RPCs are SECURITY DEFINER and granted to service_role only
-- (anon/authenticated/PUBLIC revoked), matching migrations 003-005.
-- Safe to run after migrations 001 -> 002 -> 003 -> 004 -> 005. Idempotent.
-- The verify suite (supabase/tests/verify_phase1.sql) is updated in lockstep.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Product requests (spec §14)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  whatsapp      TEXT NOT NULL CHECK (whatsapp ~ '^(?:\+92|0|92)3[0-9]{8,9}$'),
  product_name  TEXT NOT NULL CHECK (char_length(product_name) BETWEEN 1 AND 200),
  quantity      INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  message       TEXT CHECK (message IS NULL OR char_length(message) BETWEEN 1 AND 1000),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- No policies: customers submit through the server API route (service role),
-- admins moderate through the admin API routes (service role). RLS stays on as
-- a default-deny fence so anon/authenticated can never read or mutate requests.

DROP INDEX IF EXISTS idx_product_requests_status_created;
CREATE INDEX idx_product_requests_status_created
  ON public.product_requests(status, created_at DESC);

DROP TRIGGER IF EXISTS product_requests_set_updated_at ON public.product_requests;
CREATE TRIGGER product_requests_set_updated_at
  BEFORE UPDATE ON public.product_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reviews: link submissions to the verified order (spec §15)
-- ---------------------------------------------------------------------------
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- One review per (order, product) pair; order-scoped rows only. A deleted order
-- leaves an unlinked review behind, so the index is partial.
DROP INDEX IF EXISTS idx_reviews_order_product;
CREATE UNIQUE INDEX idx_reviews_order_product
  ON public.reviews(order_id, product_id)
  WHERE order_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- submit_review: only real, delivered, purchase-verified customers can review.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_review(
  p_order_id UUID,
  p_product_id UUID,
  p_phone TEXT,
  p_rating INT,
  p_review TEXT
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_order  public.orders;
  item            JSONB;
  order_has_item  BOOLEAN := FALSE;
  created_review  public.reviews;
  phone_input     TEXT;
  normalized_phone TEXT;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;

  IF p_review IS NULL OR char_length(trim(p_review)) < 1 OR char_length(trim(p_review)) > 2000 THEN
    RAISE EXCEPTION 'Invalid review text';
  END IF;

  phone_input := trim(p_phone);
  IF phone_input NOT ~ '^(?:\+92|0|92)3[0-9]{8,9}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp number';
  END IF;
  IF phone_input LIKE '+%' THEN
    normalized_phone := substring(phone_input FROM 2);
  ELSIF phone_input LIKE '0%' THEN
    normalized_phone := '92' || substring(phone_input FROM 2);
  ELSE
    normalized_phone := phone_input;
  END IF;

  SELECT * INTO customer_order
  FROM public.orders
  WHERE id = p_order_id AND customer_phone = normalized_phone;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF customer_order.status <> 'delivered' THEN
    RAISE EXCEPTION 'Reviews can only be submitted for delivered orders';
  END IF;

  IF jsonb_typeof(customer_order.items) <> 'array' THEN
    RAISE EXCEPTION 'Product not found in this order';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(customer_order.items) LOOP
    IF jsonb_typeof(item) = 'object'
       AND (item ->> 'product_id') ~ '^[0-9a-fA-F-]{36}$'
       AND (item ->> 'product_id')::UUID = p_product_id THEN
      order_has_item := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF NOT order_has_item THEN
    RAISE EXCEPTION 'Product not found in this order';
  END IF;

  INSERT INTO public.reviews (
    product_id,
    user_id,
    order_id,
    customer_name,
    rating,
    review
  ) VALUES (
    p_product_id,
    NULL,
    p_order_id,
    COALESCE(NULLIF(trim(customer_order.customer_name), ''), 'Customer'),
    p_rating,
    trim(p_review)
  )
  RETURNING * INTO created_review;

  RETURN created_review;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already reviewed this product for this order';
END;
$$;

-- ---------------------------------------------------------------------------
-- remove_review: admin removal only, never edits customer content.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_review(
  p_review_id UUID,
  p_admin_id UUID
)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_review public.reviews;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_id AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.reviews
  SET is_removed = TRUE,
      updated_at = NOW()
  WHERE id = p_review_id
  RETURNING * INTO updated_review;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found';
  END IF;

  INSERT INTO public.activity_logs (
    admin_id, action, entity_type, entity_id, changes
  ) VALUES (
    p_admin_id,
    'review_removed',
    'review',
    p_review_id,
    jsonb_build_object('product_id', updated_review.product_id, 'rating', updated_review.rating)
  );

  RETURN updated_review;
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_update_product_request: workflow follow-up (spec §14.2).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_product_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.product_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_request  public.product_requests;
  previous_status  TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_id AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_status NOT IN ('pending', 'contacted', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid product request status';
  END IF;

  SELECT * INTO current_request
  FROM public.product_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product request not found';
  END IF;

  previous_status := current_request.status;

  UPDATE public.product_requests
  SET status = p_status,
      admin_notes = CASE
        WHEN trim(COALESCE(p_notes, '')) = '' THEN admin_notes
        ELSE trim(p_notes)
      END,
      updated_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO current_request;

  INSERT INTO public.activity_logs (
    admin_id, action, entity_type, entity_id, changes
  ) VALUES (
    p_admin_id,
    'product_request_status_updated',
    'product_request',
    p_request_id,
    jsonb_build_object('from', previous_status, 'to', p_status)
  );

  RETURN current_request;
END;
$$;

-- ---------------------------------------------------------------------------
-- Privilege model: enforcement RPCs are service_role only.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.submit_review(UUID, UUID, TEXT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_review(UUID, UUID, TEXT, INT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.submit_review(UUID, UUID, TEXT, INT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(UUID, UUID, TEXT, INT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.remove_review(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_review(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.remove_review(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.remove_review(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.admin_update_product_request(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_product_request(UUID, UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_update_product_request(UUID, UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_product_request(UUID, UUID, TEXT, TEXT) TO service_role;