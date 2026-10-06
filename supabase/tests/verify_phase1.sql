-- =============================================================================
-- verify_phase1.sql
--
-- Phase 1 database-foundation verification for Hubaib One Stop Shop.
--
-- Verifies, against a real Supabase (PostgreSQL 14+) project, that migrations
-- 001 -> 002 -> 003 -> 004 produced the expected production foundation:
--   * tables, columns, check constraints, RLS policies
--   * enforcement RPCs (create_order_with_payment, transition_order_status,
--     verify_payment, assign_order_delivery, deduct_inventory) with the correct
--     signature and privilege model (service_role only)
--   * role helper functions, audit triggers, indexes
--   * private `payment-evidence` storage bucket
--   * migration 004 catalogue: categories, product_variants, sale pricing
--     (current_price), admin product/inventory RPCs, product-images bucket
--
-- Safe to run repeatedly. Read-only (no data mutations); intended for the
-- Supabase test runner (files in supabase/tests/ are wrapped in a transaction)
-- and safe against a real project when run directly:
--
--   psql "$DATABASE_URL" -f supabase/tests/verify_phase1.sql
--
-- Every check that fails aborts with:  FAILED: <check label>
-- =============================================================================

DO $verify$
DECLARE
  f_create_order oid;
  f_transition    oid;
  f_verify        oid;
  f_assign        oid;
  f_deduct        oid;
  f_is_admin      oid;
  tbl             TEXT;
  status_ok       BOOLEAN;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Extensions
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'FAILED: extension uuid-ossp installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'FAILED: extension pgcrypto installed';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Core tables exist
  -- ---------------------------------------------------------------------------
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'products', 'product_inventory', 'inventory_logs', 'orders',
    'payments', 'order_requests', 'activity_logs', 'order_idempotency_keys',
    'reviews', 'business_settings', 'customer_notes', 'admin_sessions',
    'categories', 'product_variants'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      RAISE EXCEPTION 'FAILED: table public.% exists', tbl;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- RLS enabled on every security-sensitive table (no exceptions)
  -- ---------------------------------------------------------------------------
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'products', 'product_inventory', 'inventory_logs', 'orders',
    'payments', 'order_requests', 'activity_logs', 'order_idempotency_keys',
    'reviews', 'business_settings', 'customer_notes', 'admin_sessions',
    'categories', 'product_variants'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'FAILED: RLS enabled on public.%', tbl;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- Guest-checkout schema (migration 003)
  -- ---------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'FAILED: orders.customer_id is nullable (guest checkout)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    RAISE EXCEPTION 'FAILED: orders.customer_name column exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee'
  ) THEN
    RAISE EXCEPTION 'FAILED: orders.delivery_fee column exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'inventory_deducted_at'
  ) THEN
    RAISE EXCEPTION 'FAILED: orders.inventory_deducted_at column exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'admin_notes'
  ) THEN
    RAISE EXCEPTION 'FAILED: orders.admin_notes column exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_evidence_url'
  ) THEN
    RAISE EXCEPTION 'FAILED: payments.payment_evidence_url column exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'refund_reference'
  ) THEN
    RAISE EXCEPTION 'FAILED: payments.refund_reference column exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active'
  ) THEN
    RAISE EXCEPTION 'FAILED: users.is_active column exists';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Order lifecycle check constraints (migration 003 wording)
  -- ---------------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.orders'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%pending_payment%received%processing%ready%out_for_delivery%delivered%cancelled%'
  ) INTO status_ok;
  IF NOT status_ok THEN
    RAISE EXCEPTION 'FAILED: orders.status check constraint covers full lifecycle';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.orders'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%pending%paid%failed%refunded%'
  ) INTO status_ok;
  IF NOT status_ok THEN
    RAISE EXCEPTION 'FAILED: orders.payment_status check constraint (pending/paid/failed/refunded)';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.payments'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%pending%paid%failed%refunded%'
  ) INTO status_ok;
  IF NOT status_ok THEN
    RAISE EXCEPTION 'FAILED: payments.status check constraint (pending/paid/failed/refunded)';
  END IF;

  -- Orders are created only through the create_order_with_payment RPC:
  -- there must be NO direct INSERT policy on orders.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'FAILED: no direct INSERT policy on orders (RPC-enforced)';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Enforcement RPCs exist with the exact Phase 1 signatures
  -- ---------------------------------------------------------------------------
  SELECT p.oid INTO f_create_order
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'create_order_with_payment'
    AND pg_get_function_identity_arguments(p.oid) =
        'uuid, text, text, text, text, jsonb, numeric, text, text, text, text, text, text, uuid'
  LIMIT 1;
  IF f_create_order IS NULL THEN
    RAISE EXCEPTION 'FAILED: create_order_with_payment(14 args) exists';
  END IF;

  SELECT p.oid INTO f_transition
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'transition_order_status'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, text, uuid, text'
  LIMIT 1;
  IF f_transition IS NULL THEN
    RAISE EXCEPTION 'FAILED: transition_order_status(uuid, text, uuid, text) exists';
  END IF;

  SELECT p.oid INTO f_verify
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'verify_payment'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, text, text'
  LIMIT 1;
  IF f_verify IS NULL THEN
    RAISE EXCEPTION 'FAILED: verify_payment(uuid, uuid, text, text, text) exists';
  END IF;

  SELECT p.oid INTO f_assign
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'assign_order_delivery'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, date, text, uuid'
  LIMIT 1;
  IF f_assign IS NULL THEN
    RAISE EXCEPTION 'FAILED: assign_order_delivery exists';
  END IF;

  SELECT p.oid INTO f_deduct
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'deduct_inventory'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, integer, uuid'
  LIMIT 1;
  IF f_deduct IS NULL THEN
    RAISE EXCEPTION 'FAILED: deduct_inventory(uuid, integer, uuid) exists';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Privilege model: enforcement RPCs are service_role only
  -- (anon + authenticated must be revoked; PUBLIC must not retain EXECUTE)
  -- ---------------------------------------------------------------------------
  IF NOT has_function_privilege('service_role', f_create_order, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role can EXECUTE create_order_with_payment';
  END IF;
  IF has_function_privilege('anon', f_create_order, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon cannot EXECUTE create_order_with_payment';
  END IF;
  IF has_function_privilege('authenticated', f_create_order, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated cannot EXECUTE create_order_with_payment';
  END IF;

  IF NOT has_function_privilege('service_role', f_transition, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role can EXECUTE transition_order_status';
  END IF;
  IF has_function_privilege('anon', f_transition, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon cannot EXECUTE transition_order_status';
  END IF;
  IF has_function_privilege('authenticated', f_transition, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated cannot EXECUTE transition_order_status';
  END IF;

  IF NOT has_function_privilege('service_role', f_verify, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role can EXECUTE verify_payment';
  END IF;
  IF has_function_privilege('authenticated', f_verify, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated cannot EXECUTE verify_payment';
  END IF;

  IF NOT has_function_privilege('service_role', f_assign, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role can EXECUTE assign_order_delivery';
  END IF;
  IF has_function_privilege('authenticated', f_assign, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated cannot EXECUTE assign_order_delivery';
  END IF;

  IF NOT has_function_privilege('service_role', f_deduct, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role can EXECUTE deduct_inventory';
  END IF;
  IF has_function_privilege('authenticated', f_deduct, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated cannot EXECUTE deduct_inventory';
  END IF;

  -- RLS policy helper functions must remain callable by anon/authenticated.
  SELECT p.oid INTO f_is_admin
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'is_admin' AND p.pronargs = 0
  LIMIT 1;
  IF f_is_admin IS NULL THEN
    RAISE EXCEPTION 'FAILED: is_admin() exists';
  END IF;
  IF NOT has_function_privilege('anon', f_is_admin, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: anon can EXECUTE is_admin() (RLS dependency)';
  END IF;
  IF NOT has_function_privilege('authenticated', f_is_admin, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: authenticated can EXECUTE is_admin() (RLS dependency)';
  END IF;

  -- ---------------------------------------------------------------------------
  -- RLS policies present (access model)
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Users see own profile or admin data' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAILED: users self/admin SELECT policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
      AND policyname = 'Super admins update user roles' AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAILED: users super-admin UPDATE policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
      AND policyname = 'Customers see own orders or admins see all' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAILED: orders self/admin SELECT policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments'
      AND policyname = 'Customers see own payments or admins see all' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAILED: payments self/admin SELECT policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews'
      AND policyname = 'Public reads active reviews' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAILED: reviews public-read policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'business_settings'
      AND policyname = 'Super admins update business settings' AND cmd = 'ALL'
  ) THEN
    RAISE EXCEPTION 'FAILED: business_settings super-admin policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_sessions'
      AND policyname = 'Admins view sessions' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAILED: admin_sessions admin-view policy';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Audit triggers
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'FAILED: on_auth_user_created trigger on auth.users';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'reviews_set_updated_at' AND tgrelid = 'public.reviews'::regclass
  ) THEN
    RAISE EXCEPTION 'FAILED: reviews_set_updated_at trigger';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Indexes
  -- ---------------------------------------------------------------------------
  FOREACH tbl IN ARRAY ARRAY[
    'idx_orders_status', 'idx_orders_created_at', 'idx_orders_customer_phone',
    'idx_orders_payment_status', 'idx_payments_order_id', 'idx_payments_status',
    'idx_payments_transaction_id', 'idx_inventory_logs_product_id',
    'idx_activity_logs_created_at', 'idx_reviews_product_created',
    'idx_reviews_rating', 'idx_customer_notes_customer', 'idx_admin_sessions_admin'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = tbl
    ) THEN
      RAISE EXCEPTION 'FAILED: index % exists', tbl;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_payments_transaction_id'
      AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%transaction_id%'
      AND indexdef LIKE '%WHERE transaction_id IS NOT NULL%'
  ) THEN
    RAISE EXCEPTION 'FAILED: idx_payments_transaction_id is unique partial';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Storage: private payment-evidence bucket
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'payment-evidence' AND public = FALSE
  ) THEN
    RAISE EXCEPTION 'FAILED: private storage bucket payment-evidence exists';
  END IF;

  RAISE NOTICE 'verify_phase1.sql: all checks passed (incl. migration 004)';
END;
$verify$;

-- =============================================================================
-- Migration 004 catalogue checks: categories, variants, sale pricing, admin RPCs
-- =============================================================================
DO $verify$
DECLARE
  f_create    oid;
  f_update    oid;
  f_delete    oid;
  f_adjust    oid;
  f_price     oid;
  status_ok   BOOLEAN;
  col         TEXT;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Product catalogue columns (004)
  -- ---------------------------------------------------------------------------
  FOREACH col IN ARRAY ARRAY[
    'category_id', 'subcategory_id', 'subcategory', 'is_active', 'slug',
    'seo_title', 'seo_description', 'sale_price', 'sale_starts_at',
    'sale_ends_at', 'images'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = col
    ) THEN
      RAISE EXCEPTION 'FAILED: products.% column exists (migration 004)', col;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_inventory' AND column_name = 'variant_id'
  ) THEN
    RAISE EXCEPTION 'FAILED: product_inventory.variant_id column exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_logs' AND column_name = 'variant_id'
  ) THEN
    RAISE EXCEPTION 'FAILED: inventory_logs.variant_id column exists';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Inventory mode constraints: at most one product-level row per product
  -- ---------------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'product_inventory_product_only_unique'
      AND indexdef LIKE '%variant_id IS NULL%'
  ) INTO status_ok;
  IF NOT status_ok THEN
    RAISE EXCEPTION 'FAILED: partial unique index (one product-level inventory row)';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'products_slug_unique'
      AND indexdef LIKE '%slug%' AND indexdef LIKE '%WHERE slug IS NOT NULL%'
  ) INTO status_ok;
  IF NOT status_ok THEN
    RAISE EXCEPTION 'FAILED: products_slug_unique partial unique index';
  END IF;

  -- ---------------------------------------------------------------------------
  -- current_price() STABLE helper callable by anon/authenticated
  -- ---------------------------------------------------------------------------
  SELECT p.oid INTO f_price
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'current_price' AND p.pronargs = 1
  LIMIT 1;
  IF f_price IS NULL THEN
    RAISE EXCEPTION 'FAILED: current_price(products) exists';
  END IF;
  IF NOT has_function_privilege('anon', f_price, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', f_price, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: current_price callable by anon + authenticated';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Admin catalogue RPCs: exact signatures, service_role only
  -- ---------------------------------------------------------------------------
  SELECT p.oid INTO f_create
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_create_product'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, jsonb, jsonb'
  LIMIT 1;
  IF f_create IS NULL THEN
    RAISE EXCEPTION 'FAILED: admin_create_product(uuid, jsonb, jsonb) exists';
  END IF;
  IF NOT has_function_privilege('service_role', f_create, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: service_role can EXECUTE admin_create_product';
  END IF;
  IF has_function_privilege('anon', f_create, 'EXECUTE')
     OR has_function_privilege('authenticated', f_create, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: admin_create_product not executable by anon/authenticated';
  END IF;

  SELECT p.oid INTO f_update
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_update_product'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, jsonb, jsonb'
  LIMIT 1;
  IF f_update IS NULL THEN
    RAISE EXCEPTION 'FAILED: admin_update_product(uuid, uuid, jsonb, jsonb) exists';
  END IF;
  IF NOT has_function_privilege('service_role', f_update, 'EXECUTE')
     OR has_function_privilege('anon', f_update, 'EXECUTE')
     OR has_function_privilege('authenticated', f_update, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: admin_update_product privilege model (service_role only)';
  END IF;

  SELECT p.oid INTO f_delete
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_delete_product'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
  LIMIT 1;
  IF f_delete IS NULL THEN
    RAISE EXCEPTION 'FAILED: admin_delete_product(uuid, uuid) exists';
  END IF;
  IF NOT has_function_privilege('service_role', f_delete, 'EXECUTE')
     OR has_function_privilege('authenticated', f_delete, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: admin_delete_product privilege model (service_role only)';
  END IF;

  SELECT p.oid INTO f_adjust
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_adjust_inventory'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, uuid, integer, text'
  LIMIT 1;
  IF f_adjust IS NULL THEN
    RAISE EXCEPTION 'FAILED: admin_adjust_inventory(uuid, uuid, uuid, int, text) exists';
  END IF;
  IF NOT has_function_privilege('service_role', f_adjust, 'EXECUTE')
     OR has_function_privilege('authenticated', f_adjust, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: admin_adjust_inventory privilege model (service_role only)';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Storage: public product-images bucket
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'product-images' AND public = TRUE
  ) THEN
    RAISE EXCEPTION 'FAILED: public storage bucket product-images exists';
  END IF;

  RAISE NOTICE 'verify_phase1.sql: migration 004 catalogue checks passed';
END;
$verify$;

-- =============================================================================
-- Migration 005 delivery-zone checks: zones, RLS, orders.delivery_zone_id
-- =============================================================================
DO $verify$
DECLARE
  status_ok BOOLEAN;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_zones'
  ) THEN
    RAISE EXCEPTION 'FAILED: table public.delivery_zones exists (migration 005)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'delivery_zones' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'FAILED: RLS enabled on public.delivery_zones';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_zone_id'
  ) THEN
    RAISE EXCEPTION 'FAILED: orders.delivery_zone_id column exists';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.delivery_zones'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%fee%>=%0%'
  ) INTO status_ok;
  IF NOT status_ok THEN
    RAISE EXCEPTION 'FAILED: delivery_zones.fee check constraint (fee >= 0)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delivery_zones'
      AND policyname = 'Anyone can view active delivery zones' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAILED: delivery_zones public-read-active policy';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'delivery_zones'
      AND policyname = 'Admins manage delivery zones' AND cmd = 'ALL'
  ) THEN
    RAISE EXCEPTION 'FAILED: delivery_zones admin-manage policy';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_orders_delivery_zone'
  ) THEN
    RAISE EXCEPTION 'FAILED: index idx_orders_delivery_zone exists';
  END IF;

  RAISE NOTICE 'verify_phase1.sql: migration 005 delivery-zone checks passed';
END;
$verify$;

-- =============================================================================
-- Migration 006 checks: product requests, verifiable reviews, review RPCs
-- =============================================================================
DO $verify$
DECLARE
  f_submit   oid;
  f_remove   oid;
  f_req_upd  oid;
  has_policy BOOLEAN;
BEGIN
  -- ---------------------------------------------------------------------------
  -- product_requests table + RLS (migration 006)
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_requests'
  ) THEN
    RAISE EXCEPTION 'FAILED: table public.product_requests exists (migration 006)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'product_requests' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'FAILED: RLS enabled on public.product_requests';
  END IF;

  -- Default-deny: no RLS policies at all; access is service-role via API routes.
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_requests'
  ) INTO has_policy;
  IF has_policy THEN
    RAISE EXCEPTION 'FAILED: product_requests has no RLS policies (default deny)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_requests' AND column_name = 'whatsapp'
  ) THEN
    RAISE EXCEPTION 'FAILED: product_requests.whatsapp column exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_requests' AND column_name = 'quantity'
  ) THEN
    RAISE EXCEPTION 'FAILED: product_requests.quantity column exists';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.product_requests'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%pending%contacted%completed%cancelled%'
  ) INTO has_policy;
  IF NOT has_policy THEN
    RAISE EXCEPTION 'FAILED: product_requests.status check constraint (workflow)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_product_requests_status_created'
  ) THEN
    RAISE EXCEPTION 'FAILED: index idx_product_requests_status_created exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'product_requests_set_updated_at' AND tgrelid = 'public.product_requests'::regclass
  ) THEN
    RAISE EXCEPTION 'FAILED: product_requests_set_updated_at trigger';
  END IF;

  -- ---------------------------------------------------------------------------
  -- reviews.order_id + partial unique index (migration 006)
  -- ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'order_id'
  ) THEN
    RAISE EXCEPTION 'FAILED: reviews.order_id column exists';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_reviews_order_product'
      AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%WHERE order_id IS NOT NULL%'
  ) INTO has_policy;
  IF NOT has_policy THEN
    RAISE EXCEPTION 'FAILED: idx_reviews_order_product partial unique index';
  END IF;

  -- ---------------------------------------------------------------------------
  -- T007 enforcement RPCs: exact signatures, service_role only
  -- ---------------------------------------------------------------------------
  SELECT p.oid INTO f_submit
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'submit_review'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, integer, text'
  LIMIT 1;
  IF f_submit IS NULL THEN
    RAISE EXCEPTION 'FAILED: submit_review(uuid, uuid, text, int, text) exists';
  END IF;
  IF NOT has_function_privilege('service_role', f_submit, 'EXECUTE')
     OR has_function_privilege('anon', f_submit, 'EXECUTE')
     OR has_function_privilege('authenticated', f_submit, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: submit_review privilege model (service_role only)';
  END IF;

  SELECT p.oid INTO f_remove
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'remove_review'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
  LIMIT 1;
  IF f_remove IS NULL THEN
    RAISE EXCEPTION 'FAILED: remove_review(uuid, uuid) exists';
  END IF;
  IF NOT has_function_privilege('service_role', f_remove, 'EXECUTE')
     OR has_function_privilege('anon', f_remove, 'EXECUTE')
     OR has_function_privilege('authenticated', f_remove, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: remove_review privilege model (service_role only)';
  END IF;

  SELECT p.oid INTO f_req_upd
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_update_product_request'
    AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, text'
  LIMIT 1;
  IF f_req_upd IS NULL THEN
    RAISE EXCEPTION 'FAILED: admin_update_product_request(uuid, uuid, text, text) exists';
  END IF;
  IF NOT has_function_privilege('service_role', f_req_upd, 'EXECUTE')
     OR has_function_privilege('anon', f_req_upd, 'EXECUTE')
     OR has_function_privilege('authenticated', f_req_upd, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAILED: admin_update_product_request privilege model (service_role only)';
  END IF;

  RAISE NOTICE 'verify_phase1.sql: migration 006 product-request/review checks passed';
END;
$verify$;