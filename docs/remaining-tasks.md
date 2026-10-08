# Remaining Tasks — Phased Execution Roadmap

**Created:** 2026-10-08 from a complete read-only end-to-end audit of the codebase at `master` @ `36341cf`.
**Updated:** 2026-10-08 — restructured into a phase breakdown after re-reading the full project documentation (`docs/spec.md` (1591 lines), `docs/PHASES.md`, `docs/tasks.md`, `docs/PHASE1_VERIFICATION.md`, `docs/README.md`, `docs/DATABASE.md`, `CLAUDE.md`, `AGENTS.md`) against the codebase.
**Authority:** `docs/spec.md` (product spec) → `CLAUDE.md` (constitution) → `AGENTS.md` (agent rules). Where `docs/PHASES.md` conflicts with `docs/spec.md`, the spec wins.
**Phase model:** the 6 phases of `docs/PHASES.md`. Within each phase, work packages (1A, 2A, …) and tasks are ordered by technical dependency and risk — execute top-down.
**This file is the single execution roadmap.** Statuses are updated only after verification; tasks are never deleted while unfinished.

---

## Legend

**Status:** `NOT STARTED` | `IN PROGRESS` | `DONE` | `BLOCKED` | `DEFERRED`

**Priority:**
- **P0** — blocks build, correctness, security, or all downstream work
- **P1** — required for Phase 1 completion / core product correctness
- **P2** — required for full spec conformance (Phases 2–5)
- **P3** — production readiness, polish, final gates (Phase 6)

**Verification labels:** `STATIC VERIFIED` = code/automated checks only · `LIVE VERIFIED` = confirmed against the real external environment · `BLOCKED` = required environment/credential unavailable, never faked.

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

**Known stale documentation (fixed in RT-062):** `docs/PHASES.md`, `docs/PHASE1_VERIFICATION.md`, `docs/README.md`, `docs/tasks.md` gate snapshot, `docs/DATABASE.md`, `supabase/seed.sql`.

---

## Open Decisions (need user input; tracked, not blocking Phase 1 package 1A)

| # | Decision | Affects |
|---|---|---|
| D-1 | Payment provider for §10.3 online payments (JazzCash/Easypaisa gateway, merchant credentials, webhook URL) | RT-028, RT-029 |
| D-2 | Stash `stash@{0}` (20 files, +731/−948, overlaps HEAD) — salvage or drop? | RT-002 |
| D-3 | Dependency majors forced by `npm audit` (Next 14→16, Jest 30, ESLint-Config-Next 16, Tailwind 4) — upgrade now or accept audit noise? | RT-051 |
| D-4 | Spec §4.1 lists Printing Hub / Bulk-order form under Public Pages; `docs/PHASES.md` assigns them to Phase 3. Roadmap places them in Phase 3. Confirm sequencing. | Phase 3 |
| D-5 | Bilingual i18n (Urdu/English) is **not in `docs/spec.md`** — it originates from PHASES.md/T009. Keep as requirement? | RT-019 |
| D-6 | Google Maps embed (§23.8): plain iframe embed (no key) vs Maps JavaScript API (key + billing) | RT-025 |
| D-7 | SMTP/transactional email provider (PHASES 2.8, 5.4) — needed for password-reset email delivery and optional order emails | RT-067 |

---

## Phase Overview — All Remaining Work

| Phase | Name (PHASES.md) | Task IDs | Tasks | Blocked | Depends on |
|---|---|---|---|---|---|
| **Phase 1** | MVP: Core Ecommerce (completion) | RT-001…RT-009, RT-010…RT-020, RT-065, RT-021…RT-027, RT-028, RT-029, RT-053, RT-068 | 32 | 5 | — |
| **Phase 2** | Admin Dashboard & Analytics | RT-040…RT-045, RT-066, RT-067 | 8 | 1 | Phase 1 gate |
| **Phase 3** | Printing & Bulk Services | RT-034…RT-039 | 6 | 0 | Phase 1 gate (D-4) |
| **Phase 4** | Delivery & Fulfillment | RT-030…RT-033 | 4 | 0 | Phase 1 gate |
| **Phase 5** | Marketing & Content | RT-046, RT-047, RT-048 | 3 | 0 | Phase 2 |
| **Phase 6** | Production Readiness | RT-049…RT-052, RT-054…RT-062, RT-063, RT-064 | 15 | 4 | Phases 1–5 |
| | | **Total** | **68** | **10** | |

Phase gating follows `docs/PHASES.md` "Phase Gate Process" and `docs/spec.md` §30.2: a phase is DONE only after implementation → tests → spec verification → security/a11y/perf audit → **user sign-off**. Phases 2, 3 and 4 may run in parallel after the Phase 1 gate.

---

# PHASE 1 — MVP: Core Ecommerce (completion)

**Goal:** the Phase 1 tracker (`docs/tasks.md` T001–T012) fully complete: build green, live-verified DB/auth, full customer experience per spec §4.1/§5/§6/§7, SEO/a11y/perf baselines, payments decision resolved, Phase 1 gate signed off.

## 1A. Build Unblock & Regressions — execute first, nothing else can start

### RT-001 — Restore `tsc` and `next build` (fix HEAD regression)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Eliminate the 6 type errors introduced by `36341cf` so type checking and production build pass again.
- **Spec refs:** §30.2 phase gates; §32.1 functional gates; CLAUDE.md principle 7.
- **Dependencies:** None (first task).
- **Files/areas likely affected:** `src/lib/products.ts` (L121/148/166/187 null-guards; L189 dead `.on()` realtime call), `src/lib/reviews.ts` (L28), possibly `src/lib/supabase.ts`.
- **Acceptance criteria:**
  1. `npx tsc --noEmit` exits 0; `npx next build` completes.
  2. No behavioral change beyond removing the non-compiling dead realtime code.
  3. No unrelated files changed.
- **Verification requirements:** `npx tsc --noEmit`; `npx next build`; `npx next lint`; `npx jest` (127-pass baseline holds). `STATIC VERIFIED`.
- **External/live dependencies:** None.

### RT-002 — Resolve stash `stash@{0}` (T004/T006/T009 WIP)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED (needs **D-2**)
- **Objective:** Diff the stashed WIP (20 files, +731/−948) against `36341cf`; salvage valuable changes into new tasks; drop the stash cleanly. Never blindly restore.
- **Spec refs:** AGENTS.md rule 2; CLAUDE.md principle 2.
- **Dependencies:** RT-001.
- **Files/areas likely affected:** `src/lib/{supabase,products,orders,payments}.ts`, `src/app/layout.tsx`, `src/app/shop/checkout/page.tsx`, `src/components/ProductFilters.tsx`, `src/hooks/useAuth.ts`, `next.config.js`; spawns follow-up tasks if salvageable.
- **Acceptance criteria:** `git stash show -p stash@{0}` reviewed; decision recorded (salvage → appended tasks, or drop → removed with rationale in commit body); gates stay green.
- **Verification requirements:** `git stash list` reflects agreed state; gates re-run. `STATIC VERIFIED`.
- **External/live dependencies:** User decision D-2.

### RT-003 — Add CI pipeline (regression protection)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Every push/PR runs typecheck, lint, unit tests and build; commit `.github/` intentionally (currently untracked).
- **Spec refs:** §29.1; §30.2; CLAUDE.md principle 7.
- **Dependencies:** RT-001 (first run must be green).
- **Files/areas likely affected:** `.github/workflows/ci.yml` (new), `.github/workflows/opencode.yml` (commit by explicit decision), `package.json`.
- **Acceptance criteria:** Workflow runs `tsc --noEmit`, `next lint`, `jest --ci`, `next build` on push/PR to `master`; no secrets exposed; live DB tests skip cleanly without creds; CI workflow tracked in git.
- **Verification requirements:** Local run of all four commands + GitHub Actions run log after push. `STATIC VERIFIED` + live confirmation.
- **External/live dependencies:** GitHub Actions.

## 1B. Correctness & Security Foundations

### RT-004 — Fix sale-price / variant-price checkout mismatch (pricing correctness bug)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Server-side order totals must agree with both the RPC validation and the prices customers see, for sale prices and variant-specific prices.
- **Spec refs:** §6.1 (discount), §6.3 variants, §7.2 checkout, §10.6 (server-side totals), CLAUDE.md principle 5.
- **Dependencies:** RT-001.
- **Files/areas likely affected:** `src/app/api/orders/route.ts` (recomputes from base `products.price` at L47/64/70/98), `supabase/migrations/005_delivery_zones.sql` (`create_order_with_payment` recomputes with `public.current_price()` and raises "Order total does not match product prices"), `src/app/shop/checkout/page.tsx`, `src/lib/cart.ts`; new migration only if RPC signature must change (prefer not).
- **Acceptance criteria:**
  1. Checkout of a product with active `sale_price` succeeds and stores the sale-based total.
  2. A variant with its own price is charged that price, computed server-side from the DB (never client-supplied).
  3. RPC total validation still rejects tampered client totals.
  4. Unit tests: base price, active sale, expired sale, variant price, mismatch rejection.
- **Verification requirements:** `tsc`, `lint`, `jest` (new tests green); live checkout once RT-007 unblocks → upgrade to `LIVE VERIFIED`.
- **External/live dependencies:** Supabase (final live confirmation).

### RT-005 — Close middleware admin fail-open
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Admin pages must never render unauthenticated when Supabase env vars are absent (`src/middleware.ts` returns `NextResponse.next()` in that case).
- **Spec refs:** §18.1, §19.1, §28.2, §28.3; CLAUDE.md principle 6.
- **Dependencies:** RT-001.
- **Files/areas likely affected:** `src/middleware.ts` (matcher `/admin/:path*`), `src/app/admin/login` handling; admin pages' bearer-token fetch stays as defense-in-depth.
- **Acceptance criteria:** With env missing/misconfigured, `/admin/*` redirects to login or 500s — never renders admin UI; valid env + session behavior unchanged; missing config logged server-side, not silently bypassed.
- **Verification requirements:** `tsc`, `lint`, `jest`; manual middleware test via `next dev` with env unset and set. `STATIC VERIFIED`; live recheck in RT-009.
- **External/live dependencies:** None.

### RT-006 — Replace auth token storage with secure cookies (spec §28.2)
- **Phase:** 1 · **Priority:** P0 · **Status:** NOT STARTED
- **Objective:** Stop writing Supabase access/refresh tokens to JS-readable `document.cookie` (`cookieStorage` in `src/lib/supabase.ts`); use `HttpOnly` + `Secure` + `SameSite` cookies set server-side so middleware/server components can read them and XSS cannot steal them.
- **Spec refs:** §28.2 ("Secure HTTP-only cookies"), §28.3, §28.7; CLAUDE.md principle 6.
- **Dependencies:** RT-001, RT-005; coordinate with RT-009 live verification.
- **Files/areas likely affected:** `src/lib/supabase.ts`, `src/lib/supabase-server.ts`, `src/middleware.ts`, admin auth routes (`src/app/admin/login/`), `src/app/api/auth/*`, `src/hooks/useAuth.ts`.
- **Acceptance criteria:** No auth tokens in `document.cookie`/`localStorage`; session survives refresh; logout clears cookie; password reset still works; middleware reads the HttpOnly cookie; cookies `HttpOnly`, `Secure` (prod), `SameSite=Lax` or stricter, path-scoped.
- **Verification requirements:** `tsc`, `lint`, `jest`; DevTools cookie inspection on `next dev`; full live sign-in verification in RT-009 (`LIVE VERIFIED` required before DONE).
- **External/live dependencies:** Supabase credentials (live sign-in).

### RT-065 — Design system conformance (spec §27)
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Implement the §27 visual design system — currently **unimplemented**: `tailwind.config.ts` ships placeholder colors (`primary: #6366f1`, `secondary: #ec4899`) instead of the spec palette, and no Cormorant Garamond/Inter fonts are loaded. Also formalize tokens, button variants, spacing, shadows, icons per §27.6–27.10.
- **Spec refs:** §27.1–27.10 (colors #0A3D2F/#D16B46/#F7F0E7/#6B8A6B/#212121; fonts Cormorant Garamond + Inter; type scale H1 60/H2 48/H3 36/body 16/small 14 responsive; Primary/Secondary/Tertiary buttons with 5 states; subtle borders; `prefers-reduced-motion` §27.9; one icon system), §1.2 brand tone, §33.2.
- **Dependencies:** RT-001; **execute before RT-010** so all Phase 1 UI builds on correct tokens.
- **Files/areas likely affected:** `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx` (font loading), `src/components/*` (buttons/cards), new `src/components/ui/*` primitives if gaps exist.
- **Acceptance criteria:**
  1. Tailwind tokens match §27.4 palette exactly; no placeholder indigo/pink remains.
  2. Display + body fonts loaded per §27.5 with responsive type scale.
  3. Three button variants with default/hover/focus/active/disabled states; consistent cards/forms/dialogs per §27.6.
  4. `prefers-reduced-motion` honored (§27.9); single icon set with accessible labels (§27.10).
  5. No visual regressions on existing screens (side-by-side spot check).
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; token audit grep (no legacy hex values); visual spot-check record.
- **External/live dependencies:** None.

## 1C. Live Environment — BLOCKED until Supabase credentials

### RT-007 — Supabase project setup: `.env`, apply migrations 001–007
- **Phase:** 1 · **Priority:** P0 · **Status:** BLOCKED
- **Objective:** Provision/attach a real Supabase project; create `.env.local` from `.env.example`; apply migrations 001→007; apply seed intentionally (after RT-064 seed fix).
- **Spec refs:** §28.5, §28.10, §30.2; AGENTS.md rule 2.
- **Dependencies:** None technically; **blocked on Supabase URL + anon key + service-role key (user-supplied)**.
- **Files/areas likely affected:** `.env.local` (never committed), `supabase/migrations/001–007`, `supabase/seed.sql`, `package.json` db scripts.
- **Acceptance criteria:** Migrations apply cleanly in order on a fresh DB; `.env.local` git-ignored, no secrets in source; 17 tables + RLS + functions exist (spot-check against audit list).
- **Verification requirements:** Migration apply log + schema queries → `LIVE VERIFIED`.
- **External/live dependencies:** **Supabase project credentials.**

### RT-008 — Run `verify_phase1.sql` + DB integration tests live
- **Phase:** 1 · **Priority:** P0 · **Status:** BLOCKED
- **Objective:** Execute `supabase/tests/verify_phase1.sql` (labels `PHASE1_DB_RLS_TEST_…`) and the gated suite `db.integration.test.ts` (13 tests) against RT-007's database; fix failures (spawns sub-tasks if broken).
- **Spec refs:** §28.5 RLS, §29.1 integration, §32.2, §32.3.
- **Dependencies:** RT-007.
- **Files/areas likely affected:** `supabase/tests/verify_phase1.sql`, `src/lib/db.integration.test.ts` (gated suite), new migrations only if fixes needed (never edit applied migrations).
- **Acceptance criteria:** Zero `FAILED:` labels; all 13 integration tests pass with `SUPABASE_TEST_*` env; RLS proven live (anon denied, role escalation blocked, order lifecycle + exactly-once deduction behave).
- **Verification requirements:** Full script output + jest log → `LIVE VERIFIED`.
- **External/live dependencies:** RT-007 credentials.

### RT-009 — Live verification of auth, RBAC, storage, RPCs
- **Phase:** 1 · **Priority:** P0 · **Status:** BLOCKED
- **Objective:** Live-verify RT-004/005/006 in a real browser: sign-in/out, password reset, session expiry & logout-all (§19.1), suspicious-login handling, admin role denial, evidence upload validation (§28.6), zone-fee RPC, sale-price checkout.
- **Spec refs:** §19.1–19.2, §18.1, §28.6, §8.2, §10.6.
- **Dependencies:** RT-004, RT-005, RT-006, RT-007, RT-008.
- **Files/areas likely affected:** verification notes in this file; fixes spawned as sub-tasks.
- **Acceptance criteria:**
  1. Guest browse → cart → checkout (COD) → track works with correct sale-aware total.
  2. Admin sign-in works; staff/super-admin boundaries hold; customer token cannot call `/api/admin/*`.
  3. Upload rejects >5MB / non-image / spoofed MIME.
  4. Delivery fee comes from the DB zone config, not client input.
  5. Password-reset email path works (or SMTP gap recorded honestly → D-7).
- **Verification requirements:** Browser session evidence + API samples → `LIVE VERIFIED` (required before Phase 1 can be declared complete).
- **External/live dependencies:** RT-007 credentials; SMTP for reset email (may remain partial — record honestly).

## 1D. Customer Experience (spec §4.1, §5, §6, §7)

### RT-010 — Homepage (all 15 spec sections)
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Replace the 10-line stub `src/app/page.tsx` with the full homepage per §5.1.
- **Spec refs:** §5.1 (brand intro, hero, **Category Chip Strip**, Sports, Stationery, Printing, Featured, Latest, Best-selling, Recommended, Printing services highlight, Bulk order CTA, Visit Shop w/ map/hours/WhatsApp, promotions, Footer with signature element), §5.2, §27 visual system, §16.1.
- **Dependencies:** RT-001, RT-065 (tokens); data via `is_featured`, zones API, `public_reviews`.
- **Files/areas likely affected:** `src/app/page.tsx`, new `src/components/home/*`, `src/lib/products.ts`, `src/locales/*.json` (if D-5 keep).
- **Acceptance criteria:** All 15 sections present in spec order with real data (products, reviews, zones) and loading/empty/error states; responsive (§26); accessible (§25); runs on RT-065 tokens; Lighthouse mobile within §24.3 budgets (or documented deviation).
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; manual responsive/a11y spot-check; live render after RT-007 (`STATIC VERIFIED` → `LIVE VERIFIED`).
- **External/live dependencies:** DB data for realistic rendering.

### RT-011 — Global chrome: header, footer, mobile navigation drawer
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Spec-compliant header/nav (§5.1.14), footer with signature element (§5.1.15), accessible mobile hamburger drawer (§26.3).
- **Spec refs:** §5.1.14–15, §26.3, §25.2 (accessible mobile drawer), §4.1.
- **Dependencies:** RT-010 (shared layout). Public-page links wired incrementally as RT-012–RT-014 land.
- **Files/areas likely affected:** `src/app/layout.tsx`, `src/app/shop/layout.tsx`, new `src/components/{Header,Footer,MobileNav}.tsx`, `LanguageSwitcher.tsx`.
- **Acceptance criteria:** Header: logo, primary nav, search entry, cart w/ count, language toggle — no truncation at 360px; footer: contact, hours, delivery/returns/FAQ/terms/privacy links, social (§23.9), signature element; drawer keyboard-accessible, focus-trapped, Escape closes; zero layout shift.
- **Verification requirements:** `tsc`, `lint`, `build`; mobile viewport + keyboard pass; axe spot-check (ties RT-026).
- **External/live dependencies:** None.

### RT-012 — Public information pages
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Create the missing §4.1 public pages with real, editable content: About Us, Visit Shop, Delivery Information, Returns & Refunds, FAQ, Terms & Conditions, Privacy Policy (Contact Us exists at `/shop/contact`).
- **Spec refs:** §4.1, §11 (returns content), §8 (delivery info), §23.3, §21.4 (content later editable in Phase 5).
- **Dependencies:** RT-011; start with structured constants (RT-046/RT-042 add editing later).
- **Files/areas likely affected:** `src/app/(public)/{about,visit,delivery-info,returns,faq,terms,privacy}/page.tsx`, shared `PageHeader`, `src/locales/*.json`.
- **Acceptance criteria:** Each route exists, statically generated where sensible, with unique metadata (feeds RT-021); Visit Shop has address, hours, contact, WhatsApp CTA, map placeholder (RT-025); Returns text matches §11 rules (1-day window, unopened, customer return shipping; damaged → shop pays); Delivery page matches §8; all links resolve.
- **Verification requirements:** `tsc`, `lint`, `build`; route smoke test; header/footer link check.
- **External/live dependencies:** None.

### RT-013 — Categories page
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Public categories listing per §4.1/§6.7 (tree, counts, §27.3 visual treatments) with drill-down into filtered products.
- **Spec refs:** §6.7, §4.1, §27.3.
- **Dependencies:** RT-011; category data exists (T003).
- **Files/areas likely affected:** `src/app/shop/categories/page.tsx`, `CategoryTile`, `src/lib/categories.ts`, `ProductFilters` (must drill into descendants — currently top-level only).
- **Acceptance criteria:** Full tree with product counts; parent selection shows descendant products; category visual treatments; empty state.
- **Verification requirements:** `tsc`, `lint`, `jest` (ancestor-query test), `build`; live data post-RT-007.
- **External/live dependencies:** DB categories data.

### RT-014 — Product search + autocomplete
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** §6.5 discovery: instant search, suggestions-as-you-type, filters (category, price, availability, size/color/variants, sort), full-text where supported.
- **Spec refs:** §6.5, §6.6, §1.3 (Search Products), §26.3 (prominent search on mobile).
- **Dependencies:** RT-001, RT-011 (header slot).
- **Files/areas likely affected:** new `src/components/SearchBar.tsx`, `src/app/shop/products/page.tsx`, `src/components/ProductFilters.tsx`, `src/lib/products.ts`; migration only if a search index is needed.
- **Acceptance criteria:** Debounced suggestions with keyboard navigation (↑/↓/Enter) and ARIA combobox roles; all §6.5 filters + sort orders; server-side query (no leaking inactive products); empty state with recovery hints; unit tests for the query builder.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; keyboard/ARIA pass; live search post-RT-007.
- **External/live dependencies:** DB data; full-text capability check on Supabase.

### RT-015 — Quick View on product cards
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** §6.6 hover/focus action opens a modal with gallery, variant selection, price, stock, add-to-cart — without navigation.
- **Spec refs:** §6.6, §25.2 (accessible modals), §26.3 (accessible Quick View), §27.6 dialogs.
- **Dependencies:** RT-014 (cards). Uses existing cart context (RT-016 refines it afterward — no reverse dependency).
- **Files/areas likely affected:** `src/components/ProductCard.tsx`, new `src/components/QuickViewModal.tsx`, `cart-context.tsx`.
- **Acceptance criteria:** Focus-trapped modal, closes on Escape/backdrop, works on touch, shows variant + sale prices (RT-004 semantics), disabled add-to-cart when stock = 0, loads on RT-065 dialog styles.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; keyboard/axe spot-check.
- **External/live dependencies:** None.

### RT-016 — Cart spec compliance
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Close §7.1 gaps: stock-aware quantity limits, add confirmation with **"Continue shopping" option**, variant display, correct totals, empty-cart state, stale price/product detection on load.
- **Spec refs:** §7.1, §9.2 (stock), §6.3.
- **Dependencies:** RT-004 (pricing), RT-015.
- **Files/areas likely affected:** `src/lib/cart.ts`, `src/lib/cart-context.tsx`, `src/app/shop/cart/page.tsx`, `ProductCard.tsx`, `products/[id]/page.tsx`.
- **Acceptance criteria:** Quantity cannot exceed stock (server-confirmed at add, revalidated at checkout); confirmation offers continue shopping / view cart / checkout (§7.1); variant + sale price displayed; cart detects deletion/price change and informs the user; tests for add/remove/update/limit/persistence.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live check post-RT-007.
- **External/live dependencies:** DB for revalidation semantics.

### RT-017 — Checkout flow: explicit review step & order summary
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Restructure checkout into the §7.2 flow — Customer Information → Delivery/Pickup → Payment Method → **Review Order** → Confirmation — with a complete final summary (items, fees, payment, address, hours).
- **Spec refs:** §7.2, §7.3 guest checkout (name, WhatsApp, address, email, method), §8.1 pickup hours.
- **Dependencies:** RT-004, RT-016.
- **Files/areas likely affected:** `src/app/shop/checkout/page.tsx` (step components), `src/app/shop/order-confirmation/page.tsx`.
- **Acceptance criteria:** Review step shows exactly what will be charged (sale/variant aware) before submit; summary contains all §7.2 elements; inline accessible validation; idempotent submission retained (`Idempotency-Key`); tests for step validation + payload building.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live COD checkout in RT-009.
- **External/live dependencies:** RT-007 for live checkout.

### RT-018 — Variant-aware cart & checkout (deep pricing correctness)
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Carry `variant_id` + variant price through cart → checkout → `/api/orders` → RPC so variant pricing is charged correctly (extends RT-004 across the full path; server remains source of truth).
- **Spec refs:** §6.3, §6.1, §10.6, CLAUDE.md principle 5.
- **Dependencies:** RT-004 (same code area — sequence carefully; consider merging execution if audits overlap).
- **Files/areas likely affected:** `src/lib/cart.ts`, `src/app/api/orders/route.ts`, new migration only if RPC must accept variant lines, orders route tests.
- **Acceptance criteria:** Order line items store `variant_id`; totals computed server-side from variant/sale price; client/server mismatch rejected with a friendly error; live integration test (RT-008) covers a variant order.
- **Verification requirements:** `tsc`, `lint`, `jest`; live checkout (RT-009) → `LIVE VERIFIED`.
- **External/live dependencies:** Supabase (live).

### RT-019 — i18n completion (pending decision D-5)
- **Phase:** 1 · **Priority:** P2 (P1 if D-5 = keep) · **Status:** NOT STARTED (decision **D-5** open)
- **Objective:** If bilingual retained: full `t()` coverage (cart, checkout, tracking, auth, customer-facing admin), SSR-correct `lang`/`dir` (no flash), resolve unused `next-i18n-router` dependency (installed, zero usage; i18n block removed from `next.config.js` in `36341cf`), Urdu translation review.
- **Spec refs:** **Not in `docs/spec.md`** — `docs/PHASES.md` Phase 1, `docs/tasks.md` T009; record approval/deviation.
- **Dependencies:** RT-010–RT-018 (translate after structure stabilizes).
- **Files/areas likely affected:** `src/i18n.config.ts`, `src/locales/{en,ur}.json`, `src/app/layout.tsx`, consumer components, `next.config.js`, `package.json`.
- **Acceptance criteria:** No hard-coded user-facing English in customer flows; `lang`/`dir` correct on first paint; RTL verified; unused dependency removed or adopted.
- **Verification requirements:** `tsc`, `lint`, `build`; string-coverage grep; manual RTL pass.
- **External/live dependencies:** Decision D-5.

### RT-020 — Order tracking & confirmation completeness
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Ensure §9.4 tracking (Order ID + WhatsApp lookup, full status timeline, WhatsApp fallback) and the confirmation page fully match spec, guest-access safe.
- **Spec refs:** §9.4 (status, items, total, payment status, delivery/pickup info, assigned date/time), §9.1, §7.2.
- **Dependencies:** RT-017.
- **Files/areas likely affected:** `src/app/shop/order-confirmation/page.tsx`, `src/app/shop/track/page.tsx`, `src/app/api/orders/track/route.ts`.
- **Acceptance criteria:** Timeline renders all statuses with timestamps; wrong phone fails gracefully without leaking order existence; WhatsApp deep link prefilled with order ID; all §9.4 fields displayed.
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live track test (RT-009).
- **External/live dependencies:** RT-007.

## 1E. Quality Gates: SEO, Accessibility, Performance (tasks.md T010)

### RT-021 — Site metadata, OG/Twitter cards, canonical, JSON-LD
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Per-page metadata across public routes; OG/Twitter tags; canonical; LocalBusiness + Organization JSON-LD.
- **Spec refs:** §23.3, §23.4, §23.6, §23.9, §33 (brand).
- **Dependencies:** RT-010, RT-012.
- **Files/areas likely affected:** `src/app/layout.tsx` (`metadataBase`), per-page `generateMetadata`, new `src/lib/seo.ts`, `public/` OG image.
- **Acceptance criteria:** Every public route has unique title/description/canonical/OG; JSON-LD validates; no metadata on admin routes (paired with RT-024).
- **Verification requirements:** `build`; serialized-metadata unit assertions; validator run.
- **External/live dependencies:** Production URL for canonical (start relative; finalize in RT-057).

### RT-022 — sitemap, robots, manifest, favicon/icons
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** XML sitemap, robots.txt, web manifest, favicon + touch icons; admin routes excluded.
- **Spec refs:** §23.11, §23.10, §27.6.
- **Dependencies:** RT-012, RT-021.
- **Files/areas likely affected:** `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/manifest.ts`, `public/*` (new), `src/app/layout.tsx`.
- **Acceptance criteria:** Sitemap lists all public routes, excludes `/admin`; robots allows public / disallows admin; automatic sitemap updates on product change (§23.11) verified; icons render.
- **Verification requirements:** `build`; fetch `/sitemap.xml` + `/robots.txt` from `next start`.
- **External/live dependencies:** Domain (final check post-deploy).

### RT-023 — Dynamic SEO: product pages, breadcrumbs, image alt pass
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** `generateMetadata` for product detail (name, price, OG image), breadcrumbs (+BreadcrumbList JSON-LD), full alt-text audit (§23.12), image dimensions against CLS.
- **Spec refs:** §23.4, §23.6, §23.12, §24 (CLS), §6.1 (SEO metadata fields already in schema).
- **Dependencies:** RT-021.
- **Files/areas likely affected:** `src/app/shop/products/[id]/page.tsx`, `src/lib/seo.ts`, `ProductCard.tsx`, admin `ProductForm` (alt-text input if missing).
- **Acceptance criteria:** Product metadata generated from DB (incl. sale price); ≥95% informative alts (manual review recorded); width/height on all images; no `next/image` warnings.
- **Verification requirements:** `build` output review; alt audit checklist in this file.
- **External/live dependencies:** None.

### RT-024 — Indexing hygiene (admin noindex, internal search safety)
- **Phase:** 1 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** All `/admin/*`, auth and order-management routes `noindex`; internal search/tracking URLs canonicalized (no index bloat).
- **Spec refs:** §23.10.
- **Dependencies:** RT-021.
- **Files/areas likely affected:** `src/app/admin/layout.tsx` metadata, login/reset pages, `sitemap.ts` exclusions.
- **Acceptance criteria:** `noindex` present on admin + auth HTML; sitemap contains only canonical public URLs.
- **Verification requirements:** `build`; HTML grep assertions (unit test).
- **External/live dependencies:** None.

### RT-025 — Google Maps embed on Visit Shop (decision D-6)
- **Phase:** 1 · **Priority:** P2 · **Status:** NOT STARTED (**D-6** open)
- **Objective:** Embedded map + directions link on Visit Shop / homepage.
- **Spec refs:** §23.8, §4.1, §26.3 (map & directions).
- **Dependencies:** RT-012.
- **Files/areas likely affected:** `src/app/(public)/visit/page.tsx`, new `src/components/MapEmbed.tsx`, env key if D-6 = JS API.
- **Acceptance criteria:** Map renders, lazy-loaded (§24.2 deferred third-party scripts), keyboard-accessible fallback "Open in Google Maps".
- **Verification requirements:** `build`; visual check.
- **External/live dependencies:** Possibly Maps API key (D-6).

### RT-026 — Accessibility: fixes + WCAG 2.2 AA audit
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Implement §25 requirements — `:focus-visible`, `prefers-reduced-motion`, contrast §25.3, skip link, landmarks, form labels/errors, color+icon status indicators — then run automated + manual audit and fix findings.
- **Spec refs:** §25.1–25.4, §27.9, §26.
- **Dependencies:** RT-010–RT-017 (audit after features exist); RT-055 adds automation later.
- **Files/areas likely affected:** `src/app/globals.css`, layouts, interactive components, checkout forms.
- **Acceptance criteria:** No axe critical/serious issues on key templates (home, list, detail, cart, checkout, track, admin login); focus-visible everywhere; reduced-motion honored; contrast ≥ 4.5:1; status never color-only (§25.3); manual keyboard pass recorded.
- **Verification requirements:** axe output attached to task record; §25.2 checklist. `STATIC VERIFIED` (tooling) — screen-reader pass noted as manual.
- **External/live dependencies:** Axe/Lighthouse tooling (npm only).

### RT-027 — Performance budgets & optimization (spec §24)
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Meet §24.3 budgets (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1, JS ≤200KB, TTFB ≤200ms prod): server-first rendering, minimal client components, **pagination on product lists (currently absent)**, code-split admin, fonts (§27.5 via RT-065), image optimization (WebP/AVIF, responsive sizes §6.2), caching/revalidation, remove dead deps (`next-i18n-router` per RT-019), measure.
- **Spec refs:** §24.1–24.3, §6.2 (image system), §23.12 (image optimization).
- **Dependencies:** RT-001, RT-010–RT-018; RT-057 for production TTFB numbers (lab budgets first).
- **Files/areas likely affected:** `next.config.js`, `src/app/layout.tsx`, product list components (pagination), `package.json`, component lazy-loading.
- **Acceptance criteria:** Lighthouse mobile ≥ targets on home/list/detail/cart; admin code-split from customer chunks; product list paginated; bundle report recorded; budgets documented here.
- **Verification requirements:** Lighthouse reports stored; `next build` bundle stats.
- **External/live dependencies:** Production deploy for true TTFB (RT-057).

## 1F. Payments (tasks.md T006 remainder — decision-blocked)

### RT-028 — Payment provider decision & credentials
- **Phase:** 1 · **Priority:** P2 · **Status:** BLOCKED (**D-1**)
- **Objective:** Select gateway per §10.3 (JazzCash/Easypaisa online), obtain merchant credentials, agree webhook URL; document the integration contract (§10.6 rules).
- **Spec refs:** §10.3, §10.6, §28.10.
- **Dependencies:** None (parallel with 1D/1E).
- **Files/areas likely affected:** `.env.example` (documented vars only — no secrets), this file (decision record).
- **Acceptance criteria:** Provider chosen, credentials in hand, webhook endpoint plan documented.
- **Verification requirements:** Decision record + user confirmation.
- **External/live dependencies:** **Payment provider account (user).**

### RT-029 — Gateway integration + webhook verification
- **Phase:** 1 · **Priority:** P2 · **Status:** BLOCKED (deps: D-1, RT-028)
- **Objective:** Online payment intent; server-side verification (never trust client); signed idempotent webhook receiver → payment status transitions (§10.5); refund path §11.3 (gateway refund + manual fallback); wire `PAYMENT_WEBHOOK_SECRET` (currently unused); failed-payment retry UX per §10.3.
- **Spec refs:** §10.3, §10.5, §10.6, §11.3, §32.8, CLAUDE.md principle 5.
- **Dependencies:** RT-028, RT-004.
- **Files/areas likely affected:** `src/app/api/payments/*`, `src/lib/payments.ts`, migration (webhook events/idempotency), admin payments UI, `.env.example`.
- **Acceptance criteria:** Payment confirmed only after server-side signature/amount check; duplicate webhooks safe, forged/replayed rejected 401; paid order unlocks `pending_payment→received`; failed shows retry with preserved checkout (§10.3); refunds record reference; security tests for forgery/amount-tamper/replay.
- **Verification requirements:** `tsc`, `lint`, `jest` (signature tests); live sandbox run → `LIVE VERIFIED` for DONE.
- **External/live dependencies:** Gateway sandbox + credentials + public webhook URL (needs RT-057).

## 1G. Phase 1 Testing & Gate

### RT-053 — E2E: customer journey
- **Phase:** 1 · **Priority:** P2 · **Status:** NOT STARTED (new tooling → needs user approval per AGENTS.md rule 3)
- **Objective:** Playwright (or approved E2E tool) covering: browse → search/filter → detail → cart → checkout (COD) → track; printing/bulk submits added when Phase 3 lands.
- **Spec refs:** §29.1 (E2E), §29.2 (critical journeys tested before launch), §30.2, §32.1.
- **Dependencies:** RT-010–RT-020, RT-007 (DB), tooling approval.
- **Files/areas likely affected:** `playwright.config.ts` (new), `e2e/*.spec.ts`, CI job, `package.json`.
- **Acceptance criteria:** Green run against local/staging with seeded data; covers §32.2 business-rule smoke (sale-price checkout, stock limits); CI job added.
- **Verification requirements:** Playwright report; CI run.
- **External/live dependencies:** RT-007; user approval for new tooling.

### RT-068 — Phase 1 gate verification & sign-off (docs/tasks.md T012)
- **Phase:** 1 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Execute the Phase 1 gate per §30.2: classify every Phase 1 requirement PASS / PARTIAL / FAIL / BLOCKED / N/A against spec + code + live DB; rewrite `docs/PHASE1_VERIFICATION.md` with real results; obtain user sign-off. Do not downgrade requirements to force PASS.
- **Spec refs:** §30.2, §32.1–32.3 (subset applicable to Phase 1), `docs/tasks.md` T012, CLAUDE.md principle 7.
- **Dependencies:** All Phase 1 packages 1A–1F (RT-001…RT-029, RT-053) DONE or explicitly waived by user.
- **Files/areas likely affected:** `docs/PHASE1_VERIFICATION.md` (rewrite), `docs/PHASES.md` (status correction), this file (status table).
- **Acceptance criteria:** Gate matrix published with command outputs; zero silent BLOCKED items; user sign-off recorded; Phase 2 authorized.
- **Verification requirements:** Full gate matrix: `tsc` ✓, `lint` ✓, `jest` + integration ✓, `build` ✓, E2E ✓, live DB/auth `LIVE VERIFIED`, security checklist ✓.
- **External/live dependencies:** Everything resolved or waived.

---

# PHASE 2 — Admin Dashboard & Analytics

**Goal:** `docs/PHASES.md` §2.1–2.8 complete: advanced order management, analytics, product analytics, settings/business config, activity export — plus spec §16 recommendations and §21.3 deletion.
**Entry gate:** Phase 1 signed off (RT-068).

## 2A. Advanced Admin Operations

### RT-040 — Advanced order management: search, bulk updates, notes, manual orders, export
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §17.2/PHASES 2.2: search by order ID/customer/phone/date range/status/payment; bulk status updates (per-row transition validation); **admin notes on orders (column + API exist, no UI)**; manual phone-order creation; CSV export.
- **Spec refs:** §17.2, §9.1 (transitions only via validated path), §18.1, `docs/PHASES.md` 2.2.
- **Dependencies:** RT-007, RT-006 (admin auth stable); Phase 1 gate.
- **Files/areas likely affected:** `src/app/admin/orders/page.tsx` (+ detail), `src/app/api/admin/orders/*`, order RPCs, tests.
- **Acceptance criteria:** Bulk updates run per-order validation (no lifecycle bypass); export matches filters; manual orders enforce stock + totals like customer orders; notes editable server-side with activity log; rate-limited; `requireAdmin`.
- **Verification requirements:** `tsc`, `lint`, `jest`; live admin run.
- **External/live dependencies:** RT-007.

### RT-041 — Product & revenue analytics (replace Analytics placeholder)
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §22.1/PHASES 2.3: best sellers, revenue (daily/weekly/monthly), sales by category/method/status, low/velocity products, category performance, stock alerts, **inventory log view** (T003 remainder), privacy-conscious product view counts; replace `src/app/admin/analytics/page.tsx` placeholder.
- **Spec refs:** `docs/PHASES.md` 2.3, §17.1, §22.1 (privacy — avoid unnecessary tracking), `docs/tasks.md` T003 remainder.
- **Dependencies:** RT-007, RT-040.
- **Files/areas likely affected:** `src/app/admin/analytics/page.tsx`, `src/app/api/admin/analytics/*`, aggregation SQL/RPC migration, chart components.
- **Acceptance criteria:** Aggregates computed in DB (not client-side over full tables); empty states; date ranges; `requireAdmin`; numbers consistent with dashboard; inventory log viewable per product.
- **Verification requirements:** `tsc`, `lint`, `jest` (live-gated RPC tests); live spot-check vs raw SQL.
- **External/live dependencies:** RT-007 (+ RT-008 test extensions).

### RT-042 — Business settings UI + wire `business_settings`
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §21.4/PHASES 2.8: admin UI for store name, hours, address, contact, WhatsApp number, payment-method toggles, default delivery fee; storefront reads via cached server helper. (`business_settings` table exists with **zero code references** today.)
- **Spec refs:** §21.4, §20.1, §5.1 (homepage consumes), §8.2, `docs/PHASES.md` 2.8.
- **Dependencies:** RT-007, RT-012, RT-046 (scope coordination: content vs settings).
- **Files/areas likely affected:** `src/app/admin/settings/*` (extend), `src/app/api/admin/settings/*`, `src/lib/business-config.ts` (extend), storefront pages (home, visit, footer, WhatsApp CTAs).
- **Acceptance criteria:** Storefront contact/hours/WhatsApp/fees come from DB with TTL cache; super-admin-only writes; validation (phone/URL); activity log on change; WhatsApp number finally wired to all CTAs (T005 remainder).
- **Verification requirements:** `tsc`, `lint`, `jest`; live edit → storefront reflects change.
- **External/live dependencies:** RT-007.

### RT-043 — Recommended products (spec §16) admin + storefront
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Admin manually controls Recommended products (§16.1 — no AI engine); display on homepage, product detail page and category page (PHASES 5.6 surfaces). Schema flag `products.is_featured` exists; `reviews.is_featured` display exists but has **no admin toggle** (covered by RT-066).
- **Spec refs:** §16.1, §5.1.10, §6.5, `docs/PHASES.md` 5.6.
- **Dependencies:** RT-010 (homepage rails), RT-042 (ordering setting optional).
- **Files/areas likely affected:** admin products list/form (toggle), `src/lib/products.ts` (featured queries), home + product detail + category components.
- **Acceptance criteria:** Flag togglable by admin; recommended rails on homepage, product detail, and category pages; never shows out-of-stock items; empty state.
- **Verification requirements:** `tsc`, `lint`, `jest`; live toggle → storefront.
- **External/live dependencies:** RT-007.

### RT-066 — Advanced review management (filters, featured selection)
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** PHASES 2.6: filter reviews by product/rating/date, search; **featured-review selection UI** (`reviews.is_featured` is displayed by `ProductReviews.tsx` and returned by the API, but no admin toggle/write path exists); moderation workflow completeness check (remove-only per §15.2).
- **Spec refs:** `docs/PHASES.md` 2.6, §15.2 (remove-only — never edit customer content), §17.2.
- **Dependencies:** RT-007, RT-040 (admin patterns).
- **Files/areas likely affected:** `src/app/admin/reviews/page.tsx`, `src/app/api/admin/reviews/*`, new RPC/migration for `is_featured` toggle with admin check, activity logging.
- **Acceptance criteria:** Filters work; feature/unfeature toggles server-side with `requireAdmin` + log; admin can never edit review text (data-layer enforced); storefront shows featured badge only for featured, non-removed reviews.
- **Verification requirements:** `tsc`, `lint`, `jest`; live toggle → storefront.
- **External/live dependencies:** RT-007.

### RT-044 — Activity log export & retention
- **Phase:** 2 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** PHASES 2.7: CSV export of filtered activity logs (action type, admin user, date range, search); retention/cleanup policy per §21.1 (confirm duration at implementation); tamper-resistance review (§21.1).
- **Spec refs:** §21.1, §18.1 (super-admin only), `docs/PHASES.md` 2.7.
- **Dependencies:** RT-007.
- **Files/areas likely affected:** `src/app/admin/activity/page.tsx`, `src/app/api/admin/activity/export/route.ts`.
- **Acceptance criteria:** Export matches active filters; rate-limited; role-gated; no secrets/PII beyond spec in export; retention job documented.
- **Verification requirements:** `tsc`, `lint`, `jest`; live export.
- **External/live dependencies:** RT-007.

### RT-045 — Customer data deletion workflow (§21.3)
- **Phase:** 2 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Support §21.3: customer contacts shop → admin handles deletion/anonymization/retention — implement server-side `anonymize_customer` RPC + super-admin UI (orders/financials preserved for accounting), activity-logged, double-confirmed.
- **Spec refs:** §21.3, §28.7, §11.4 (order history integrity), `docs/PHASES.md` 6.6 (data procedures).
- **Dependencies:** RT-007, RT-012 (privacy page references the process).
- **Files/areas likely affected:** `src/app/admin/customers/[id]` actions, `src/app/api/admin/customers/[id]/*`, RPC migration, storage cleanup.
- **Acceptance criteria:** PII (name/phone/email) scrubbed while orders preserved; RLS-safe; audit entry; note that spec requires **manual handling** — UI assists but does not auto-delete without explicit super-admin confirmation.
- **Verification requirements:** `tsc`, `lint`, `jest` (live-gated RPC test); live run on test data.
- **External/live dependencies:** RT-007.

## 2B. Settings Integrations (decision-blocked)

### RT-067 — Email/SMTP configuration (PHASES 2.8)
- **Phase:** 2 · **Priority:** P3 · **Status:** DEFERRED (decision **D-7** — no SMTP provider selected)
- **Objective:** Admin settings for SMTP/transactional email (host, port, user, from-address, test-send); enable password-reset email delivery beyond Supabase's built-in reset link; optional order-confirmation email (PHASES 5.4 = optional).
- **Spec refs:** `docs/PHASES.md` 2.8 & 5.4 (optional), §19.2 (secure email reset), §28.1 (transactional email).
- **Dependencies:** RT-042 (settings shell), D-7 provider decision.
- **Files/areas likely affected:** admin settings page, `src/lib/mailer.ts` (new), `.env.example`, tests.
- **Acceptance criteria:** Config stored (secrets encrypted or env-based — never in git); test-send button; password-reset flow uses configured transport when available, degrades to Supabase link otherwise; no email feature claims without live send proof.
- **Verification requirements:** `tsc`, `lint`, `jest`; **live send** required for DONE (`LIVE VERIFIED`).
- **External/live dependencies:** SMTP provider account (D-7).

---

# PHASE 3 — Printing & Bulk Services

**Goal:** `docs/PHASES.md` §3.1–3.7 and spec §12/§13 complete: printing hub, service pages, request flows, tracking, admin workflows, bulk orders, service SEO.
**Entry gate:** Phase 1 signed off; **decision D-4 confirmed** (sequencing of §4.1 printing/bulk pages).

### RT-034 — Data model redesign: `printing_requests` + `bulk_requests`
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace/migrate spec-mismatched `order_requests` (001: `order_id NOT NULL`, statuses `pending/approved/rejected`) with models supporting §12.3 (`Requested → Processing → Completed/Cancelled`, admin notes, **manual WhatsApp pricing — no quotation system**) and §13.4 (`Requested → Processing → Ready → Completed/Cancelled`, service-specific options, **no website document upload** per §13.3), standalone request IDs, default-deny RLS.
- **Spec refs:** §12.1–12.3, §13.1–13.5, §28.5, `docs/PHASES.md` 3.x; **spec outranks PHASES** where they conflict (e.g., no quote system, no uploads).
- **Dependencies:** RT-007, RT-008 (RLS harness to extend).
- **Files/areas likely affected:** new migrations (never edit applied 001–007), `supabase/tests/verify_phase1.sql` (extend), placeholder pages (RT-039).
- **Acceptance criteria:** Tables + enums + RLS (default-deny) + transition RPCs with admin checks; `product_requests` untouched; migration documented/reversible; SQL injection-safe RPCs; service pricing admin-managed (§13.2, feeds RT-042/RT-035).
- **Verification requirements:** Migration apply + new RLS assertions in integration suite → `LIVE VERIFIED` at RT-008 run.
- **External/live dependencies:** RT-007.

### RT-035 — Printing hub + service pages (customer)
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED (scope: D-4)
- **Objective:** Public Printing Hub (`/printing`) + individual service pages for all nine services (§13.1: photocopy, card hard copies, vehicle cards, binding, applications, design/logo, passport photos, 4×6, A4) with descriptions and admin-managed pricing (§13.2), gallery (PHASES 3.1), local-intent SEO (§23.5, §23.2).
- **Spec refs:** §4.1, §13.1–13.2, §23.5, §23.2, §27.3 (printing visual treatment).
- **Dependencies:** RT-011 (chrome), RT-012 (page patterns), RT-034 (pricing source).
- **Files/areas likely affected:** `src/app/printing/**`, `src/lib/printing.ts` (or DB-driven services via `business_settings` — coordinate RT-042), locales.
- **Acceptance criteria:** `/printing` + nine service routes with unique metadata, Service/Product JSON-LD, breadcrumbs (§23.6); pricing editable without deploys; WhatsApp CTA §13.6; mobile-optimized.
- **Verification requirements:** `tsc`, `lint`, `build`; schema validation; route smoke.
- **External/live dependencies:** None.

### RT-036 — Customer printing request submission
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §13.3 request form: service selection, quantity, service-specific options, pickup/delivery preference, optional message → creates `printing_requests` row (status `Requested`), returns **Request ID**, WhatsApp handoff with prefilled message (§13.6). **No document upload — documents go via WhatsApp (§13.3 explicit rule).**
- **Spec refs:** §13.3, §13.4, §13.6, §28.4 validation, §1.3 (Request Printing).
- **Dependencies:** RT-034.
- **Files/areas likely affected:** `src/app/printing/request/page.tsx`, `src/app/api/printing-requests/*` (validated, rate-limited, service-role insert — same pattern as `product_requests`), translations.
- **Acceptance criteria:** Validation server-side (service exists, quantity bounds, phone format); confirmation page shows Request ID + next steps; WhatsApp prefilled with Request ID/name/service/quantity (§13.6); anonymous submission allowed; default-deny RLS respected.
- **Verification requirements:** `tsc`, `lint`, `jest` (validation); live submit post-RT-007.
- **External/live dependencies:** RT-007.

### RT-037 — Bulk order customer form
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED (scope: D-4)
- **Objective:** §12.2 form: name, WhatsApp, organization/school/team name, products & quantities, optional message; eligibility messaging (§12.1); confirmation with request ID; pricing handled manually via WhatsApp (no quote system).
- **Spec refs:** §12.1–12.3, §14 pattern (reuse request UX), §1.3 (Bulk Order).
- **Dependencies:** RT-034, RT-035 (linked from printing/bulk pages).
- **Files/areas likely affected:** `src/app/bulk-orders/page.tsx` (or `/shop/bulk-orders`), `src/app/api/bulk-requests/*`, locales.
- **Acceptance criteria:** Server-side validation; status `Requested` per §12.3; default-deny RLS; pending request appears in dashboard notifications (§17.1 "Pending bulk requests").
- **Verification requirements:** `tsc`, `lint`, `jest`; live submit.
- **External/live dependencies:** RT-007.

### RT-038 — Printing request tracking page
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §13.5: track by Request ID + WhatsApp; display customer name, service, quantity, status, relevant details; WhatsApp contact link prefilled.
- **Spec refs:** §13.5, §13.4.
- **Dependencies:** RT-034, RT-036.
- **Files/areas likely affected:** `src/app/printing/track/page.tsx`, `src/app/api/printing-requests/track/route.ts`.
- **Acceptance criteria:** Status timeline; no data leak on wrong ID (generic error); prefilled WhatsApp contact; mobile-optimized (§26.3 printing request flow).
- **Verification requirements:** `tsc`, `lint`, `jest`; live tracking.
- **External/live dependencies:** RT-007.

### RT-039 — Admin Printing Requests & Bulk Orders pages (replace placeholders)
- **Phase:** 3 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace `SectionPlaceholder`s at `src/app/admin/printing-requests/page.tsx` and `src/app/admin/bulk-orders/page.tsx`: lists with search/filter, details, workflow transitions (§13.4 / §12.3), **admin notes** (both workflows), staff assignment (PHASES 3.4), contact-customer workflow, bulk status updates.
- **Spec refs:** §12.3, §13.4, §17.2, §18.1, §20.1 (pending requests → dashboard), `docs/PHASES.md` 3.4/3.6.
- **Dependencies:** RT-034, RT-036, RT-037.
- **Files/areas likely affected:** both placeholder pages, `src/app/api/admin/printing/*`, `src/app/api/admin/bulk/*`, transition RPC migrations.
- **Acceptance criteria:** All statuses transitionable with server-side validation; **no quotation system** (manual WhatsApp pricing per §12.3) — notes only; `requireAdmin` on every route; new requests surface in dashboard notifications; activity logged.
- **Verification requirements:** `tsc`, `lint`, `jest`; live workflow run.
- **External/live dependencies:** RT-007.

---

# PHASE 4 — Delivery & Fulfillment

**Goal:** `docs/PHASES.md` §4.1–4.6: returns/refunds workflow, delivery reports, failed-delivery tracking, enhanced tracking.
**Entry gate:** Phase 1 signed off (zones/pickup/assignment already exist from T005).

### RT-030 — Returns process support (spec §11 — WhatsApp-based, no web form)
- **Phase:** 4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Implement §11 exactly: returns are **requested through WhatsApp/contact** (no web return form) — build process support: prefilled WhatsApp return message (order ID, reason), Returns page content (done in RT-012) enforcing the rules: within 1 day after delivery, unopened (normal) vs inspection-friendly damaged/wrong claim, customer vs shop return shipping split.
- **Spec refs:** §11.1, §11.2, §11.4 (admin manually adjusts stock), §13.6 pattern for prefilled messages.
- **Dependencies:** RT-012, RT-008 (stock functions verified live).
- **Files/areas likely affected:** `src/app/shop/track/page.tsx` (return CTA after delivery), `src/app/(public)/returns/page.tsx` (rule text), `src/lib/business-config.ts` (prefill), admin via RT-031.
- **Acceptance criteria:** Delivered orders show a "Request return" WhatsApp CTA with prefilled order details; rule windows stated per §11; **no web form invented**; stock returns only via admin manual adjust (§11.4).
- **Verification requirements:** `tsc`, `lint`, `jest`; live WhatsApp link check.
- **External/live dependencies:** RT-007 (order data).

### RT-031 — Admin Returns/Refunds page (replace placeholder)
- **Phase:** 4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace `SectionPlaceholder` at `src/app/admin/refunds/page.tsx` with the §11.3 workflow: return/damage claims list (name, WhatsApp, order, reason, photos for damaged claims), approve/reject, refund processing (2–3 business days after approval, via JazzCash/Easypaisa, gateway refund if RT-029 exists else manual record), stock restoration guidance (§11.4), activity logging.
- **Spec refs:** §11.3, §11.4, §17.2 (Refunds/Returns nav), §10.5, §21.1 (refund logs).
- **Dependencies:** RT-030, RT-006; payments refund primitives exist (T006).
- **Files/areas likely affected:** `src/app/admin/refunds/page.tsx`, `src/app/api/admin/refunds/*`, new migration (claims table) if needed, `activity_logs`.
- **Acceptance criteria:** Claims workflow server-enforced; refund requires reference (existing rule); stock restored manually with logged instruction or guided adjustment (§11.4); `requireAdmin`; damaged-claim photos viewable by admin only.
- **Verification requirements:** `tsc`, `lint`, `jest`; live admin flow.
- **External/live dependencies:** RT-007.

### RT-032 — Delivery operations: schedule, reports, picking list
- **Phase:** 4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** PHASES 4.3/4.5: daily delivery schedule, picking list for warehouse, delivery performance metrics, CSV export; barcode/QR generation optional → **DEFERRED** (PHASES marks optional — revisit after core).
- **Spec refs:** `docs/PHASES.md` 4.3/4.5, §17.2, §9.1 statuses.
- **Dependencies:** RT-007, RT-040 (order list APIs reused).
- **Files/areas likely affected:** `src/app/admin/delivery/*` (schedule/report subpages), `src/app/api/admin/delivery/*`, CSV exports.
- **Acceptance criteria:** Date-filtered schedule; printable picking list; CSV export; transitions reuse `transition_order_status` (no parallel logic); metrics match analytics (RT-041).
- **Verification requirements:** `tsc`, `lint`, `jest`, `build`; live data check.
- **External/live dependencies:** RT-007.

### RT-033 — Failed delivery handling & customer contact attempts
- **Phase:** 4 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** PHASES 4.5: failed-delivery recording (reason, contact attempts), re-attempt/return-to-sender handling within §9.1 statuses (no new statuses without spec amendment — flag conflict if needed), WhatsApp contact links; enhanced tracking display (PHASES 4.4: assigned date/time already in §9.4 — verify UI shows it).
- **Spec refs:** `docs/PHASES.md` 4.4/4.5, §9.1, §9.4, §20.1 (cancellation/important events).
- **Dependencies:** RT-032, RT-042 (contact settings).
- **Files/areas likely affected:** admin delivery/order UI, order APIs, `business_settings`, tracking page.
- **Acceptance criteria:** Failed attempt recorded with reason + contact log; customer-visible next steps via WhatsApp; assigned delivery date/time visible on tracking (§9.4); no status outside §9.1 without user-approved spec change.
- **Verification requirements:** `tsc`, `lint`, `jest`; live simulation.
- **External/live dependencies:** RT-007; WhatsApp (link-based, per spec no auto-notifications).

---

# PHASE 5 — Marketing & Content

**Goal:** `docs/PHASES.md` §5.1–5.5: content management, SEO administration, analytics integrations.
**Entry gate:** Phase 2 complete (settings/content shell from RT-042).

### RT-046 — Website content management (replace placeholder)
- **Phase:** 5 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §21.4/PHASES 5.1: replace `src/app/admin/website-content/page.tsx` placeholder — editable About, Services, Contact, Address, Business hours, Homepage promotional sections (hero, banners), FAQs, Delivery info, Returns policy, Terms, Privacy; draft/publish; image upload to public bucket with §28.6 validation.
- **Spec refs:** §21.4, §5.1.14, §28.6, §23.13 (content feeds SEO).
- **Dependencies:** RT-042 (settings infra), RT-010 (homepage consumes), RT-043 (sequence after — overlapping rails).
- **Files/areas likely affected:** placeholder page, `src/app/api/admin/content/*`, content tables (new migration or JSONB), storefront pages (switch to published content), cache invalidation.
- **Acceptance criteria:** Admin edits/publishes hero + banners + page content without deploys; storefront renders published only; upload validation; cache invalidation on publish; role-gated per §18.1; activity-logged (§21.1 content changes).
- **Verification requirements:** `tsc`, `lint`, `jest`; live publish cycle.
- **External/live dependencies:** RT-007 storage.

### RT-047 — SEO administration (§23.13)
- **Phase:** 5 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Admin SEO controls: default meta templates, per-page overrides (products/services), keywords where useful, OG/social metadata, canonical URL config, verification tags (GSC), sitemap regeneration triggers.
- **Spec refs:** §23.13, §23.10, §23.7 (verification support), §23.2 (local keywords).
- **Dependencies:** RT-021–RT-024 (base SEO shipped in Phase 1).
- **Files/areas likely affected:** `src/app/admin/seo/page.tsx` (new), content tables, `src/lib/seo.ts`.
- **Acceptance criteria:** Overrides flow into `generateMetadata`; verification meta served site-wide; sitemap reflects published URLs; local keywords (Pandiali, Mohmand, KPK) support per §23.1.
- **Verification requirements:** `tsc`, `lint`, `build` + HTML assertions.
- **External/live dependencies:** GSC account (user, later).

### RT-048 — Analytics integrations (GA, Search Console)
- **Phase:** 5 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** §22.1/PHASES 5.3: GA + GSC integration — IDs from settings, script injected only when configured, deferred (§24.2), privacy-respecting (§22.1 "avoid unnecessary tracking"), cookie/consent handling (PHASES 6.6), conversion tracking (orders/leads), admin link panel.
- **Spec refs:** §22.1, §24.2, §28.10, `docs/PHASES.md` 5.3/6.6.
- **Dependencies:** RT-042 (settings), RT-057 (production domain for verification).
- **Files/areas likely affected:** layout/analytics provider component, settings API, admin settings page, consent banner component if required.
- **Acceptance criteria:** No GA script when ID unset; deferred loading; consent mechanism per privacy requirement; conversion events fire on order confirmation; GTM/GSC verification via RT-047.
- **Verification requirements:** `tsc`, `lint`, `build`; live tag check post-deploy.
- **External/live dependencies:** GA/GSC accounts + production URL.

---

# PHASE 6 — Production Readiness

**Goal:** `docs/PHASES.md` §6.1–6.8: security hardening, testing & QA, deployment, monitoring, backups, docs, final spec-conformance audit.
**Entry gate:** Phases 1–5 complete (RT-049–RT-052 may start late Phase 5 where dependencies allow).

## 6A. Security Hardening (§6.3)

### RT-049 — Serverless-safe rate limiting
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Replace in-memory `Map` rate limiter with a Supabase-table or Upstash-backed limiter so limits hold across Vercel lambda instances; extend coverage to all mutating routes (12 admin GETs optional per risk review).
- **Spec refs:** §28.3, §19.1 (login throttling), §28.11, `docs/PHASES.md` 6.3.
- **Dependencies:** RT-007 (if DB-backed), RT-001.
- **Files/areas likely affected:** `src/lib/rate-limit.ts`, all `enforceRateLimit` callers, migration (if table), tests.
- **Acceptance criteria:** Cross-instance behavior documented/tested; login/order/upload/review limits enforced under burst; legit flows unaffected; limits documented.
- **Verification requirements:** `tsc`, `lint`, `jest` + live burst test (RT-009 extension).
- **External/live dependencies:** Possibly Upstash account (free tier) or Supabase table.

### RT-050 — Security headers & CSP
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** `next.config.js` `headers()`: CSP (allow Supabase, WhatsApp, Maps per RT-025, GA per RT-048), HSTS, `frame-ancestors`/X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.
- **Spec refs:** §28.3, §28.4, §6.2, §23.8, `docs/PHASES.md` 6.3.
- **Dependencies:** RT-001, RT-025, RT-048.
- **Files/areas likely affected:** `next.config.js`; inline-script strategy documented (nonce vs controlled `unsafe-inline`).
- **Acceptance criteria:** Headers present in `next start` responses; CSP does not break home/checkout/admin (smoke); optional report-only phase then enforce.
- **Verification requirements:** `build` + `curl -I` assertions; manual smoke.
- **External/live dependencies:** Production header check post-deploy.

### RT-051 — Dependency vulnerability remediation (decision D-3)
- **Phase:** 6 · **Priority:** P2 · **Status:** BLOCKED (**D-3**)
- **Objective:** Clear `npm audit` (46 vulns incl. 1 critical `next@14.2.35`): staged majors (Next 16, Jest 30, ESLint-Config-Next 16, Tailwind 4) or validated overrides; gates green after each bump.
- **Spec refs:** §28.1, §29.1, §32.3.
- **Dependencies:** RT-001, RT-003 (CI); prefer RT-053/RT-054 E2E landed first as safety net, else accept narrower risk with user.
- **Files/areas likely affected:** `package.json`, lockfile, `next.config.js`, `tailwind.config.ts`, `jest.config`, `.eslintrc`, source fixes for breaking changes.
- **Acceptance criteria:** `npm audit` zero critical/high (moderates documented); all gates green; app smoke passes; no unrelated refactors mixed in.
- **Verification requirements:** Full gate suite + E2E (if present) per upgrade commit.
- **External/live dependencies:** Decision D-3.

### RT-052 — Security test suite & review (§29.1)
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Automated security checks: RBAC denials (customer token → admin API 403), RLS anon checks, upload bypass attempts, IDOR on order/track endpoints, injection attempts, webhook forgery (post-RT-029); tamper-resistance review of activity logs (§21.1).
- **Spec refs:** §29.1, §32.3, §18.1, §28.4–28.6, §21.1.
- **Dependencies:** RT-008, RT-006, RT-009; extends with RT-029/RT-030/RT-031 as they land.
- **Files/areas likely affected:** `src/__tests__/security/*` (new), integration suite, CI job.
- **Acceptance criteria:** Suite runs in CI (live-gated parts skip cleanly without creds); threat checklist vs §32.3 signed off and recorded.
- **Verification requirements:** Suite logs + checklist artifact in this file.
- **External/live dependencies:** RT-007 credentials for live portion.

## 6B. Testing & QA (§6.8)

### RT-054 — E2E: admin journey
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Playwright coverage: login → dashboard → product CRUD → order lifecycle transitions → payment verify/refund → review moderation → (Phase 3) printing/bulk workflows → (Phase 2) notes/bulk updates.
- **Spec refs:** §29.1, §32.10, `docs/PHASES.md` 6.8.
- **Dependencies:** RT-053 (harness), RT-040, RT-039.
- **Files/areas likely affected:** `e2e/admin/*.spec.ts`, CI.
- **Acceptance criteria:** Lifecycle test asserts exactly-once stock deduction and negative cases fail-closed; permissions enforced (admin vs super-admin paths).
- **Verification requirements:** Playwright report; CI.
- **External/live dependencies:** RT-007.

### RT-055 — Automated accessibility tests (axe)
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** axe-core in CI over key templates (extends RT-026 manual audit); fail on critical regressions; screen-reader manual pass recorded (§25.4).
- **Spec refs:** §25.4, §29.1, `docs/PHASES.md` 6.5.
- **Dependencies:** RT-026, RT-053 (harness).
- **Files/areas likely affected:** e2e a11y specs, CI.
- **Acceptance criteria:** Zero critical/serious violations on agreed templates; reports archived.
- **Verification requirements:** axe reports in CI.
- **External/live dependencies:** None.

### RT-056 — Performance CI budgets (Lighthouse)
- **Phase:** 6 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** Lighthouse CI against §24.3 budgets on home/list/detail/cart; fail on regression; database query + caching verification (PHASES 6.4).
- **Spec refs:** §24.3, §29.1, `docs/PHASES.md` 6.4.
- **Dependencies:** RT-027, RT-053 (staging target).
- **Files/areas likely affected:** `lighthouserc.json`, CI.
- **Acceptance criteria:** Budgets pass on staging; trends stored; query hot spots reviewed.
- **Verification requirements:** Lighthouse CI results.
- **External/live dependencies:** Staging URL.

## 6C. Deployment & Operations (§6.1, §6.2)

### RT-057 — Production deployment (Vercel) & environment configuration
- **Phase:** 6 · **Priority:** P1 · **Status:** BLOCKED
- **Objective:** Provision/attach Vercel project; configure all §28.10 env vars (Supabase URL/anon/service-role, WhatsApp, payment keys post-RT-029, site URL); deploy a green build to production; verify (CDN/static assets come with the platform — PHASES 6.1).
- **Spec refs:** §28.9, §28.10, §28.3 (headers live), §23.11 (sitemap at domain), `docs/PHASES.md` 6.1.
- **Dependencies:** RT-001, RT-003, RT-007, RT-050, RT-051 (or documented audit-risk acceptance), RT-053 (safety net, if landed).
- **Files/areas likely affected:** Vercel dashboard (external), `.env.example` docs, optional `vercel.json`.
- **Acceptance criteria:** Production URL serves 200 on `/`, shop, tracking; `/admin` login works with prod Supabase; no secrets in repo; env vars scoped per §28.10; rollback procedure documented; staging/preview environment per §28.10.
- **Verification requirements:** Live HTTPS checks → `LIVE VERIFIED`: headers, `Secure` cookies, sitemap/robots fetch, lab CWV.
- **External/live dependencies:** **Vercel account, production domain, Supabase prod project.**

### RT-058 — Domain, DNS, SSL, WhatsApp click-to-chat live verification
- **Phase:** 6 · **Priority:** P1 · **Status:** BLOCKED
- **Objective:** Production DNS + valid TLS; WhatsApp `wa.me` links open correct number/prefilled message from the live site; Google Business Profile support per §23.7 (user plans to create — site must be ready).
- **Spec refs:** §23.3, §23.7, §13.6, §5.1.13, `docs/PHASES.md` 5.5.
- **Dependencies:** RT-057, RT-042.
- **Files/areas likely affected:** DNS (external), `business_settings`, verification docs.
- **Acceptance criteria:** TLS valid; WhatsApp links verified on phone; GBP-ready business info matches §23.3; GBP listing claimed or explicitly deferred by user.
- **Verification requirements:** Live browser + phone check → `LIVE VERIFIED`.
- **External/live dependencies:** Domain registrar, WhatsApp, Google Business Profile.

### RT-059 — Monitoring, logging, error reporting
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** §28.11 structured logging with sensitive-data protection; error tracking (Sentry or approved equivalent); uptime monitoring; alert channel; incident response procedures (PHASES 6.2).
- **Spec refs:** §28.11, §22.1, §32.3, `docs/PHASES.md` 6.2.
- **Dependencies:** RT-057; tooling approval if new service.
- **Files/areas likely affected:** logging helper, Sentry config, CI, dashboard panel.
- **Acceptance criteria:** Test error captured with release tag; logs scrubbed of tokens/PII; uptime alert configured; business/security events auditable (§28.11).
- **Verification requirements:** Test event observed live; log sample review.
- **External/live dependencies:** Sentry account (or alternative).

### RT-060 — Backups & recovery
- **Phase:** 6 · **Priority:** P2 · **Status:** BLOCKED (needs RT-007)
- **Objective:** Automated database backups (PHASES 6.1 daily) + documented, tested restore procedure (RPO/RTO stated).
- **Spec refs:** `docs/PHASES.md` 6.1, §28.10, §32.11.
- **Dependencies:** RT-007.
- **Files/areas likely affected:** Supabase dashboard (external), `docs/runbook-backup.md` (new).
- **Acceptance criteria:** Backup enabled; restore drill executed and documented.
- **Verification requirements:** Snapshot exists; drill log → `LIVE VERIFIED`.
- **External/live dependencies:** Supabase plan features.

### RT-061 — Runbooks & operational procedures
- **Phase:** 6 · **Priority:** P3 · **Status:** NOT STARTED
- **Objective:** PHASES 6.7: admin runbook, troubleshooting guide, deploy/rollback playbook, payment-webhook replay, order data corrections, RLS policy change procedure, backup/recovery, disaster recovery plan, customer support docs, internal SOP, incident checklist.
- **Spec refs:** `docs/PHASES.md` 6.7, §31, §28.11.
- **Dependencies:** RT-057, RT-059.
- **Files/areas likely affected:** `docs/` (new runbooks).
- **Acceptance criteria:** Each runbook has steps verified at least once (deploy/rollback executed).
- **Verification requirements:** Document review + one drill.
- **External/live dependencies:** Production access.

## 6D. Documentation & Final Production Gate

### RT-062 — Reconcile stale documentation with reality
- **Phase:** 6 · **Priority:** P1 · **Status:** NOT STARTED (interim pass allowed after RT-001; final pass here)
- **Objective:** Correct every false claim found by the audit: `docs/PHASES.md` ("Phase 1 Complete", "25 tests", Quick View/Search/gateway/bcrypt/HttpOnly claims), `docs/PHASE1_VERIFICATION.md` (build PASS, signup/login — superseded by RT-068 rewrite), `docs/README.md` (guest accounts, `next-i18n-router`, phantom `src/types`/`src/styles`), `docs/tasks.md` gate snapshot (2026-10-06), `docs/DATABASE.md` (legacy `confirmed` flow), `supabase/seed.sql` (wrong schema/data — must apply cleanly post-RT-007).
- **Spec refs:** CLAUDE.md principle 7, §31, AGENTS.md rule 7.
- **Dependencies:** None (interim after RT-001); execute final pass after Waves/Phases 1–5 so numbers are real.
- **Files/areas likely affected:** listed docs + seed; `docs/tasks.md` (archive/supersede with pointer to this file — decision recorded).
- **Acceptance criteria:** No doc contradicts the repo; test counts/commands match scripts; gate snapshot regenerated; seed matches migration schema and applies cleanly.
- **Verification requirements:** Fresh gate outputs embedded; grep for known false phrases returns nothing.
- **External/live dependencies:** None.

### RT-063 — Spec §31 documentation set
- **Phase:** 6 · **Priority:** P2 · **Status:** NOT STARTED
- **Objective:** Produce remaining §31 artifacts: `specs/` directory, `design/` directory (visual system from RT-065), Technical Architecture doc, User Flow Specification, Acceptance Criteria per major feature, Implementation Plan, Verification Plan.
- **Spec refs:** §31, §30.1.
- **Dependencies:** RT-062, RT-065 (design tokens feed `design/`), features largely complete.
- **Files/areas likely affected:** `specs/`, `design/`, `docs/` (new), README links.
- **Acceptance criteria:** Every §31 bullet exists, matches implementation, linked from `README.md`.
- **Verification requirements:** Checklist vs §31 list.
- **External/live dependencies:** None.

### RT-064 — Final spec-conformance audit (§32 quality gates)
- **Phase:** 6 · **Priority:** P1 · **Status:** NOT STARTED
- **Objective:** Re-run the full audit method as a **conformance pass** against every §32.1–32.11 gate: functional, business rules, security, accessibility, performance, SEO, responsive, payments, inventory, admin workflows, final audit (Requirements → Specification → Code → Tests all match). Covers `docs/PHASES.md` §6.6 data/privacy verification too (cookie consent, privacy policy compliance, data retention).
- **Spec refs:** §32.1–32.11, §33, §6.6 (PHASES), CLAUDE.md principle 7.
- **Dependencies:** **All prior tasks** (or explicitly user-approved DEFERRED/BLOCKED waivers).
- **Files/areas likely affected:** this file (final status table), spawned fix tasks.
- **Acceptance criteria:**
  1. Every status here is `DONE` or user-approved `DEFERRED`/`BLOCKED` with rationale.
  2. Gates green: `tsc`, `lint`, unit+integration+E2E, `build`, security suite, axe, Lighthouse budgets.
  3. Live: DB/RLS/auth/storage, payments (or documented COD-only waiver), deployment, production env — all `LIVE VERIFIED`.
  4. Documentation matches the system (RT-062/063 done).
- **Verification requirements:** Complete gate matrix published in this file with command outputs.
- **External/live dependencies:** Everything resolved or waived by user.

---

## Execution Rules (binding for all tasks)

1. **One task at a time**: Understand → Inspect → Plan → Implement → Verify → Review → Commit → Push → Update this file → **STOP for approval**.
2. A task is `DONE` only with: passing verification commands recorded, commit hash, push confirmed, and honest `STATIC`/`LIVE`/`BLOCKED` labeling. Live-dependent tasks stay `BLOCKED` until credentials exist — never fake verification.
3. Phase gates (§30.2): do not start Phase N+1 work until Phase N is signed off by the user, except parallel Phases 2/3/4 after the Phase 1 gate as the user allows.
4. New discoveries are appended here (preserving phase + dependency order) before implementation; only RT-001 may be in flight without prior user approval.
5. Never restore `stash@{0}` blindly; never commit secrets or broken gates; one commit type per task.
6. `docs/spec.md` outranks this file, `docs/PHASES.md`, and any stale doc; conflicts are surfaced to the user, not silently resolved (CLAUDE.md principle 3).

## Status Summary by Phase (update as tasks complete)

| Phase | Tasks | DONE | BLOCKED / DEFERRED |
|---|---|---|---|
| Phase 1 — Core Ecommerce | 32 | 0 | 5 blocked (RT-007/008/009/028/029) |
| Phase 2 — Admin & Analytics | 8 | 0 | 1 deferred (RT-067 / D-7) |
| Phase 3 — Printing & Bulk | 6 | 0 | 0 (D-4 sequencing) |
| Phase 4 — Delivery & Fulfillment | 4 | 0 | 0 |
| Phase 5 — Marketing & Content | 3 | 0 | 0 |
| Phase 6 — Production Readiness | 15 | 0 | 4 blocked (RT-051/D-3, RT-057, RT-058, RT-060) |
| **Total** | **68** | **0** | **10** |
