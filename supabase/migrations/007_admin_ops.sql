-- =============================================================================
-- 007_admin_ops.sql
--
-- T008 — Admin Operations Dashboard (Dashboard overview + Customer directory).
--
-- Adds the read-only aggregation RPCs that power the admin dashboard (§17.1)
-- and the customer directory (§21.2), both served over the service role via
-- admin API routes:
--   * admin_dashboard_summary(p_admin_id) — one row of operational metrics:
--     total orders, per-status counts, delivered sales total, low/out of stock
--     inventory items, pending bulk requests, pending product requests, and
--     last-24h activity (orders, reviews, confirmed payments, cancellations)
--     used to drive the dashboard notifications panel (§20.1).
--   * admin_customer_directory(p_admin_id, p_search, p_limit) — orders grouped
--     by customer_phone (the stable key for guest checkout): latest known
--     name/email/address, order count, money spent (excluding cancelled
--     orders), and first/last order date. Search matches phone (numerics are
--     normalized to the stored +92 form), name, or email.
--
-- Both RPCs are SQL-level read-only and verify the caller is an active admin
-- (defense in depth on top of requireAdmin in the API route). They follow the
-- migration 003-006 privilege model: SECURITY DEFINER, service_role only.
-- Safe to run after migrations 001 -> 002 -> 003 -> 004 -> 005 -> 006.
-- Idempotent. The verify suite (supabase/tests/verify_phase1.sql) is updated
-- in lockstep.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Index: pending-request lookups on order_requests (printing / bulk / custom)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_order_requests_status_created;
CREATE INDEX idx_order_requests_status_created
  ON public.order_requests(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- admin_dashboard_summary: one aggregated row of operational metrics.
-- Low stock = quantity between 1 and 5 (5 is the known restock threshold);
-- out of stock = quantity 0, consistent with the inventory admin page.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_dashboard_summary(p_admin_id UUID)
RETURNS TABLE (
  total_orders            BIGINT,
  status_orders           JSONB,
  total_sales             NUMERIC,
  low_stock_items         BIGINT,
  out_of_stock_items      BIGINT,
  pending_bulk_requests   BIGINT,
  pending_product_requests BIGINT,
  new_orders_24h          BIGINT,
  new_reviews_24h         BIGINT,
  new_payments_24h        BIGINT,
  new_cancellations_24h   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_id AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT COALESCE(jsonb_object_agg(status, c), '{}'::jsonb)
  INTO status_orders
  FROM (
    SELECT o.status AS status, count(*) AS c
    FROM public.orders o
    GROUP BY o.status
  ) s;

  SELECT count(*) INTO total_orders FROM public.orders;
  SELECT COALESCE(sum(total_amount), 0) INTO total_sales
  FROM public.orders WHERE status = 'delivered';
  SELECT count(*) INTO low_stock_items
  FROM public.product_inventory WHERE quantity BETWEEN 1 AND 5;
  SELECT count(*) INTO out_of_stock_items
  FROM public.product_inventory WHERE quantity = 0;
  SELECT count(*) INTO pending_bulk_requests
  FROM public.order_requests WHERE type = 'bulk' AND status = 'pending';
  SELECT count(*) INTO pending_product_requests
  FROM public.product_requests WHERE status = 'pending';
  SELECT count(*) INTO new_orders_24h
  FROM public.orders WHERE created_at >= NOW() - INTERVAL '24 hours';
  SELECT count(*) INTO new_reviews_24h
  FROM public.reviews WHERE created_at >= NOW() - INTERVAL '24 hours';
  SELECT count(*) INTO new_payments_24h
  FROM public.payments WHERE status = 'paid' AND updated_at >= NOW() - INTERVAL '24 hours';
  SELECT count(*) INTO new_cancellations_24h
  FROM public.orders WHERE status = 'cancelled' AND updated_at >= NOW() - INTERVAL '24 hours';

  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- admin_customer_directory: orders grouped by the stable WhatsApp number.
-- Latest order supplies the current name/email/address; total_spent excludes
-- cancelled orders (cancelled money never entered the business).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_customer_directory(
  p_admin_id UUID,
  p_search TEXT,
  p_limit INTEGER
)
RETURNS TABLE (
  phone           TEXT,
  customer_name   TEXT,
  customer_email  TEXT,
  customer_address TEXT,
  total_orders    BIGINT,
  total_spent     NUMERIC,
  first_order_at  TIMESTAMPTZ,
  last_order_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  needle     TEXT;
  limit_use  INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_id AND role IN ('admin_staff', 'super_admin', 'owner') AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  limit_use := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));

  needle := trim(COALESCE(p_search, ''));
  -- WhatsApp-style partial numbers stored as +92...: fold a search like 0300 ...
  -- or +923001... into the stored 923001... form.
  IF needle ~ '^\+?[0-9]+$' THEN
    needle := regexp_replace(needle, '[^0-9]', '', 'g');
    IF needle LIKE '0%' THEN
      needle := '92' || substring(needle FROM 2);
    ELSIF NOT needle LIKE '92%' THEN
      needle := '92' || needle;
    END IF;
  END IF;
  -- Escape ILIKE wildcards so user input matches literally.
  needle := replace(needle, '\', '\\');
  needle := replace(needle, '%', '\%');
  needle := replace(needle, '_', '\_');

  RETURN QUERY
  SELECT
    o.customer_phone,
    (array_agg(o.customer_name ORDER BY o.created_at DESC))[1] AS customer_name,
    (array_agg(o.customer_email ORDER BY o.created_at DESC))[1] AS customer_email,
    (array_agg(o.customer_address ORDER BY o.created_at DESC))[1] AS customer_address,
    count(*) AS total_orders,
    COALESCE(sum(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
    min(o.created_at) AS first_order_at,
    max(o.created_at) AS last_order_at
  FROM public.orders o
  WHERE needle = ''
     OR o.customer_phone    ILIKE '%' || needle || '%'
     OR o.customer_name     ILIKE '%' || needle || '%'
     OR o.customer_email    ILIKE '%' || needle || '%'
  GROUP BY o.customer_phone
  ORDER BY last_order_at DESC NULLS LAST
  LIMIT limit_use;
END;
$$;

-- ---------------------------------------------------------------------------
-- Privilege model: read-only admin RPCs are service_role only.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_dashboard_summary(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_dashboard_summary(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.admin_dashboard_summary(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_summary(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.admin_customer_directory(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_customer_directory(UUID, TEXT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.admin_customer_directory(UUID, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_customer_directory(UUID, TEXT, INTEGER) TO service_role;