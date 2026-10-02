# Phase 1 — Production-Ready Core Shop: Task Tracker

Tracked against the 12 broad Phase 1 tasks (T001–T012). Status legend:

- **COMPLETE** — implemented and verified
- **PARTIAL** — some parts exist; remainder listed under "Remaining"
- **MISSING** — not implemented
- **BLOCKED** — exists/code-ready but cannot be verified without the Supabase environment

Each task is executed one at a time: implement → verify → commit → manual review → next task.

---

## Static Gate Snapshot (verified 2026-10-02)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx jest --runInBand` | PASS — 4 suites, 38 tests |
| `npx next lint` | PASS — 0 errors, 0 warnings |
| `npx next build` | PASS — 19 static pages + 8 API routes + /login + /signup, clean output |
| Live Supabase DB / Storage / Auth | **BLOCKED** — no `NEXT_PUBLIC_SUPABASE_URL`, anon key, or service-role key configured; migration 003 never applied to a real project |

---

## T001 — Supabase & Database Production Verification — **PARTIAL (static audit PASS; runtime BLOCKED)**

**Static audit (2026-10-02):** migrations 001/002/003 reviewed line-by-line at the SQL level.
- Schema/constraints: guest-checkout columns (`customer_id` nullable, `customer_name`, `delivery_fee`, `inventory_deducted_at`, `admin_notes`), lifecycle status/payment CHECK constraints, FK `ON DELETE SET NULL` hardening — correct.
- RPCs: `create_order_with_payment` (13 args), `transition_order_status`, `verify_payment`, `assign_order_delivery`, `deduct_inventory` — signatures, idempotency, exactly-once atomic deduction, cancellation/payment ordering rules all consistent with `spec.md` §9.
- Privileges: enforcement RPCs REVOKEd from anon/authenticated/PUBLIC and GRANTed to `service_role` only (verified arg-count consistency via `pg_get_function_identity_arguments`); RLS helper funcs remain PUBLIC-executable for policy evaluation.
- Verified `002` ⨯ `003` interaction: `deduct_inventory` granted to `authenticated` in 002 is revoked then re-granted to `service_role` in 003 — consistent.
- RLS policies, indexes, audit triggers, and the private `payment-evidence` bucket + signed-URL/5MB/magic-bytes upload path reviewed — correct.

**Integration-test foundation (this task):**
- `supabase/tests/verify_phase1.sql` — idempotent read-only schema/RLS/privilege/bucket verification (run via `psql`/CI once creds exist).
- `src/lib/db.integration.test.ts` — runtime suite (13 tests) covering order creation, idempotency, total tampering, evidence rules, atomic + exactly-once stock deduction, cancellation rules, payment lifecycle, and anon RLS/storage denials. Gated on `SUPABASE_TEST_URL`/`SUPABASE_TEST_SERVICE_ROLE_KEY`/`SUPABASE_TEST_ANON_KEY` — skips cleanly when absent.

**Remaining / Blocker:**
- Apply migrations 001→002→003 to a real Supabase project and run the above suites to confirm runtime behavior (RLS, grants, RPCs, storage).
- **Blocker:** no Supabase credentials and no local Postgres tooling — runtime verification is BLOCKED, not skipped. Nothing is claimed as live-verified.

## T002 — Admin Authentication, RBAC & Admin Foundation — **PARTIAL**

**Exists:**
- Admin login page, `useAuth`, middleware protection for `/admin/:path*`, `requireAdmin` service-side guard on all admin APIs, DB role + `is_active` gate, sign-out, safe DB error mapping, activity logging.
- Roles: `owner`, `super_admin`, `admin_staff`, `customer` in DB; UI/API checks use `admin_staff`+ / `super_admin`+.

**Remaining:**
- Password reset flow (spec §19.2) — missing entirely (forgot-password, secure token, owner reset).
- Admin account management (owner: create/remove/activate/reset admins) — no UI/API (spec §18.1).
- Logout-all-sessions / session revocation — not implemented (`admin_sessions` table unused).
- Admin navigation completeness + missing routes (Products, Categories, Inventory, Refunds, Customers, Reviews, Delivery Zones, Settings…) create 404s (spec §17.2).
- Remove/neutralize leftover **customer** signup/login (`/signup`, `/login`, links in shop + admin layouts) — spec §7.3 = **no customer accounts** (currently `role='customer'` auth path still exists).

## T003 — Products, Categories & Inventory — **PARTIAL**

**Exists:**
- Customer: product listing, filters (category, price), product detail, stock display, add-to-cart.
- DB: `products`, `product_inventory` (per-product quantity), `inventory_logs`, `deduct_inventory`; atomic exactly-once deduction on `received → processing` inside `transition_order_status`.
- No admin product/category/inventory management UI or APIs.

**Remaining (admin side):**
- Product CRUD, multiple images (secure product-image storage bucket + optimization), availability status, SEO fields (spec §6.1).
- Variants with independent stock + variant pricing/discounts; scheduled discounts (spec §6.3).
- Subcategories + hierarchy management (spec §6.7).
- Inventory admin UI: manual adjustment, logs view, low-stock/out-of-stock indicators/notifications.

## T004 — Shopping, Checkout & Order Management — **PARTIAL**

**Exists:**
- Browsing, filters, product detail, cart (persistent localStorage, quantity, remove), guest checkout (name/email/WhatsApp/address/delivery method), server-side price/total recomputation, idempotency + request hash, order creation, order ID, item snapshots, lifecycle (`pending_payment → received → processing → ready → out_for_delivery → delivered`, terminal `cancelled`), tracking (order ID + WhatsApp), cancellation rules server-enforced.

**Remaining:**
- Search + autocomplete (spec §6.5); availability/variant filters.
- Delivery fee in totals once zones exist (T005).
- Order review step polish, confirmation details (payment instructions for JazzCash/Easypaisa).

## T005 — Delivery Zones & Shop Pickup — **MISSING**

- No `delivery_zones` table, no zone admin UI, no zone selection/fee calculation at checkout, no outside-zone handling (spec §8.1–8.3).
- Shop pickup flow exists minimally (`self` method, PKR 0 note); pickup time suggestion, business-hours display missing.
- Admin `assign_order_delivery` RPC + order-detail assignment UI exist (date/time/method); no zone/fee integration.

## T006 — Payments & Refund Operations — **PARTIAL**

**Exists:**
- COD (immediate `received`), JazzCash/Easypaisa (`pending_payment` until verified), transaction reference + screenshot evidence (private bucket, 5MB, PNG/JPEG/WebP + magic bytes, rate-limited upload API).
- Payment lifecycle `pending → paid → failed → refunded`; admin confirm/fail/refund via `verify_payment` RPC + APIs; activity logging; idempotency; request hash; server-side total verification.
- Refund foundation: `verify_payment('refund')` + `refundPayment` client helper.

**Remaining:**
- Refund UI is unreachable — `payments` list only returns `pending`/`failed`, so `paid` payments (the only refundable state) never appear; no refund button.
- Returns / damaged-product workflow UI (spec §11).
- Webhook/signature architecture (spec §10.6) — **blocked/decision**: no online gateway provider approved; do **not** invent one. Document provider decision (see `DECISIONS` below).

## T007 — Customer Features & Communication — **PARTIAL**

**Exists:**
- Order tracking (order ID + WhatsApp).

**Remaining:**
- Reviews (spec §15): table + RLS exist, no customer submission UI, no purchaser verification, no admin moderation/removal UI, no display on product page.
- Product requests / out-of-stock request flow (spec §14; `order_requests` table unused).
- WhatsApp click-to-chat (manual): not implemented anywhere.
- Returns/contact communication pages.

**Constraint:** no automatic WhatsApp notifications (none exist — good).

## T008 — Admin Operations Dashboard — **PARTIAL**

**Exists:**
- Dashboard page (**metrics are `—` placeholders** — kept honest, no fake data), orders list + status filter, order detail + status/delivery updates, payments verification page, activity log with filters + summary, sidebar nav.

**Remaining:**
- Admin pages for Products, Categories, Inventory, Refunds/Returns, Customers, Reviews, Product Requests, Delivery Zones, Website/Content, Settings (spec §4.2 / §17.2).
- Dashboard metrics wired to real queries (or remain clearly marked placeholders).
- We'll keep placeholders marked; no fabricated production metrics.

## T009 — Website UX, Bilingual English/Urdu & RTL — **PARTIAL**

**Exists:**
- i18next setup (path/localStorage/navigator detection), `LanguageSwitcher` with `dir="rtl"` toggle, `en.json` + `ur.json` locale files, some customer pages use `t()` (products, filters, loading text).

**Remaining:**
- Homepage is a **stub** (title text only) — no hero, category chip strip, sections, recommended/featured, Visit Shop or footer (spec §5.1).
- Missing public pages: About, Contact, Visit Shop (hours/location), Delivery Info, Returns & Refunds, FAQ, Terms, Privacy, Policies (spec §4.1).
- Search, mobile nav, WhatsApp integration.
- Most pages hard-code English strings (cart, checkout, tracking, etc. do **not** use `t()`) → mixed-language risk and incomplete Urdu coverage.

## T010 — SEO, Accessibility & Performance — **PARTIAL**

**Exists:** minimal root metadata + viewport export; `next/image` with remote Supabase pattern; noNearby.

**Remaining:**
- SEO: per-page metadata/OG/canonical, sitemap, robots.txt, JSON-LD (product/local business), breadcrumbs, alt-text pass, local SEO for Pandiali/Mohmand/KPK, noindex on admin.
- Accessibility: WCAG 2.2 AA audit (semantics, keyboard, focus, dialogs, contrast, reduced motion, responsive); no automated a11y scan exists.
- Performance: CWV audit, image optimization/WebP, lazy loading, query/caching review.

## T011 — Full Testing, Security & Regression — **PARTIAL**

**Exists:** 38 unit tests (validation/orders/cart/auth), type-check, lint, build; rate limiting on sensitive endpoints; upload security.

**Remaining (mostly BLOCKED on live env):**
- DB/RLS/RPC integration tests, auth/authorization tests, storage/upload integration tests, idempotency/webhook security tests, E2E customer + admin journeys, dependency audit (`npm audit`), accessibility/perf audits.

## T012 — Final Phase 1 Production Gate — **NOT STARTED**

- Full audit vs `spec.md`/`CLAUDE.md`/`AGENTS.md`/`PHASES.md`/`PHASE1_VERIFICATION.md` + code + DB + storage + build.
- Classify every Phase 1 requirement PASS / PARTIAL / FAIL / BLOCKED / N/A.
- Rewrite `PHASE1_VERIFICATION.md` and `PHASES.md` (both are **stale**: they claim Phase 1 complete, 25 tests, customer signup/login, `confirmed`/`shipped` statuses, `pending → confirmed` payments — these contradict the current build).
- Do **not** downgrade requirements to force PASS. No sign-off claim while critical items are blocked.

---

## Open Decisions

- **Online payment gateway (T006):** no provider approved/configured in the repo or `.env.example`. Selecting/integrating one (with verified docs + webhook signature verification per spec §10.6) is a blocker decision, not an implementation detail.
- **Customer account leftovers (T002):** spec §7.3 forbids customer accounts, but `/signup`, `/login` and `signUpCustomer` still exist — remove or gate per confirmed intent.

## Phase 2 (unchanged)

Phase 2 (Admin Dashboard & Analytics) remains locked behind Phase 1 sign-off and will not be implemented until the Phase 1 gate passes.