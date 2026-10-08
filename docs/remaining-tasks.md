# Remaining Tasks — Master Roadmap to Production

**Created:** 2026-10-08 from a complete read-only end-to-end audit of the codebase at `master` @ `36341cf`.
**Authority:** `spec.md` (product spec) → `CLAUDE.md` (constitution) → `AGENTS.md` (agent rules).
**Ordering principle:** technical dependency and risk (Wave 0 = unblock/regression first), not phase number.
**This file is the single execution roadmap.** Statuses are updated only after verification; tasks are never deleted while unfinished.

---

## Legend

**Status:** `NOT STARTED` | `IN PROGRESS` | `DONE` | `BLOCKED` | `DEFERRED`

**Priority:**
- **P0** — blocks build, correctness, security, or all downstream work
- **P1** — required for Phase 1 completion / core product correctness
- **P2** — required for full spec conformance (Phases 2–5)
- **P3** — production readiness, polish, final gates (Phase 6)

**Verification labels (used in task records):**
`STATIC VERIFIED` = confirmed by code/automated checks only · `LIVE VERIFIED` = confirmed against real external environment · `BLOCKED` = required environment/credential unavailable, never faked.

---

## Audit Snapshot (2026-10-08, fresh re-run)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **FAIL** — 6 errors (`src/lib/products.ts`, `src/lib/reviews.ts`; root cause: `36341cf` made `supabase` nullable) |
| `npx next build` | **FAIL** — stops at type checking → **HEAD cannot deploy** |
| `npx next lint` | PASS — 0 problems |
| `npx jest` | PASS — 127 passed / 15 skipped / 9 suites |
| `npm audit` | FAIL — 46 vulns (1 critical, 38 high, 7 moderate) |
| Supabase live (DB/RLS/Auth/Storage) | **BLOCKED** — no `.env` credentials; migrations 001–007 never applied |
| Vercel production | **BLOCKED** — no access/URL; HEAD would fail build anyway |
| CI | **MISSING** — no test/build workflow in the repository |

**Estimated completion:** whole project ~40% (Ph 1 ~55%, Ph 2 ~40%, Ph 3 ~5%, Ph 4 ~45%, Ph 5 ~5%, Ph 6 ~0%).

**Known stale documentation (fixed in RT-064):** `PHASES.md`, `PHASE1_VERIFICATION.md`, `README.md`, `tasks.md` gate snapshot, `docs/DATABASE.md`, `supabase/seed.sql`.

---

## Open Decisions (need user input; tracked, not blocking Wave 0)

| # | Decision | Affects |
|---|---|---|
| D-1 | Payment provider for §10.3 online payments (JazzCash/Easypaisa gateway, merchant credentials, webhook URL) | RT-028, RT-029 |
| D-2 | Stash `stash@{0}` (20 files, +731/−948, overlaps HEAD) — salvage or drop? | RT-002 |
| D-3 | Dependency majors forced by `npm audit` (Next 14→16, Jest 30, ESLint-Config-Next 16, Tailwind 4) — upgrade now or accept audit noise? | RT-052 |
| D-4 | Spec §4.1 lists Printing Hub / Bulk-order form under Public Pages, but PHASES.md assigns them to Phase 3. Roadmap places them in Wave 6 (Phase 3). Confirm this sequencing. | Wave 6 |
| D-5 | Bilingual i18n (Urdu/English) is **not in `spec.md`** — it originates from PHASES.md/T009. Keep as requirement? | RT-019 |
| D-6 | Google Maps embed (§23.8): plain iframe embed (no key) vs Maps JavaScript API (key + billing) | RT-025 |

---

## WAVE 0 — Unblock Build & Fix Confirmed Regressions (highest risk)

### RT-001 — Restore `tsc` and `next build` (fix HEAD regression)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Eliminate the 6 type errors introduced by `36341cf` so type checking and production build pass again.
- **Spec refs:** §30.2 phase gates; §32.1 functional gates; CLAUDE.md principle 7 (verify every change).
- **Dependencies:** None (first task).
- **Files/areas likely affected:** `src/lib/products.ts` (L121/148/166/187 null-guards, L189 dead `.on()` realtime call), `src/lib/reviews.ts` (L28 null-guard), possibly `src/lib/supabase.ts` (if a stricter client pattern is adopted).
- **Acceptance criteria:**
  1. `npx tsc --noEmit` exits 0.
  2. `npx next build` completes with no type errors.
  3. No behavioral change to product/review fetching beyond removing the dead, non-compiling realtime `.on()` code.
  4. No unrelated files changed.
- **Verification requirements:** `npx tsc --noEmit`; `npx next build`; `npx next lint`; `npx jest` (127 pass baseline must hold). Record as `STATIC VERIFIED` (build artifacts only).
- **External/live dependencies:** None.

### RT-002 — Resolve stash `stash@{0}` (T004/T006/T009 WIP)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED (blocked on decision **D-2**)
- **Objective:** Diff the stashed WIP (20 files, +731/−948) against `36341cf`; salvage any valuable changes into tasks; drop the stash cleanly. Never blindly restore.
- **Spec refs:** AGENTS.md (respect codebase state); CLAUDE.md principle 2 (inspect before implementing).
- **Dependencies:** RT-001 (build must be green first to attribute regressions correctly).
- **Files/areas likely affected:** `src/lib/{supabase,products,orders,payments}.ts`, `src/app/layout.tsx`, `src/app/shop/checkout/page.tsx`, `src/components/ProductFilters.tsx`, `src/hooks/useAuth.ts`, `next.config.js`; creates follow-up tasks if salvageable content found.
- **Acceptance criteria:**
  1. `git stash show -p stash@{0}` reviewed and summarized.
  2. Decision recorded in this file (salvage → new RT-xxx tasks appended; or drop → stash removed with rationale in commit body).
  3. Working tree remains green (`tsc`, `lint`, `jest`).
- **Verification requirements:** `git stash list` reflects agreed state; gates re-run. `STATIC VERIFIED`.
- **External/live dependencies:** User decision D-2.

### RT-003 — Add CI pipeline (regression protection)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Every push/PR runs typecheck, lint, unit tests, and build so regressions like RT-001 cannot ship silently. Commit the currently untracked `.github/` intentionally.
- **Spec refs:** §29.1 testing levels; §30.2 phase gate process; CLAUDE.md principle 7.
- **Dependencies:** RT-001 (CI must be green from its first run).
- **Files/areas likely affected:** `.github/workflows/ci.yml` (new), `.github/workflows/opencode.yml` (add intentionally or leave untracked by explicit decision), `package.json` (scripts if needed).
- **Acceptance criteria:**
  1. Workflow runs `tsc --noEmit`, `next lint`, `jest --ci`, `next build` on push/PR to `master`.
  2. Secrets never exposed (uses only non-secret env; DB tests skipped without credentials).
  3. First run on GitHub is green (or failures are the known BLOCKED live-tests).
  4. `.github/` tracked in git (`git ls-files .github` non-empty for the CI workflow).
- **Verification requirements:** GitHub Actions run log (live check of push). `STATIC VERIFIED` locally + live confirmation after push.
- **External/live dependencies:** GitHub Actions availability.

### RT-004 — Fix sale-price / variant-price checkout mismatch (pricing correctness bug)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Make server-side order totals agree with both the RPC validation and the prices customers see, for sale prices and variant-specific prices.
- **Spec refs:** §6.3 variants, §6.1 sale pricing (current_price), §7.2 checkout, §10.6 payment security (server-side totals), CLAUDE.md principle 5 (business rules server-side).
- **Dependencies:** RT-001.
- **Files/areas likely affected:** `src/app/api/orders/route.ts` (currently recomputes from base `products.price` at L47/64/70/98), `supabase/migrations/005_delivery_zones.sql` (`create_order_with_payment` recomputes with `public.current_price()` and raises "Order total does not match product prices"), `src/app/shop/checkout/page.tsx`, `src/lib/cart.ts` (variant pricing), new migration only if RPC signature must change (prefer not).
- **Acceptance criteria:**
  1. Checkout of a product with active `sale_price` succeeds and stores the sale-based total.
  2. Checkout containing a variant with its own price charges the variant price (server-side, from DB — never client-supplied).
  3. RPC total validation still rejects tampered client totals.
  4. Unit tests cover: base price, active sale, expired sale, variant price, mismatch rejection.
- **Verification requirements:** `tsc`, `lint`, `jest` (new tests green); then live checkout test once RT-007 unblocks → upgrade to `LIVE VERIFIED`.
- **External/live dependencies:** Supabase (for final live confirmation — until then `STATIC VERIFIED`).

### RT-005 — Close middleware admin fail-open
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Admin pages must never render unauthenticated when Supabase env vars are absent (`src/middleware.ts` currently returns `NextResponse.next()` in that case).
- **Spec refs:** §18.1 roles, §19.1 authentication, §28.2 auth architecture, §28.3 API security; CLAUDE.md principle 6.
- **Dependencies:** RT-001.
- **Files/areas likely affected:** `src/middleware.ts` (matcher `/admin/:path*`), possibly `src/app/admin/login` redirect handling; admin pages already fetch with bearer token (keep as defense-in-depth).
- **Acceptance criteria:**
  1. With env vars missing/misconfigured, `/admin/*` redirects to login or 500s — never renders admin UI.
  2. With valid env + session, behavior unchanged (no regression to login flow).
  3. Missing-config state produces a clear server log, not a silent bypass.
- **Verification requirements:** `tsc`, `lint`, `jest`; manual middleware test via `next dev` with env unset and set. `STATIC VERIFIED`; live check during RT-009.
- **External/live dependencies:** None.

### RT-006 — Replace auth token storage with secure cookies (spec §28.2)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Stop writing Supabase access/refresh tokens to JS-readable `document.cookie` (current `cookieStorage` in `src/lib/supabase.ts`); store session in `HttpOnly` + `Secure` + `SameSite` cookies set server-side so middleware and server components can read it and XSS cannot steal it.
- **Spec refs:** §28.2 ("Secure HTTP-only cookies"), §28.3, §28.7 customer data; CLAUDE.md principle 6.
- **Dependencies:** RT-001, RT-005 (middleware must be correct first); coordinate with RT-009 live auth verification.
- **Files/areas likely affected:** `src/lib/supabase.ts` (client + cookieStorage), `src/lib/supabase-server.ts`, `src/middleware.ts`, login/logout/reset routes under `src/app/admin/login/`, `src/app/api/auth/*`, `src/hooks/useAuth.ts`.
- **Acceptance criteria:**
  1. No auth tokens present in `document.cookie` or `localStorage`.
  2. Session persists across refresh; logout clears the cookie; password reset flow still works.
  3. Middleware reads the HttpOnly cookie for admin gating.
  4. Cookies: `HttpOnly`, `Secure` (prod), `SameSite=Lax` (or stricter), path-scoped.
- **Verification requirements:** `tsc`, `lint`, `jest`; browser DevTools cookie inspection on `next dev`; full live verification with real Supabase during RT-009 (`LIVE VERIFIED` required before DONE).
- **External/live dependencies:** Supabase credentials (live sign-in path).

---

## WAVE 1 — Live Environment (BLOCKED until Supabase credentials)

### RT-007 — Supabase project setup: `.env`, apply migrations 001–007
- **Phase:** 1 · **Priority:** P0 · **Status:** BLOCKED
- **Objective:** Provision/attach a real Supabase project; create `.env.local` from `.env.example`; apply all 7 migrations; apply seed intentionally (after RT-064 seed fix).
- **Spec refs:** §28.5 database security, §28.10 environments, §30.2 gates; AGENTS.md rule 2 (verify the codebase/deployment).
- **Dependencies:** None technically; **blocked on: Supabase project URL + anon key + service-role key (user-supplied)**.
- **Files/areas likely affected:** `.env.local` (never committed), `supabase/migrations/001–007`, `supabase/seed.sql`, `package.json` (db scripts if added).
- **Acceptance criteria:**
  1. Migrations 001→007 apply cleanly in order on a fresh database.
  2. `.env.local` git-ignored; no secrets in source (`git status` clean of env files).
  3. 17 tables + RLS enabled + functions created (spot-check against audit table list).
- **Verification requirements:** Migration apply log; schema query output. → `LIVE VERIFIED`.
- **External/live dependencies:** **Supabase project credentials.**

### RT-008 — Run `verify_phase1.sql` + DB integration tests live
- **Phase:** 1 · **Priority:** P0 · **Status:** BLOCKED
- **Objective:** Execute `supabase/tests/verify_phase1.sql` (labels `PHASE1_DB_RLS_TEST_…`) and the gated suite `db.integration.test.ts` (13 tests) against RT-007's database; fix any failures found (spawns sub-tasks if broken).
- **Spec refs:** §28.5 RLS, §29.1 integration level, §32.2 business rules, §32.3 security.
- **Dependencies:** RT-007.
- **Files/areas likely affected:** `supabase/tests/verify_phase1.sql`, `tests/db.integration.test.ts` (or wherever it lives: `src/__tests__/db.integration.test.ts`), any migration fixes it exposes (new migration, never edit applied ones).
- **Acceptance criteria:**
  1. Zero `FAILED:` labels in `verify_phase1.sql` output.
  2. All 13 integration tests pass with `SUPABASE_TEST_*` env set.
  3. RLS proven: anon cannot read/write protected tables; role escalation blocked; order lifecycle + exactly-once stock deduction behave live.
- **Verification requirements:** Full script output + jest run log. → `LIVE VERIFIED`.
- **External/live dependencies:** RT-007 credentials.

### RT-009 — Live verification of auth, RBCAC, storage, RPCs
- **Phase:** 1 · **Priority:** P0 · **Status:** BLOCKED
- **Objective:** Live-verify RT-005/RT-006/RT-004 in a real browser: sign-in/out, password reset, admin role denial, evidence upload validation, zone-fee RPC, sale-price checkout.
- **Spec refs:** §19.1–19.2, §18.1, §28.6 uploads, §8.2 fees, §10.6 totals.
- **Dependencies:** RT-004, RT-005, RT-006, RT-007, RT-008.
- **Files/areas likely affected:** fixes spawned as sub-tasks; verification notes recorded in this file.
- **Acceptance criteria:**
  1. Customer can browse → add to cart → checkout (COD) → track order; order appears with correct sale-aware total.
  2. Admin can sign in; staff/super-admin boundaries hold; customer token cannot call `/api/admin/*`.
  3. Upload rejects >5MB / non-image / spoofed MIME.
  4. Delivery fee from DB zone config, not client input.
- **Verification requirements:** Browser session evidence + API response samples. → `LIVE VERIFIED` (required before Phase 1 can be declared complete).
- **External/live dependencies:** RT-007 credentials; SMTP for password-reset email (may remain partial — record honestly).

---

## WAVE 2 — Phase 1 Customer Experience Completion

### RT-010 — Homepage (all 15 spec sections)
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Replace the 10-line stub `src/app/page.tsx` with the full homepage per §5.1.
- **Spec refs:** §5.1 (15 sections: hero, category tiles, featured/recommended, best sellers, printing CTA, bulk CTA, delivery zones summary, reviews, trust badges, WhatsApp CTA, etc.), §5.2 UX philosophy, §27 visual system, §16.1 recommended products (uses `products.is_featured`), §1.3 core actions.
- **Dependencies:** RT-001 (build); benefits from RT-014 (search) and RT-043 (recommended rails), or may query `is_featured` directly.
- **Files/areas likely affected:** `src/app/page.tsx`, new `src/components/home/*`, `src/lib/products.ts` (featured queries), `src/locales/*.json` (per D-5).
- **Acceptance criteria:**
  1. All 15 sections present with real data (products from DB, reviews from `public_reviews`, zones from public API) and graceful empty/loading/error states.
  2. Responsive (§26), accessible (§25), bilingual if D-5 = keep.
  3. Lighthouse mobile perf ≥ budget in §24.3 (or documented deviation).
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; manual responsive/a11y spot-check; live render once RT-007 deploy path exists (`STATIC VERIFIED` → `LIVE VERIFIED`).
- **External/live dependencies:** DB data for realistic rendering.

### RT-011 — Global chrome: header, footer, mobile navigation drawer
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Spec-compliant persistent header/nav (§5.1.14), footer (§5.1.15), and a working mobile hamburger drawer (§26.3); links to all public pages; language switcher + cart count visible.
- **Spec refs:** §5.1.14–15, §26.3 mobile UX, §17.2 (admin nav is separate), §4.1.
- **Dependencies:** RT-010 (shared layout). Public-page links wired incrementally as RT-012–RT-014 land (no reverse dependency).
- **Files/areas likely affected:** `src/app/layout.tsx`, `src/app/(shop)/layout.tsx` or `src/app/shop/layout.tsx`, new `src/components/{Header,Footer,MobileNav}.tsx`, `LanguageSwitcher.tsx`.
- **Acceptance criteria:**
  1. Header: logo, primary nav, search entry (RT-014), cart w/ count, language toggle — no truncation at 360px.
  2. Footer: contact, hours, delivery/returns/FAQ/terms/privacy links, social (§23.9).
  3. Mobile drawer: keyboard accessible, focus-trapped, closes on Escape; zero layout shift (§24 CLS budget).
- **Verification requirements:** `tsc`, `lint`, `build`; manual mobile viewport + keyboard pass; axe spot-check (ties RT-026).
- **External/live dependencies:** None.

### RT-012 — Public information pages
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Create the seven missing §4.1 public pages with real, editable content.
- **Spec refs:** §4.1 (About, Visit Shop, Delivery Information, Returns & Refunds, FAQ, Terms, Privacy), §11 (returns content), §8 (delivery info), §23.3.
- **Dependencies:** RT-011 (nav/footer links); content ideally served from `business_settings`/content tables (RT-042/RT-046) — start with structured constants to avoid blocking.
- **Files/areas likely affected:** `src/app/(public)/{about,visit,delivery-info,returns,faq,terms,privacy}/page.tsx`, shared `PageHeader` component, `src/locales/*.json`.
- **Acceptance criteria:**
  1. Each route exists, statically generated where possible (`force-static`/`generateStaticParams` where sensible), with unique metadata (feeds RT-021).
  2. "Visit Shop" includes address, hours, contact, WhatsApp CTA, map placeholder (RT-025).
  3. Returns page text matches §11 behavior; delivery page matches §8 zones/fees.
  4. Empty/loading/error states irrelevant (static) but content-source failures degrade gracefully.
- **Verification requirements:** `tsc`, `lint`, `build`; route smoke test; link check from header/footer.
- **External/live dependencies:** None.

### RT-013 — Categories page
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Public categories listing per §4.1/§6.7 (tree, counts, visuals per §27.3) with drill-down to filtered products.
- **Spec refs:** §6.7, §4.1, §27.3.
- **Dependencies:** RT-011; category data exists (delivered with tasks.md T003).
- **Files/areas likely affected:** `src/app/shop/categories/page.tsx` (or `src/app/categories/`), `CategoryTile` component, `src/lib/categories.ts`, `ProductFilters` (top-level-only filter must drill into children).
- **Acceptance criteria:**
  1. Full tree renders with product counts; selecting a parent shows descendant products (fix current top-level-only limitation).
  2. Spec visual treatments per category type.
  3. Empty state when no categories/products.
- **Verification requirements:** `tsc`, `lint`, `jest` (add filter/ancestor-query test), `build`; live data check post-RT-007.
- **External/live dependencies:** DB categories data.

### RT-014 — Product search + autocomplete
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Implement §6.5 discovery: instant search, suggestions-as-you-type, filters (price, availability, rating, sort), full-text where supported.
- **Spec refs:** §6.5, §6.6 (card states), §17.2 (admin-side search is RT-040).
- **Dependencies:** RT-001; RT-011 (header search slot).
- **Files/areas likely affected:** new `src/components/SearchBar.tsx`, `src/app/shop/products/page.tsx`, `src/components/ProductFilters.tsx`, `src/lib/products.ts` (query/search function), possibly a migration for a search index/tsvector (Gin) if needed.
- **Acceptance criteria:**
  1. Typing shows debounced suggestions (name/category) with keyboard navigation (↑/↓/Enter) and proper ARIA combobox roles.
  2. Results page supports price/availability/rating filters + sort orders from §6.5.
  3. Server-side query (no client leak of unlisted products); empty state with recovery hints.
  4. Unit tests for the query builder.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; manual keyboard/ARIA pass; live search post-RT-007.
- **External/live dependencies:** DB data; full-text capability check on Supabase.

### RT-015 — Quick View on product cards
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** §6.6 hover/focus action opens a modal with gallery, variant selection, price, stock, add-to-cart — without page navigation.
- **Spec refs:** §6.6, §25 (focus trap, keyboard), §26 (touch: long-press fallback).
- **Dependencies:** RT-014 (cards). Uses existing cart context (RT-016 refines add-to-cart behavior afterward — no reverse dependency).
- **Files/areas likely affected:** `src/components/ProductCard.tsx`, new `src/components/QuickViewModal.tsx`, `cart-context.tsx`.
- **Acceptance criteria:** Modal traps focus, closes on Escape/backdrop, works on touch, shows variant prices (RT-004 semantics), disabled add-to-cart with stock=0.
- **Verification requirements:** `tsc`, `lint`, `jest` (cart interaction), `build`; keyboard/axe spot-check.
- **External/live dependencies:** None.

### RT-016 — Cart spec compliance
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Close §7.1 gaps: stock-aware quantity limits, clear add/remove feedback with "continue shopping" confirmation, variant display, totals correctness, empty-cart state, persistence edge cases (stale product/price changes on load).
- **Spec refs:** §7.1, §9.2 (stock), §6.3.
- **Dependencies:** RT-004 (pricing), RT-015.
- **Files/areas likely affected:** `src/lib/cart.ts`, `src/lib/cart-context.tsx`, `src/app/shop/cart/page.tsx`, `ProductCard.tsx`, `products/[id]/page.tsx`.
- **Acceptance criteria:**
  1. Quantity cannot exceed available stock (server-confirmed at add time; revalidated at checkout).
  2. Added-to-cart confirmation offers "Continue shopping" (spec §7.1) and reflects variant + sale price.
  3. Cart detects product deletion/price change on load and informs the user (no silent stale totals).
  4. Tests: add/remove/update/limit/persistence.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live check post-RT-007.
- **External/live dependencies:** DB for revalidation semantics.

### RT-017 — Checkout flow: explicit review step & order summary
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Restructure checkout into the §7.2 flow (cart review → delivery/pickup → details → payment → confirm) with a clear review step before order placement and complete final summary (items, fees, payment, address, hours).
- **Spec refs:** §7.2, §7.3 guest checkout, §8.1 pickup hours selection.
- **Dependencies:** RT-004, RT-016.
- **Files/areas likely affected:** `src/app/shop/checkout/page.tsx` (split into step components), `src/app/shop/order-confirmation/page.tsx`.
- **Acceptance criteria:**
  1. Review step shows exactly what will be charged (sale/variant aware) before submission.
  2. Final summary includes all §7.2 bullets; validation errors inline and accessible.
  3. Idempotent submission retained (existing `Idempotency-Key` behavior not regressed).
  4. Tests for step validation + payload building.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live COD checkout in RT-009.
- **External/live dependencies:** RT-007 for live checkout.

### RT-018 — Variant-aware cart & checkout (deep pricing correctness)
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Carry `variant_id` + variant price through cart → checkout → `/api/orders` → RPC so variant pricing is charged correctly (extends RT-004 to the full path; server remains source of truth).
- **Spec refs:** §6.3, §6.1, §10.6, CLAUDE.md principle 5.
- **Dependencies:** RT-004 (same code area — sequence carefully; consider merging execution with RT-004 if audits overlap).
- **Files/areas likely affected:** `src/lib/cart.ts`, `src/app/api/orders/route.ts`, `supabase/migrations` (only if RPC must accept variant lines — new migration), `tests` for orders route.
- **Acceptance criteria:**
  1. Order line items store variant_id; totals computed server-side from variant price / sale.
  2. Mismatch between client cart and server recompute rejected with friendly error.
  3. Integration test (live, RT-008) covers variant order.
- **Verification requirements:** `tsc`, `lint`, `jest`; live checkout (RT-009) → `LIVE VERIFIED`.
- **External/live dependencies:** Supabase (live).

### RT-019 — i18n completion (pending decision D-5)
- **Phase:** 1 · **Priority:** P2 (P1 if D-5 = keep) · **Status:** NOT STARTED (decision D-5 open)
- **Objective:** If bilingual is retained: full `t()` coverage (cart, checkout, tracking, auth, admin customer-facing strings), SSR-correct `lang`/`dir` attributes (no flash), remove or adopt `next-i18n-router` (currently installed, zero usage), Urdu translation review.
- **Spec refs:** **Not in `spec.md`** — PHASES.md Phase 1, tasks.md T009; §28.2 (no conflict); record deviation/approval in this file.
- **Dependencies:** RT-010–RT-018 (translate after structure stabilizes).
- **Files/areas likely affected:** `src/i18n.config.ts`, `src/locales/{en,ur}.json`, `src/app/layout.tsx` (lang/dir server), all consumer components, `next.config.js`, `package.json` (dep decision).
- **Acceptance criteria:** No hard-coded user-facing English in customer flows; `lang`/`dir` correct on first paint; RTL verified (§27/RTL CSS); unused dependency resolved.
- **Verification requirements:** `tsc`, `lint`, `build`; string-coverage grep script; manual RTL pass.
- **External/live dependencies:** Decision D-5.

### RT-020 — Order tracking & confirmation completeness
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Ensure §9.4 tracking (order ID + phone lookup, status timeline, WhatsApp fallback) and order confirmation page fully match spec, including guest access pattern.
- **Spec refs:** §9.4, §9.1, §7.2 final step.
- **Dependencies:** RT-017.
- **Files/areas likely affected:** `src/app/shop/order-confirmation/page.tsx`, `src/app/shop/track/page.tsx`, `src/app/api/orders/track/route.ts`.
- **Acceptance criteria:** Timeline renders all statuses with timestamps; wrong phone fails gracefully without leaking order existence; WhatsApp deep link with prefilled order ID.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live track test (RT-009).
- **External/live dependencies:** RT-007.

---

## WAVE 3 — SEO, Accessibility, Performance (T010 completion)

### RT-021 — Site metadata, OG/Twitter cards, canonical, JSON-LD
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Per-page metadata across public routes; OG/Twitter images; canonical tags; LocalBusiness + Organization JSON-LD per §23.6.
- **Spec refs:** §23.3, §23.4, §23.6, §23.9.
- **Dependencies:** RT-010, RT-012 (pages must exist first).
- **Files/areas likely affected:** `src/app/layout.tsx` (base metadata, `metadataBase`), per-page `generateMetadata`, new `src/lib/seo.ts` (JSON-LD helpers), `public/` (OG image).
- **Acceptance criteria:** Every public route has unique title/description/canonical/OG; JSON-LD validates (Rich Results test); no `metadata` exports on admin routes (paired with RT-024).
- **Verification requirements:** `build`; HTML output assertions (unit test on serialized metadata); validator tool run.
- **External/live dependencies:** Production URL for canonical (may start relative + fix in RT-057).

### RT-022 — sitemap, robots, manifest, favicon/icons
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** `src/app/sitemap.ts`, `src/app/robots.ts`, web manifest, favicon + touch icons, PWA basics if trivial; admin routes excluded from crawl.
- **Spec refs:** §23.11, §23.10, §27.6 (brand visuals).
- **Dependencies:** RT-012, RT-021.
- **Files/areas likely affected:** `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/manifest.ts`, `public/*` (new dir), `src/app/layout.tsx` (icon links).
- **Acceptance criteria:** Sitemap includes all public routes, excludes `/admin`; robots allows public, disallows admin; icons render in browser tabs.
- **Verification requirements:** `build`; fetch `/sitemap.xml` + `/robots.txt` locally in `next start`.
- **External/live dependencies:** Domain (post-deploy final check).

### RT-023 — Dynamic SEO: product pages, breadcrumbs, image alt pass
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** `generateMetadata` for product detail (name/price/OG image), breadcrumbs (visual + BreadcrumbList JSON-LD), full alt-text audit for all product images (§23.12), image dimensions to prevent CLS.
- **Spec refs:** §23.4, §23.6, §23.12, §24 (CLS).
- **Dependencies:** RT-021.
- **Files/areas likely affected:** `src/app/shop/products/[id]/page.tsx`, `src/lib/seo.ts`, `ProductCard.tsx`, admin product form (alt-text input if missing).
- **Acceptance criteria:** Product page metadata generated from DB (incl. sale price); ≥95% informative alts (manual review); `width/height` on all images; no `next/image` warnings in build.
- **Verification requirements:** `build` output review; alt audit checklist recorded in this file.
- **External/live dependencies:** None.

### RT-024 — Indexing hygiene (admin noindex, internal search safety)
- **Phase:** 1 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** All `/admin/*` and auth routes return `noindex`; internal search/tracking query URLs canonicalized so they don't create index bloat (§23.10).
- **Spec refs:** §23.10.
- **Dependencies:** RT-021.
- **Files/areas likely affected:** `src/app/admin/layout.tsx` (metadata `robots: {index:false}`), login/reset pages, `sitemap.ts` exclusion rules.
- **Acceptance criteria:** `noindex` present on admin + auth HTML; sitemap contains only canonical public URLs.
- **Verification requirements:** `build`; HTML grep assertions (unit test).
- **External/live dependencies:** None.

### RT-025 — Google Maps embed on Visit Shop (decision D-6)
- **Phase:** 1 · **Priority:** P2 · **Status:** NOT STARTED (decision D-6 open)
- **Objective:** Embedded map with directions on Visit Shop / homepage per §23.8.
- **Spec refs:** §23.8, §4.1 (Visit Shop).
- **Dependencies:** RT-012.
- **Files/areas likely affected:** `src/app/(public)/visit/page.tsx`, new `src/components/MapEmbed.tsx`, env for API key if D-6 = JS API.
- **Acceptance criteria:** Map renders, lazy-loaded (perf §24.2), keyboard-accessible fallback link "Open in Google Maps".
- **Verification requirements:** `build`; visual check.
- **External/live dependencies:** Possibly Maps API key (if D-6 requires billing).

### RT-026 — Accessibility: fixes + WCAG 2.2 AA audit
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Implement §25 requirements: `:focus-visible` styles, `prefers-reduced-motion` (§27.9), color contrast §25.3, skip link, landmarks, form labels/errors, then run automated + manual audit and fix findings.
- **Spec refs:** §25.1–25.4, §27.9, §26.
- **Dependencies:** RT-010–RT-017 (audit after features exist); RT-055 adds automation later.
- **Files/areas likely affected:** `src/app/globals.css`, layouts, all interactive components, checkout forms.
- **Acceptance criteria:** No axe critical/serious issues on key templates (home, list, detail, cart, checkout, track, admin login); focus-visible everywhere; reduced-motion honored; contrast ≥ 4.5:1; manual keyboard pass recorded.
- **Verification requirements:** axe run output attached to task record; checklist vs §25.2. `STATIC VERIFIED` (tooling) — note: real screen-reader pass is manual/blocked on tooling.
- **External/live dependencies:** Axe/lighthouse tooling (npm, no account needed).

### RT-027 — Performance budgets & optimization
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Meet §24.3 budgets (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, JS ≤200KB, TTFB ≤200ms on prod): code-split admin, optimize fonts (§27.5), image optimization config, remove dead deps (`next-i18n-router` per RT-019), measure.
- **Spec refs:** §24.1–24.3, §24.2 architecture.
- **Dependencies:** RT-001 (build must exist), RT-010–RT-018 (measure after features), RT-057 for production numbers (mark budgets `STATIC VERIFIED` via Lighthouse CI first).
- **Files/areas likely affected:** `next.config.js`, `src/app/layout.tsx` (fonts), component lazy-loading, `package.json`.
- **Acceptance criteria:** Lighthouse mobile ≥ targets on home/list/detail/cart; bundle report shows admin chunks separate from customer chunks; budgets documented in this file.
- **Verification requirements:** Lighthouse runs (stored reports); `next build` bundle stats.
- **External/live dependencies:** Production deploy for true TTFB (RT-057).

---

## WAVE 4 — Online Payments (decision-blocked)

### RT-028 — Payment provider decision & credentials
- **Phase:** 1 · **Priority:** P2 · **Status:** BLOCKED (decision **D-1**)
- **Objective:** Select gateway per §10.3 (JazzCash/Easypaisa online), obtain merchant credentials, agree webhook URL/domain; document integration contract (§10.6 verification rules).
- **Spec refs:** §10.3, §10.6, §28.10 environments.
- **Dependencies:** None (can proceed in parallel with Waves 2–3).
- **Files/areas likely affected:** `.env.example` (add documented vars only — no secrets), this file (decision record).
- **Acceptance criteria:** Provider chosen, credentials in hand, webhook endpoint plan documented.
- **Verification requirements:** Decision record + credential provision confirmed by user.
- **External/live dependencies:** **Payment provider account (user-supplied).**

### RT-029 — Gateway integration + webhook verification
- **Phase:** 1 · **Priority:** P2 · **Status:** BLOCKED (deps: D-1, RT-028)
- **Objective:** Implement online payment intent, server-side verification (never trust client), signed webhook receiver → payment status transitions (§10.5), refund path per §11.3; wire `PAYMENT_WEBHOOK_SECRET` (currently unused).
- **Spec refs:** §10.3, §10.5, §10.6, §11.3, CLAUDE.md principle 5.
- **Dependencies:** RT-028, RT-004 (totals correctness).
- **Files/areas likely affected:** `src/app/api/payments/*`, `src/lib/payments.ts`, `supabase/migrations` (webhook events table/idempotency), admin payments UI, `.env.example`.
- **Acceptance criteria:**
  1. Payment confirmed only after server-side signature/amount check.
  2. Webhooks idempotent (duplicate delivery safe); replayed/invalid signatures rejected 401.
  3. Paid order unlocks `pending_payment→received`; failed shows retry; refunds admin-recorded with reference.
  4. Security tests: forged webhook, amount tampering, replay.
- **Verification requirements:** `tsc`, `lint`, `jest` (signature tests), live sandbox gateway run → `LIVE VERIFIED` required for DONE.
- **External/live dependencies:** Gateway sandbox + credentials + publicly reachable webhook URL (needs RT-057).

---

## WAVE 5 — Returns/Refunds & Phase 4 Fulfillment

### RT-030 — Returns & damaged-product customer flow
- **Phase:** 1/4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §11.1–11.2 customer-facing return/damage report (WhatsApp-assisted per spec, plus structured request capture), status visibility for the customer.
- **Spec refs:** §11.1, §11.2, §11.4 (stock return semantics), §4.1 (Returns page — content in RT-012).
- **Dependencies:** RT-012 (returns page), RT-008 (stock functions verified live).
- **Files/areas likely affected:** `src/app/api/returns/*` (new), `src/app/shop/track/return` UI or modal, new migration for `return_requests` (design first), admin via RT-031.
- **Acceptance criteria:** Request requires order + reason + photo (damaged); stock returned via server function exactly once (§11.4); statuses match §11.3; default-deny RLS.
- **Verification requirements:** `tsc`, `lint`, `jest`; live test with RT-008 (`LIVE VERIFIED`).
- **External/live dependencies:** RT-007.

### RT-031 — Admin Returns/Refunds page (replace placeholder)
- **Phase:** 4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace `SectionPlaceholder` at `src/app/admin/refunds/page.tsx` with §11.3 workflow: approve/reject, refund processing, stock restoration, activity logging.
- **Spec refs:** §11.3, §11.4, §17.2 (Refunds admin nav).
- **Dependencies:** RT-030, RT-006 (admin auth solid).
- **Files/areas likely affected:** `src/app/admin/refunds/page.tsx`, `src/app/api/admin/refunds/*`, RPC migration if needed, `activity_logs`.
- **Acceptance criteria:** Admin sees all requests with order context; actions enforced server-side (§5 CLAUDE); stock restored exactly once; audit trail written; role-gated (`requireAdmin`).
- **Verification requirements:** `tsc`, `lint`, `jest`; live admin flow (RT-009 extension).
- **External/live dependencies:** RT-007.

### RT-032 — Delivery operations: schedule, reports, picking list
- **Phase:** 4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Admin delivery date/time schedule view, daily route/report, picking list for order assembly (spec §17.2 delivery nav + Phase 4 goals).
- **Spec refs:** Phase 4 (PHASES.md), §17.2, §9.1 statuses (ready/out_for_delivery).
- **Dependencies:** RT-007 (data), RT-040 (order list APIs reused).
- **Files/areas likely affected:** `src/app/admin/delivery/page.tsx` (or schedule subpages), `src/app/api/admin/delivery/*`, exports (CSV).
- **Acceptance criteria:** Date-filtered schedule; printable picking list; CSV export; status transitions reuse `transition_order_status` (no parallel logic).
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live data check.
- **External/live dependencies:** RT-007.

### RT-033 — Failed delivery handling & customer notification options
- **Phase:** 4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Failed-delivery sub-flow (re-attempt/return-to-sender), notification settings for status events (WhatsApp deep links / configurable channels — no SMTP assumption), per PHASES Phase 4.
- **Spec refs:** §9.1 (statuses), §13.6 (WhatsApp pattern), §20.1 (admin notifications), §21.4 (contact/notification settings).
- **Dependencies:** RT-032; RT-042 (settings storage).
- **Files/areas likely affected:** admin delivery UI, order APIs, `business_settings`, status-transition RPC (new migration if status added — coordinate with §9.1 status list; prefer existing `cancelled` + activity notes if spec forbids new statuses).
- **Acceptance criteria:** Failed attempt recorded with reason; customer-visible next steps (WhatsApp); no status outside spec §9.1 list without spec amendment (flag conflict if needed).
- **Verification requirements:** `tsc`, `lint`, `jest`; live simulation.
- **External/live dependencies:** RT-007; optional WhatsApp Business API (spec allows link-based fallback).

---

## WAVE 6 — Phase 3: Printing & Bulk Orders

### RT-034 — Data model redesign: `printing_requests` + `bulk_requests`
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace/migrate the spec-mismatched `order_requests` (001: `order_id NOT NULL`, statuses `pending/approved/rejected`) with models that support §12.3 and §13.4 workflows (`Requested → Processing → Ready → Completed/Cancelled`), standalone request IDs, file uploads (§13.3), pricing (§13.2), and default-deny RLS.
- **Spec refs:** §12.1–12.3, §13.1–13.5, §28.5 (RLS), §28.6 (upload security).
- **Dependencies:** RT-007 (migrations environment), RT-008 (RLS test harness to extend).
- **Files/areas likely affected:** new migrations (never edit applied 001–007), `supabase/tests/verify_phase1.sql` (extend), admin placeholder pages (later RT-039).
- **Acceptance criteria:** Tables + enums + RLS (default-deny) + transition RPCs with admin checks; existing `product_requests` untouched; migration reversible documented; SQL injection-safe RPCs.
- **Verification requirements:** Migration apply + new RLS assertions in integration suite → `LIVE VERIFIED` at RT-008 run.
- **External/live dependencies:** RT-007.

### RT-035 — Printing hub + service pages (customer)
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED (scope confirmation: D-4)
- **Objective:** Public Printing Hub landing, service pages (business cards, banners, copies, etc. §13.1), pricing (§13.2), SEO per §23.5 (local intent keywords §23.2).
- **Spec refs:** §4.1, §13.1–13.2, §23.5, §23.2.
- **Dependencies:** RT-011 (chrome), RT-012 (page patterns).
- **Files/areas likely affected:** `src/app/printing/**`, `src/lib/printing.ts` (services config or DB-driven), `src/locales`.
- **Acceptance criteria:** Routes live with unique metadata/JSON-LD (`Service`/`Product` schema); pricing editable (DB or settings, coordinate RT-043); WhatsApp CTA §13.6.
- **Verification requirements:** `tsc`, `lint`, `build`; schema validation.
- **External/live dependencies:** None.

### RT-036 — Customer printing request submission (+ file upload, WhatsApp)
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §13.3 request form (files, quantity, size/material, deadline), uploads to private bucket with §28.6 validation, creates row via RLS-safe insert, WhatsApp handoff §13.6, confirmation with request ID.
- **Spec refs:** §13.3, §13.6, §28.6, §28.4 validation.
- **Dependencies:** RT-034, RT-006 (upload verification), RT-009 (upload live tests as template).
- **Files/areas likely affected:** `src/app/printing/request/page.tsx`, `src/app/api/printing-requests/*`, `src/lib/uploads.ts` (reuse evidence-upload validation), storage bucket policies (migration).
- **Acceptance criteria:** Files ≤25MB, type-whitelisted, virus-risk mitigations as spec allows; request created with status `Requested`; anonymous + authenticated both allowed if spec says so (§13.3 default-deny RLS vs anonymous insert — resolve: use service-role API insert with validation, matching `product_requests` pattern).
- **Verification requirements:** `tsc`, `lint`, `jest` (validation), live upload test.
- **External/live dependencies:** RT-007 storage.

### RT-037 — Bulk order customer form
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED (scope: D-4)
- **Objective:** §12.2 form: product/category, quantity, target price, deadline, contact, notes; eligibility messaging (§12.1); confirmation with request ID.
- **Spec refs:** §12.1–12.3, §14 pattern (reuse request UX).
- **Dependencies:** RT-034, RT-035 (linked from printing/bulk pages).
- **Files/areas likely affected:** `src/app/bulk-orders/page.tsx`, `src/app/api/bulk-requests/*`, translations.
- **Acceptance criteria:** Validation server-side; status workflow per §12.3; default-deny RLS; admin notified via dashboard synthesized notifications (§20.1).
- **Verification requirements:** `tsc`, `lint`, `jest`; live submit.
- **External/live dependencies:** RT-007.

### RT-038 — Printing request tracking page
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §13.5: customer tracks printing request by request ID (+ phone), sees workflow statuses and quote/notes; WhatsApp for questions.
- **Spec refs:** §13.5, §13.4.
- **Dependencies:** RT-034, RT-036.
- **Files/areas likely affected:** `src/app/printing/track/page.tsx`, `src/app/api/printing-requests/track/route.ts`.
- **Acceptance criteria:** Status timeline; no data leak on wrong ID (generic error); printable proof approval link if §13.4 proof step implemented (confirm spec reading at implementation time).
- **Verification requirements:** `tsc`, `lint`, `jest`; live tracking.
- **External/live dependencies:** RT-007.

### RT-039 — Admin Printing Requests & Bulk Orders pages (replace placeholders)
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace `SectionPlaceholder`s at `src/app/admin/printing-requests/page.tsx` and `src/app/admin/bulk-orders/page.tsx` with full queues: filter by status, view details/files, transition workflow, quote, notes, customer contact, activity logging.
- **Spec refs:** §12.3, §13.4, §17.2, §18.1 role gating.
- **Dependencies:** RT-034, RT-036, RT-037.
- **Files/areas likely affected:** both placeholder pages, `src/app/api/admin/printing/*`, `src/app/api/admin/bulk/*`, RPC migration (transitions).
- **Acceptance criteria:** All §12.3/§13.4 statuses transitionable with server-side validation; file download signed-URL (private bucket); `requireAdmin` on every route; dashboard notification when requests pending (§20.1).
- **Verification requirements:** `tsc`, `lint`, `jest`; live workflow run.
- **External/live dependencies:** RT-007.

---

## WAVE 7 — Phase 2 Remainder: Admin Power Features & Analytics

### RT-040 — Advanced order search, filters, bulk status updates, export
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §17.2: search by order ID/customer/phone/date range/status/payment; bulk status updates with per-row transition validation; CSV export; manual phone-order creation (admin takes order via call).
- **Spec refs:** §17.2, §9.1 lifecycle (transitions only via validated path), §18.1.
- **Dependencies:** RT-007, RT-006 (admin auth stable).
- **Files/areas likely affected:** `src/app/admin/orders/page.tsx`, `src/app/api/admin/orders/*`, order APIs, tests for bulk update.
- **Acceptance criteria:** Bulk updates run through per-order validation (no bulk SQL bypassing lifecycle guards); export matches filters; manual orders enforce stock + totals like customer orders; rate-limited.
- **Verification requirements:** `tsc`, `lint`, `jest`, live admin run.
- **External/live dependencies:** RT-007.

### RT-041 — Product & revenue analytics (replace Analytics placeholder)
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §22.1: best sellers, revenue (daily/weekly/monthly), sales by category/method/status, stock alerts, activity log summary; replace `src/app/admin/analytics/page.tsx` placeholder.
- **Spec refs:** §22.1, §17.1 (dashboard widgets may link in).
- **Dependencies:** RT-007, RT-040 (order data APIs).
- **Files/areas likely affected:** `src/app/admin/analytics/page.tsx`, `src/app/api/admin/analytics/*`, aggregation SQL/RPC migration, chart components (existing charts in dashboard lib reused).
- **Acceptance criteria:** Aggregates computed in DB (not client-side over full tables); empty/no-data states; date-range inputs; `requireAdmin`; consistent with dashboard numbers.
- **Verification requirements:** `tsc`, `lint`, `jest` (RPC aggregation tests live-gated), live spot-check vs raw SQL.
- **External/live dependencies:** RT-007 (and RT-008 test extensions).

### RT-042 — Business settings UI + wire `business_settings`
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §21.4: admin UI for store name, hours, address, contact, WhatsApp number, COD/enabled payment methods, delivery fee overrides, about/delivery/returns/FAQ content blocks; read via a cached server helper used by storefront.
- **Spec refs:** §21.4, §20.1 (contact/notification settings), §5.1 (homepage consumes settings), §8.2.
- **Dependencies:** RT-007 (table exists: `business_settings`), RT-012 (pages consume content), RT-046 coordinates scope (content vs settings split).
- **Files/areas likely affected:** `src/app/admin/settings/*` (extend), `src/app/api/admin/settings/*`, new `src/lib/business-config.ts` (extend existing WhatsApp helper), storefront pages (home, visit, footer).
- **Acceptance criteria:** Zero code currently references `business_settings` → after task, storefront contact/hours/WhatsApp come from DB with in-memory TTL cache; super-admin-only writes; validation (phone/URL/JSON); activity log on change.
- **Verification requirements:** `tsc`, `lint`, `jest`, live edit → storefront reflects change.
- **External/live dependencies:** RT-007.

### RT-043 — Recommended products (§16) admin + storefront
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §16.1: admin marks products recommended (`is_featured` already in schema); homepage/product rails display them; ordering control per §16.1.
- **Spec refs:** §16.1, §5.1 (homepage section), §6.1.
- **Dependencies:** RT-010 (homepage rails), RT-042 (optional ordering setting).
- **Files/areas likely affected:** `src/app/admin/analytics` or products list (toggle), `ProductForm`, `src/lib/products.ts` (featured query), home components.
- **Acceptance criteria:** Flag togglable by admin; storefront rail respects flag + availability (never shows out-of-stock as recommended); empty state.
- **Verification requirements:** `tsc`, `lint`, `jest`, live toggle → storefront.
- **External/live dependencies:** RT-007.

### RT-044 — Activity log export & retention
- **Phase:** 2 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** §21.1: CSV export of filtered activity logs; retention/cleanup job per §21.1 (confirm duration in spec at implementation).
- **Spec refs:** §21.1, §18.1 (super-admin only).
- **Dependencies:** RT-007.
- **Files/areas likely affected:** `src/app/admin/activity/page.tsx`, `src/app/api/admin/activity/export/route.ts`.
- **Acceptance criteria:** Export matches active filters; rate-limited; role-gated; no secret fields in export.
- **Verification requirements:** `tsc`, `lint`, `jest`; live export.
- **External/live dependencies:** RT-007.

### RT-045 — Customer data deletion workflow (§21.3)
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §21.3 GDPR/privacy-aligned customer data deletion/anonymization (orders retained for accounting per spec wording) with super-admin confirmation, activity logging, storage cleanup.
- **Spec refs:** §21.3, §28.7 customer data, §11.4 (order history integrity).
- **Dependencies:** RT-007, RT-021 (privacy page references the process).
- **Files/areas likely affected:** `src/app/admin/customers/[id]` actions, `src/app/api/admin/customers/[id]/*`, RPC migration (anonymize function), storage cleanup.
- **Acceptance criteria:** Server-side `anonymize_customer` RPC; PII scrubbed (name/phone/email) while orders/financials preserved; double confirmation; audit entry; RLS-safe.
- **Verification requirements:** `tsc`, `lint`, `jest` (live-gated RPC test), live run on test data.
- **External/live dependencies:** RT-007.

---

## WAVE 8 — Phase 5: Content, SEO Administration, Marketing Integrations

### RT-046 — Website content management (replace placeholder)
- **Phase:** 5 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace `src/app/admin/website-content/page.tsx` placeholder: editable homepage blocks (hero copy/images, banners, announcements) per §21.4, draft/publish, image upload to public bucket with validation.
- **Spec refs:** §21.4, §5.1, §28.6 uploads.
- **Dependencies:** RT-042 (settings infra), RT-010 (homepage consumes), RT-043 (overlaps content rails — sequence after to avoid conflict).
- **Files/areas likely affected:** placeholder page, `src/app/api/admin/content/*`, content tables (new migration or JSONB in `business_settings`), homepage components (data source switch).
- **Acceptance criteria:** Admin can edit/publish hero + banners without code deploys; storefront renders published content only; upload validation; cache invalidation on publish; `requireSuperAdmin` or `requireAdmin` per §18.1 (confirm matrix).
- **Verification requirements:** `tsc`, `lint`, `jest`, live publish cycle.
- **External/live dependencies:** RT-007 storage.

### RT-047 — SEO administration (§23.13)
- **Phase:** 5 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Admin controls for default meta templates, per-page overrides (products/services), sitemap regen triggers, verification tags (GSC/TBSC meta).
- **Spec refs:** §23.13, §23.10, §23.7.
- **Dependencies:** RT-021–RT-024 (base SEO implemented first).
- **Files/areas likely affected:** `src/app/admin/seo/page.tsx` (new), content tables, `src/lib/seo.ts`.
- **Acceptance criteria:** Meta overrides flow into `generateMetadata`; verification meta tag served site-wide; sitemap reflects published URLs.
- **Verification requirements:** `tsc`, `lint`, `build` + HTML assertions.
- **External/live dependencies:** GSC account (for verification confirm — user, later).

### RT-048 — Analytics integrations (GA, Search Console)
- **Phase:** 5 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** §22.1: Google Analytics + Search Console integration (IDs from settings, script injected only with ID present), consent handling if required, admin-facing link panel.
- **Spec refs:** §22.1, §24.2 (no render-blocking), §28.10.
- **Dependencies:** RT-042 (settings), RT-057 (production domain for verification).
- **Files/areas likely affected:** `src/app/layout.tsx` or analytics provider component, settings API, admin settings page.
- **Acceptance criteria:** No GA script when ID unset; script loads deferred; GTM/GSC verification meta from RT-047.
- **Verification requirements:** `tsc`, `lint`, `build`; live tag check post-deploy.
- **External/live dependencies:** GA/GSC accounts + production URL.

---

## WAVE 9 — Security Hardening

### RT-049 — Serverless-safe rate limiting
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace in-memory `Map` rate limiter with an Upstash-style/DB-backed or Supabase-table-backed limiter so limits hold across Vercel lambda instances; extend coverage to all mutating routes (12 admin GETs optional per risk review).
- **Spec refs:** §28.3 API security, §19.1 (login throttling), §28.11 logging.
- **Dependencies:** RT-007 (if DB-backed), RT-001.
- **Files/areas likely affected:** `src/lib/rate-limit.ts`, all API routes calling `enforceRateLimit`, migration (if table), tests.
- **Acceptance criteria:** Concurrent-instance behavior documented and tested; login/order/upload/review limits demonstrably enforced under bursts; no regression to legit flows (limits documented).
- **Verification requirements:** `tsc`, `lint`, `jest` (fake timers/single-instance) + live burst test (RT-009 extension).
- **External/live dependencies:** Possibly Upstash account (choose free tier) or Supabase table.

### RT-050 — Security headers & CSP
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** `next.config.js` `headers()`: CSP (allow Supabase + WhatsApp + Maps per RT-025), HSTS, X-Frame-Options/`frame-ancestors`, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.
- **Spec refs:** §28.3, §28.4, §6.2 (image hosts), §23.8 (Maps).
- **Dependencies:** RT-001, RT-025 (CSP must allow embeds), RT-048 (GA script origin).
- **Files/areas likely affected:** `next.config.js`; verify no inline-script breakage (Next needs `'unsafe-inline'` for hydration or nonce strategy — document choice).
- **Acceptance criteria:** Headers present in `next start` response; CSP does not break app (manual smoke of home/checkout/admin); report-only phase optional then enforce.
- **Verification requirements:** `build` + `curl -I` assertions; manual smoke.
- **External/live dependencies:** Production header check post-deploy.

### RT-051 — Dependency vulnerability remediation (decision D-3)
- **Phase:** 6 · **Priority:** P2 · **Status:** BLOCKED (decision **D-3**)
- **Objective:** Clear `npm audit` (46 vulns incl. 1 critical via `next@14.2.35`): plan staged majors (Next 16, Jest 30, ESLint-Config-Next 16, Tailwind 4) or validated overrides; keep all gates green after each bump.
- **Spec refs:** §28.1 stack, §29.1 (tests guard upgrades), §32.3 security.
- **Dependencies:** RT-001, RT-003 (CI to catch upgrade regressions); prefer landing RT-053/RT-054 E2E first as a safety net, otherwise accept narrower risk in coordination with the user.
- **Files/areas likely affected:** `package.json`, `package-lock.json`, config files (`next.config.js`, `tailwind.config`, `jest.config`, `.eslintrc`), source fixes for breaking changes.
- **Acceptance criteria:** `npm audit` zero critical/high (moderate documented); all gates green; app smoke passes; no unrelated refactors mixed in.
- **Verification requirements:** Full gate suite + E2E (if already present) per upgrade commit.
- **External/live dependencies:** Decision D-3.

### RT-052 — Security test suite & review (§29.1 security tests)
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Automated checks: RBAC denials (customer token → admin API 403), RLS anon checks, upload bypass attempts, IDOR on order/track endpoints, injection attempts in search/order fields, webhook forgery (once RT-029).
- **Spec refs:** §29.1 (security testing), §32.3, §18.1, §28.4–28.6.
- **Dependencies:** RT-008 (live DB), RT-006, RT-009; extend with RT-029/RT-030 as they land.
- **Files/areas likely affected:** `src/__tests__/security/*` (new), integration suite, CI job.
- **Acceptance criteria:** Suite runs in CI (live-gated where needed, skipped cleanly without creds); documented threat checklist vs §32.3 signed off.
- **Verification requirements:** Suite run logs; checklist artifact in this file.
- **External/live dependencies:** RT-007 credentials for live portion.

---

## WAVE 10 — End-to-End & Quality Automation

### RT-053 — E2E: customer journey
- **Phase:** 1/6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Playwright (or project-approved E2E tool — confirm no new-framework rule; Playwright is new tooling → get user approval per AGENTS.md rule 3) covering: browse → filter/search → detail → cart → checkout (COD) → track; printing/bulk submits once Wave 6 lands.
- **Spec refs:** §29.1 (E2E), §29.2 timeline, §32.1 functional.
- **Dependencies:** RT-010–RT-020 (features must exist), RT-007 (local/staging DB), tooling approval.
- **Files/areas likely affected:** `playwright.config.ts` (new), `e2e/*.spec.ts`, CI job, `package.json`.
- **Acceptance criteria:** Green run against staging/local with seeded data; covers §32.2 business-rule smoke (sale-price checkout, stock limit); CI job added.
- **Verification requirements:** Playwright report; CI run.
- **External/live dependencies:** RT-007; user approval for new tooling.

### RT-054 — E2E: admin journey
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Login → dashboard → product CRUD → order lifecycle transitions → payment verify/refund → review moderation → (Wave 6) printing/bulk workflows.
- **Spec refs:** §29.1, §32.10 admin workflows.
- **Dependencies:** RT-053 (harness), RT-040 (admin features).
- **Files/areas likely affected:** `e2e/admin/*.spec.ts`, CI.
- **Acceptance criteria:** Lifecycle test asserts stock deduction exactly-once and status guard rails fail-closed (negative tests).
- **Verification requirements:** Playwright report; CI.
- **External/live dependencies:** RT-007.

### RT-055 — Automated accessibility tests (axe)
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** axe-core in CI over key templates (extends RT-026 manual audit); fail build on critical regressions.
- **Spec refs:** §25.4 (testing & verification).
- **Dependencies:** RT-026, RT-053 (harness reuse).
- **Files/areas likely affected:** e2e a11y specs, CI.
- **Acceptance criteria:** Zero critical/serious violations on agreed templates; report archived.
- **Verification requirements:** axe reports in CI.
- **External/live dependencies:** None.

### RT-056 — Performance CI budgets (Lighthouse)
- **Phase:** 6 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** Lighthouse CI against budgets §24.3 on home/list/detail/cart; fail on regression.
- **Spec refs:** §24.3, §29.1 (performance testing).
- **Dependencies:** RT-027, RT-053 (staging target).
- **Files/areas likely affected:** `lighthouserc.json`, CI.
- **Acceptance criteria:** Budgets pass on staging; trend stored.
- **Verification requirements:** Lighthouse CI results.
- **External/live dependencies:** Staging URL.

---

## WAVE 11 — Deployment & Operations (BLOCKED on external access)

### RT-057 — Production deployment (Vercel) & environment configuration
- **Phase:** 6 · **Priority:** P1 · **Status:** BLOCKED
- **Objective:** Provision/attach Vercel project; configure all §28.10 env vars (Supabase URL/anon/service-role, WhatsApp, payment keys post-RT-029, site URL); deploy green build to production domain; verify.
- **Spec refs:** §28.9 hosting & deployment, §28.10 environments, §28.3 (headers live), §23.11 sitemap at domain.
- **Dependencies:** RT-001, RT-003, RT-007, RT-050, RT-051 (or documented acceptance of audit risk), RT-053 (E2E safety net before cutover, if landed).
- **Files/areas likely affected:** Vercel dashboard (external), `.env.example` docs, possibly `vercel.json`.
- **Acceptance criteria:**
  1. Production URL serves 200 on `/`, shop, tracking; `/admin` login works with prod Supabase.
  2. No secrets in repo; env vars scoped per §28.10.
  3. CI green on the deployed commit; rollback procedure documented.
- **Verification requirements:** Live HTTPS checks (`LIVE VERIFIED`): headers, cookies Secure, sitemap/robots fetch, Core Web Vitals field/lab.
- **External/live dependencies:** **Vercel account, production domain, Supabase prod project.**

### RT-058 — Domain, DNS, SSL, WhatsApp click-to-chat live verification
- **Phase:** 6 · **Priority:** P1 · **Status:** BLOCKED
- **Objective:** Production domain DNS + SSL valid; WhatsApp deep links (`wa.me`) resolve with prefilled messages from live site; Google Business Profile setup if D/user pursues §23.7.
- **Spec refs:** §23.3, §23.7, §13.6, §5.1 WhatsApp CTAs.
- **Dependencies:** RT-057, RT-042 (WhatsApp number from settings).
- **Files/areas likely affected:** DNS records (external), `business_settings`, verification docs.
- **Acceptance criteria:** TLS valid; WhatsApp links open correct number/message; GBP listing claimed (or explicitly deferred with user sign-off).
- **Verification requirements:** Live browser + phone check (`LIVE VERIFIED`).
- **External/live dependencies:** Domain registrar, WhatsApp, Google Business Profile.

### RT-059 — Monitoring, logging, error reporting
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §28.11 logging (structured, no PII/secrets in logs), Sentry (or approved equivalent) for frontend/API errors, uptime check, alert channel (WhatsApp/email), admin activity-log health dashboard linkage.
- **Spec refs:** §28.11, §22.1 monitoring, §32.3.
- **Dependencies:** RT-057 (production), tooling approval if new service.
- **Files/areas likely affected:** `src/lib/*logger*`, `sentry.client.config.ts`/`next.config.js` (if Sentry), CI, admin dashboard panel.
- **Acceptance criteria:** Error in staging triggers captured report with release tag; logs scrubbed of tokens/PII; uptime alert configured.
- **Verification requirements:** Test error event observed live; log sample review.
- **External/live dependencies:** Sentry account (or choice of alternative).

### RT-060 — Backups & recovery
- **Phase:** 6 · **Priority:** P2 · **Status:** BLOCKED (needs RT-007)
- **Objective:** Enable Supabase PITR/scheduled backups per project scale; document + test restore procedure (§32 audit expectations; Phase 6 goals).
- **Spec refs:** Phase 6 (PHASES.md), §28.10, §32.11.
- **Dependencies:** RT-007.
- **Files/areas likely affected:** Supabase dashboard (external), `docs/runbook-backup.md` (new, fits §31 intent).
- **Acceptance criteria:** Backup enabled; restore drill documented with RPO/RTO stated.
- **Verification requirements:** Backup snapshot exists; drill log (`LIVE VERIFIED`).
- **External/live dependencies:** Supabase plan features.

### RT-061 — Runbooks & incident process
- **Phase:** 6 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** Operations docs: deploy/rollback, payment webhook replay, order data corrections, RLS policy change procedure, incident checklist (§28.11, §31).
- **Spec refs:** §31 documentation artifacts, §28.11, §30.2 gates.
- **Dependencies:** RT-057, RT-059.
- **Files/areas likely affected:** `docs/` (new runbooks).
- **Acceptance criteria:** Each runbook has verified steps (executed at least once for deploy/rollback).
- **Verification requirements:** Document review + one drill.
- **External/live dependencies:** Production access.

---

## WAVE 12 — Documentation Truth & Final Production Gate

### RT-062 — Reconcile stale documentation with reality
- **Phase:** 6 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Correct every false claim identified by the audit: `PHASES.md` ("Phase 1 Complete", "25 tests", Quick View/Search/gateway/bcrypt/HttpOnly claims), `PHASE1_VERIFICATION.md` (build PASS, signup/login), `README.md` (guest accounts, `next-i18n-router`, phantom `src/types`/`src/styles`), `tasks.md` gate snapshot (2026-10-06 claims), `docs/DATABASE.md` (legacy `confirmed` flow), `supabase/seed.sql` (wrong schema/seed data).
- **Spec refs:** CLAUDE.md principle 7 (report faithfully), §31 documentation artifacts, AGENTS.md rule 7.
- **Dependencies:** None — but execute **after** Waves 0–2 so final numbers are real; can do an interim pass after RT-001.
- **Files/areas likely affected:** listed docs + seed; `tasks.md` (archive/supersede with pointer to this file to keep one roadmap — decision recorded).
- **Acceptance criteria:** No doc contradicts the repo; test counts/commands match actual scripts; gate snapshot regenerated from fresh runs; seed matches migration schema and applies cleanly (verify during RT-007).
- **Verification requirements:** Fresh gate run outputs embedded; doc grep for known false phrases returns nothing.
- **External/live dependencies:** None.

### RT-063 — Spec §31 documentation set
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Produce remaining §31 artifacts: `specs/` (or documented split), `design/` (design system extracted from implementation), technical architecture doc, user flows, acceptance criteria mapping, verification plan.
- **Spec refs:** §31, §30.1.
- **Dependencies:** RT-062 (base docs corrected), features largely complete (docs describe reality).
- **Files/areas likely affected:** `specs/`, `design/`, `docs/` (new dirs), README links.
- **Acceptance criteria:** Every §31 bullet exists and matches implementation; linked from README.
- **Verification requirements:** Doc review checklist vs §31 list.
- **External/live dependencies:** None.

### RT-064 — Final spec-conformance audit (§32 quality gates)
- **Phase:** 6 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Re-run the full audit method used to create this file, but as a **conformance pass** against every §32.1–32.11 gate: functional, business rules, security, accessibility, performance, SEO, responsive, payments, inventory, admin workflows, final audit.
- **Spec refs:** §32.1–32.11, §33 (philosophy spot-check), CLAUDE.md principle 7.
- **Dependencies:** **All prior tasks** (or explicitly recorded waivers for DEFERRED items).
- **Files/areas likely affected:** This file (final status table), any spawned fix tasks.
- **Acceptance criteria:**
  1. All statuses in this file are `DONE` or explicitly user-approved `DEFERRED`/`BLOCKED` with rationale.
  2. Gates: `tsc` ✓, `lint` ✓, unit+integration+E2E ✓, build ✓, security suite ✓, axe ✓, Lighthouse budgets ✓.
  3. Live: DB/RLS/auth/storage, payments (or documented COD-only waiver), deployment, production env all `LIVE VERIFIED`.
  4. Documentation matches the system (RT-062/063 done).
- **Verification requirements:** Complete gate matrix published in this file with command outputs.
- **External/live dependencies:** Everything resolved or waived by user.

---

## Execution Rules (binding for all tasks)

1. **One task at a time**: Understand → Inspect → Plan → Implement → Verify → Review → Commit → Push → Update this file → **STOP for approval**.
2. A task is `DONE` only with: passing verification commands recorded, commit hash, push confirmed, and honest `STATIC`/`LIVE`/`BLOCKED` labeling. Live-dependent tasks stay `BLOCKED` until credentials exist — never fake verification.
3. New discoveries are appended here (preserving dependency order) before being implemented; only RT-001 may be in flight without prior user approval.
4. Never restore `stash@{0}` blindly; never commit secrets or broken gates; one commit type per task.
5. `spec.md` outranks this file, PHASES.md, and any stale doc; conflicts are surfaced to the user, not silently resolved (CLAUDE.md principle 3).

## Status Summary (live count — update as tasks complete)

| Wave | Tasks | DONE | Blocked |
|---|---|---|---|
| 0 — Build unblock/regressions | RT-001…RT-006 (6) | 0 | 0 (RT-002 needs D-2) |
| 1 — Live environment | RT-007…RT-009 (3) | 0 | 3 |
| 2 — Phase 1 UX | RT-010…RT-020 (11) | 0 | 0 (RT-019 needs D-5) |
| 3 — SEO/a11y/perf | RT-021…RT-027 (7) | 0 | 0 (RT-025 needs D-6) |
| 4 — Payments | RT-028…RT-029 (2) | 0 | 2 (D-1) |
| 5 — Returns/fulfillment | RT-030…RT-033 (4) | 0 | 0 |
| 6 — Printing/bulk | RT-034…RT-039 (6) | 0 | 0 (D-4 scope) |
| 7 — Admin/analytics | RT-040…RT-045 (6) | 0 | 0 |
| 8 — Content/marketing | RT-046…RT-048 (3) | 0 | 0 |
| 9 — Security | RT-049…RT-052 (4) | 0 | 1 (D-3) |
| 10 — E2E/quality | RT-053…RT-056 (4) | 0 | 0 |
| 11 — Deploy/ops | RT-057…RT-061 (5) | 0 | 3 |
| 12 — Docs/final gate | RT-062…RT-064 (3) | 0 | 0 |
| **Total** | **64** | **0** | **9** |
