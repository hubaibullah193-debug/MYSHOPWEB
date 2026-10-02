-- =============================================================================
-- verify_phase1.sql
--
-- Phase 1 database-foundation verification for Hubaib One Stop Shop.
--
-- Verifies, against a real Supabase (PostgreSQL 14+) project, that migrations
-- 001 -> 002 -> 003 produced the expected production foundation:
--   * tables, columns, check constraints, RLS policies
--   * enforcement RPCs (create_order_with_payment, transition_order_status,
--     verify_payment, assign_order_delivery, deduct_inventory) with the correct
--     signature and privilege model (service_role only)
--   * role helper functions, audit triggers, indexes
--   * private `payment-evidence` storage bucket
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
    'reviews', 'business_settings', 'customer_notes', 'admin_sessions'
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
    'reviews', 'business_settings', 'customer_notes', 'admin_sessions'
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
        'uuid, text, text, text, text, jsonb, numeric, text, text, text, text, text, text'
  LIMIT 1;
  IF f_create_order IS NULL THEN
    RAISE EXCEPTION 'FAILED: create_order_with_payment(13 args) exists';
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

  RAISE NOTICE 'verify_phase1.sql: all checks passed';
END;
$verify$;