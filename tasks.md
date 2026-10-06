# Phase 1 — Production-Ready Core Shop: Task Tracker

Tracked against the 12 broad Phase 1 tasks (T001–T012). Status legend:

- **COMPLETE** — implemented and verified
- **PARTIAL** — some parts exist; remainder listed under "Remaining"
- **MISSING** — not implemented
- **BLOCKED** — exists/code-ready but cannot be verified without the Supabase environment

Each task is executed one at a time: implement → verify → commit → manual review → next task.

---

## Static Gate Snapshot (verified 2026-10-06)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx jest` | PASS — 7 passed + 1 skipped suite (integration), 104 passed, 11 skipped, 115 total |
| `npx next lint` | PASS — 0 errors, 0 warnings |
| `npx next build` | PASS — clean output, only pre-existing metadata-viewport warnings |
| Live Supabase DB / Storage / Auth | **BLOCKED** — no `NEXT_PUBLIC_SUPABASE_URL`, anon key, or service-role key configured; migrations 003–005 never applied to a real project |

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

## T002 — Admin Authentication, RBAC & Admin Foundation — **PARTIAL (implementation PASS; live secrets still BLOCKED)**

**Implemented (2026-10-02):**
- **Password reset (§19.2):** `/admin/forgot-password` (email → Supabase reset link), `/admin/reset-password` (recovery-session page → server-rotated password with audit log), Owner/Super Admin manual reset tools (recovery link via `generateLink` — works without SMTP — or fresh temporary password) on the staff screen. Expiring/one-time semantics come from Supabase Auth's recovery tokens and password rotation.
- **Admin account management (§18.1):** `/admin/settings/staff` (super-admin only) — create staff with one-time temp password, change role, activate/deactivate (deactivation rotates the password and immediately denies access), revoke sessions, reset link / temp password, permanent removal.
- **Sessions & logout-all (§19.1):** `admin_sessions` now populated on login/logout; self **sign-out-all-devices** via `supabase.auth.signOut({ scope: 'global' })`; per-target revocation + forced re-login via password rotation (hosted GoTrue kills the target's sessions). Session rows carry IP + user-agent.
- **Server-side RBAC:** new pure module `src/lib/admin-permissions.ts` (role rank, `canManageRole` — never equal/higher rank, never self, `owner` never assignable); `requireSuperAdmin` guard added to `supabase-server.ts`; every admin API self-authorizes.
- **Protected admin routes:** middleware protects `/admin/:path*`, verifies `users.role` + `is_active`, bypasses the three auth pages, and gates `/admin/settings/staff`.
- **Admin navigation (§17.2):** full sectioned sidebar (Dashboard, Orders, Payments, Refunds, Products, Categories, Inventory, Customers, Reviews, Printing Requests, Bulk Orders, Analytics, Delivery Zones, Website Content, Settings, Activity Log); unbuilt sections render non-functional placeholders instead of 404s.
- **Secure auth errors:** login failures always report "Invalid email or password."; signed-in-but-not-admin is signed back out server-side; forgot-password never reveals whether an email is registered.
- **Security/activity logging:** `admin_login`, `admin_logout`, `admin_sessions_revoked`, `admin_password_changed`, `admin_password_reset_completed`, `admin_account_created`, `admin_role_changed`, `admin_activated`, `admin_deactivated`, `admin_password_reset_link_generated`, `admin_password_reissued`, `admin_account_removed` with actor IP.
- **Guest-only shopping (§7.3):** customer auth removed — `/login`, `/signup` pages deleted and `signUpCustomer` dropped; admins sign in only at `/admin/login`; no customer-account path remains in code.

**Verified:** `tsc --noEmit` clean; jest 6 suites / 66 tests pass (+ 10 integration tests skip without creds); `next lint` clean; `next build` PASS (37 static + dynamic routes).

**Blockers (live):** no Supabase env keys/SMTP → password-reset email delivery, hosted-GoTrue session-revocation-on-password-rotation, and create-account flows are implemented but not live-verified; Supabase's built-in auth rate limiting covers login brute force (edge rate limiting is not possible with client-side `signInWithPassword`).

## T003 — Products, Categories & Inventory — **PARTIAL (implementation PASS; live secrets still BLOCKED)**

**Implemented (2026-10-04):**
- **Migration `004_catalog_inventory.sql`:** `categories` (self-parent FK, slug unique, active flag, display_order); `products` gains `category_id`/`subcategory_id`/`slug` (partial unique)/`is_active`/SEO fields/`sale_price` + sale window CHECK/`images` JSONB; `product_variants` (optional own price, active flag); `product_inventory.variant_id` with `UNIQUE(product_id, variant_id)` + partial unique (product-level only when `variant_id IS NULL`); `inventory_logs.variant_id`; STABLE `current_price(products)` (sale window logic) granted to `anon`/`authenticated`; `create_order_with_payment` now prices items from `current_price`; `transition_order_status` does a sum-based stock-sufficiency pre-pass then FIFO variant deduction (both rewritten, signatures unchanged).
- **Catalogue admin (spec §6.1, §6.3, §6.7):** admin product list/create/edit (`ProductForm` — name, price, category/subcategory, availability, sale price + scheduled window, SEO, up to 12 ordered images with secure upload/delete, variant editor), category tree CRUD (re-parenting guard: parent disabled once it has children; slug uniqueness errors surfaced), inventory screen (per-variant/ product-level stock, low/out badges, adjustment dialog with mandatory reason + audit trail).
- **Catalog APIs (server-side business rules):** SECURITY DEFINER admin RPCs (`admin_create_product`, `admin_update_product`, `admin_delete_product`, `admin_adjust_inventory`, `_catalog_admin_check`) via service-role, REVOKEd from PUBLIC/GRANTed to service_role; RLS admin policies are defense-in-depth; rate-limited product/upload endpoints; product_created/deleted and inventory_adjusted activity logs.
- **Validation (`src/lib/product-validation.ts`, pure):** price > 0, max price 99,999,999, max qty 1,000,000, ≤12 images (http(s), unique), ≤50 variants, sale-window rules (both dates required if set, end > start), inventory adjust requires non-zero whole-number delta + reason; `effectivePrice`/`isOnSale` render mirrors of DB `current_price`. 28 unit tests pass.
- **Shop read-side:** product cards + detail show effective (sale) price, SALE badge/strike-through, availability across variants, variant name/price/per-variant stock readout, multi-image thumbnails; `ProductFilters` now uses the `categories` tree (id-based) and price ranges filter on `current_price`; shop queries filter `is_active = true`. Variant-aware cart/checkout is intentionally deferred (T004).

**Verified:** `tsc --noEmit` clean; jest 6 suites / 85 tests pass (+ 10 integration tests skip without creds); `next lint` clean (1 pre-existing ProductFilters exhaustive-deps warning); clean `next build` PASS (49 static + dynamic routes) with only the known i18n block warning.

**Blockers (live):** no Supabase env keys → migration 004, admin RPCs, `current_price`, storage bucket and RLS never applied to a real project; `verify_phase1.sql` extended with 004 checks but not run; image upload/delete and variant stock flows are static-verified only.

**Remaining (deferred/other):**
- Variant-aware cart + checkout (choose a variant, price its sale), deferred to T004.
- Category tree filters on the shop (`getCategories` returns top-level only today); `product_count` embeds.
- API-layer inventory log view; low-stock notifications; per-product image-optimization sizing.
- Legacy `/api/orders` flow still references migration-003 privilege layout (out of scope here; T004 work addresses it).

## T004 — Shopping, Checkout & Order Management — **STATIC PASS / LIVE BLOCKED**

**Exists:**
- Browsing, filters, product detail, cart (persistent localStorage, quantity, remove), guest checkout (name/email/WhatsApp/address/delivery method), server-side price/total recomputation, idempotency + request hash, order creation, order ID, item snapshots, lifecycle (`pending_payment → received → processing → ready → out_for_delivery → delivered`, terminal `cancelled`), tracking (order ID + WhatsApp), cancellation rules server-enforced.
- `src/lib/validation.ts` (+ tests): shared order/tracking/notes/delivery parsers, `normalizePhone`, idempotency key checks.
- `/api/orders` rewrite (`create_order_with_payment` RPC + validation + rate limit), secure guest tracking via `/api/orders/track` (order ID + normalized phone), new `/shop/track` page, order-confirmation page loads securely via session-stored phone (no public order data leak) + JazzCash/Easypaisa verification note.
- Admin orders moved off the browser Supabase client to server APIs: `/api/admin/orders`, `[id]`, `[id]/status`, `[id]/delivery` (all `requireAdmin` + validation + rate-limited); `src/lib/orders.ts` now uses `apiFetch`. Status options aligned to lifecycle; `payment_status` uses `paid` (not `confirmed`).
- Shop layout is guest-only header (track, cart count, staff login); `CartProvider` mounted at root (`useCart` previously threw outside checkout/cart); cart `itemCount` sums quantities; ProductFilters dependency fix (clears the last lint warning).
- Extracted from stash: mixed with T006/T009 WIP (admin payments/activity API refactor, nullable Supabase client, i18n-block removal, auth guard) — left uncommitted.

**Verified (static):**
- `tsc --noEmit` clean; `next lint` clean (warning fixed); jest 7/8 suites, 98 pass, 10 skip; clean `next build` pass.

**Remaining:**
- Search + autocomplete (spec §6.5); availability/variant filters.
- Variant-aware cart + checkout (choose a variant, price its sale).
- Order review step polish; payment instructions rendering from admin-sourced details.
- Live verification blocked: no Supabase env keys; migration 004 + `verify_phase1.sql` not applied.

## T005 — Delivery Zones & Shop Pickup — **STATIC PASS / LIVE BLOCKED**

**Exists:**
- `005_delivery_zones.sql`: `delivery_zones` table (name 1–100, fee >= 0, is_active, display_order, RLS: anon SELECT active / admins ALL), `orders.delivery_zone_id` FK (`ON DELETE SET NULL`) + index; `create_order_with_payment` extended to 14 args (`p_delivery_zone_id`) — courier requires an active zone, `self` forbids zones, fee derived server-side from the zone, total = items + fee stored on order and payment.
- `verify_phase1.sql` updated to the 14-arg signature + T005 zone checks; `db.integration.test.ts` updated (creates zones in `beforeAll`, asserts fee-derived totals + zone rules).
- `validation.ts` (+ tests): `delivery_zone_id` on `OrderInput`; courier ⇒ zone required, self ⇒ no zone allowed.
- Public GET `/api/delivery-zones` (active zones only, RLS-honouring anon client); admin zones API `/api/admin/delivery-zones` + `[id]` (requireAdmin, rate-limited, activity-logged; category pattern); `parseDeliveryZonePayload`; `delivery-zones-client.ts`.
- `/api/orders` fetches the active zone, adds the fee to the total, passes the zone id to the RPC, includes it in the request hash; `/api/orders/track` + admin order selects expose `delivery_fee` + `delivery_zones(name)`; `Order.delivery_fee`/zone-name helpers.
- Admin `/delivery-zones` page (create/edit/delete, active badge, fee, order count); admin order detail shows items / delivery fee / total + delivery zone.
- Checkout: zone dropdown with fee, fee in summary + total, shop-pickup hours (7:00 AM–8:00 PM, PKR 0), outside-zone block + WhatsApp message; confirmation + track pages show delivery fee + zone.

**Verified (static):**
- `tsc --noEmit` clean; `next lint` clean; jest 7/8 suites, 101 pass, 11 skip; clean `next build` pass (pre-existing metadata-viewport warnings only).

**Remaining:**
- WhatsApp click-to-chat number not wired (no business-settings source yet) — rendered as text CTA only.
- No seed reference zones for local demo.
- Live verification blocked: no Supabase env keys; migration 005 + updated `verify_phase1.sql` not applied.

## T006 — Payments & Refund Operations — **STATIC PASS / LIVE BLOCKED**

**Exists:**
- COD (immediate `received`), JazzCash/Easypaisa (`pending_payment` until verified), transaction reference + screenshot evidence (private bucket, 5MB, PNG/JPEG/WebP + magic bytes, rate-limited upload API).
- Payment lifecycle `pending → paid → failed → refunded`; admin confirm/fail/refund via the `verify_payment` RPC + rate-limited server APIs (`/api/admin/payments` list + `[id]` detail/POST); activity logging; idempotency; request hash; server-side total verification.
- `verify_payment('refund')` enforces refund-only-from-paid, requires a refund reference, stores `refund_reference`, updates order `payment_status`, and logs `payment_refunded` (migration 003).
- **Admin payments screen (server API-backed):** status tabs (Action Needed / Pending / Paid / Failed / Refunded), summary counts, list + detail incl. `refund_reference` + `failure_reason`, evidence via signed URL, Confirm / Reject (reason required) / **Record Refund** (reference required) actions, refetch-after-action with success/error notices, link to order.
- **Refund UI now reachable:** previously the list API only returned `pending`/`failed`, so `paid` payments (the only refundable state) never appeared. A `?status=` filter on the list API plus tabs expose paid/refunded payments and history.
- `parsePaymentStatusFilter` (+ 3 unit tests); client `getPayments(status?)`/`PaymentListResponse` replaces `getActionablePayments`/`getPaymentSummary`.
- Integration suite (gated) already covers the refund lifecycle: refund of a non-paid payment rejected, missing refund reference rejected, refund succeeds from `paid`, no re-confirm after refund.

**Verified (static):**
- `tsc --noEmit` clean; `next lint` clean; jest 7/8 suites, 104 pass, 11 skip; clean `next build` pass (pre-existing metadata-viewport warnings only).

**Remaining:**
- Returns / damaged-product workflow UI (spec §11): returns are requested through WhatsApp/contact per spec — no web form. Admin records the refund on the Payments screen; a dedicated returns-claims admin page is re-evaluated at T008, and the public Returns & Refunds info page belongs to T009.
- Online gateway/webhooks (spec §10.6): **decision — no provider approved/configured**. Manual JazzCash/Easypaisa verification + recorded refunds only; no gateway or webhook code implemented (see `DECISIONS` below).
- Live verification blocked: no Supabase env keys; migration 005 + updated `verify_phase1.sql` not applied.

## T007 — Customer Features & Communication — **STATIC PASS / LIVE BLOCKED**

**Implemented (2026-10-06):**
- **Reviews (spec §15):**
  - Migration **`006_product_requests_and_reviews.sql`**: `reviews.order_id` (FK to orders, `ON DELETE SET NULL`) + partial unique `(order_id, product_id)` so one verified review per purchased product per order; `submit_review` RPC (SECURITY DEFINER, service_role-only) validates rating 1–5 / review 1–2000 / normalized phone, requires a matching **delivered** order with the product in its items, derives the display name from the order, and blocks duplicates ("You have already reviewed this product for this order").
  - **Moderation is remove-only at the data layer:** `remove_review` flips `is_removed` and logs `review_removed` — it cannot edit customer content; `public_reviews` view already omits removed/invalid reviews (needs live apply).
  - `/api/reviews` POST (rate-limited `reviews:` key) → `submit_review`; `/api/admin/reviews` GET + `[id]` POST (`{action:'remove'}`) → `remove_review`; both `requireAdmin`/service-role RPC-backed. Admin Reviews screen (replaces placeholder): levels/tabs (Visible / Removed / All), Verified badge, Remove button. `safeDatabaseError` extended with new RPC messages.
  - Shop: `ProductReviews` component (list w/ stars + Featured badge) + "Write a review" form (order ID + WhatsApp + rating + review) on each product detail page; reviews load via the `public_reviews` view (anon client, same pattern as `products.ts`).
- **Product requests / out-of-stock (spec §14):** `product_requests` table (customer_name 1–120, whatsapp PK-format regex, product_name 1–200, quantity 1–100, optional message ≤1000, status `pending/contacted/completed/cancelled`, admin_notes, created/updated_at). **RLS enabled with zero policies — default-deny**; all reads/writes go through service-role API routes (`/api/product-requests` POST rate-limited; `/api/admin/product-requests` GET + `[id]` POST via `admin_update_product_request` RPC which validates status transitions + notes and logs `product_request_status_updated` with `{from,to}`). `ProductRequestForm` shown on out-of-stock product pages; admin Product Requests screen (status filter tabs, per-row status + notes editor, WhatsApp follow-up link) + "Product Requests" nav item.
- **WhatsApp click-to-chat (manual only):** `src/lib/business-config.ts` single source of truth — `NEXT_PUBLIC_WHATSAPP_NUMBER` → normalized `wa.me` link with prefilled text; `whatsappLink` returns null when unset (callers fall back to the Contact page). Unit-tested. CTA buttons wired into checkout (no-delivery-area + can't-find-area notices), order tracking results, and order confirmation; Contact page lists location (Pandiali, Danishkool Road Adda Bazar, District Mohmand, KPK), hours (Mon–Sun 7 AM–8 PM) and a returns/refunds note.
- **Contact page** `/shop/contact` + header link — interim interpretation of "returns/contact communication" (full Returns & Refunds info page remains deferred to T009; recorded here per AGENTS.md).

**Verified (static):**
- `tsc --noEmit` clean; `next lint` clean; jest suites pass (new: `business-config`, `parseReviewSubmission` product_id case, `parseProductRequestInput`); clean `next build` pass.

**Remaining / blockers:**
- Live verification blocked: no Supabase env keys; migration 006 + updated `verify_phase1.sql` not applied; reviews moderation, product-request workflow and RPC grants are static-verified only.
- Automatic WhatsApp notifications remain out of scope (none exist — per constraint).
- Full Returns & Refunds public info page → T009.

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
- **Customer account leftovers (T002):** resolved in T002 — `/signup`, `/login` and `signUpCustomer` removed (spec §7.3 = guest-only, no customer accounts).

## Phase 2 (unchanged)

Phase 2 (Admin Dashboard & Analytics) remains locked behind Phase 1 sign-off and will not be implemented until the Phase 1 gate passes.