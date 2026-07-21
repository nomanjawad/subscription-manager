# Development Plan

Goal: a working subscription manager, built and demoed **entirely against the Mercury sandbox and a local database**, ready to present to the company. Going live afterwards is a config change (see README §3.4).

**Stack (decided):** Next.js (App Router, React, TypeScript) · Supabase local via Docker (Postgres) · Tailwind CSS · Mercury sandbox API. No email integration, no LLM, no cloud services in v1.

---

## Architecture principles

**1. Modular features — one module's development never touches another.**
Every feature lives in its own directory under `modules/`, owning its components, server actions/API handlers, and data-access code. Modules never import from each other's internals — only from `lib/` (shared clients) and the database contract (views/RPC). The `app/` directory contains thin route files that mount module components.

```
modules/
├── m01-cards/           # Mercury card sync + card picker
├── m02-subscriptions/   # Form, list, lifecycle
├── m03-transactions/    # Mercury transaction sync (no UI)
├── m04-matching/        # Pure matching engine + unit tests
├── m05-review/          # Needs-review queue
└── m06-dashboard/       # Spend totals, upcoming renewals
```

**2. Filtering and aggregation run in the database, not in JS.**
All list filtering, spend totals, and cross-table reads are **Postgres functions (RPC) and views**, called via `supabase.rpc(...)` / view selects. The database does the heavy lifting server-side — no fetching whole tables to filter in the app. (Postgres functions fill the "cloud function" role here; separate Edge Functions aren't needed since Next.js API routes + database RPC cover everything, with less moving parts.)

**3. Cross-table access goes through joins/views owned by the schema, never through another module's code.**
Modules that need data from two tables (e.g. dashboard needs `subscriptions` + `renewal_checks`) consume a **database view or RPC with FK joins** (e.g. `subscription_overview`, `dashboard_totals`). If a table's internals change, only its views/functions are updated — consuming modules keep the same contract and are unaffected.

**4. Subagent development workflow.**
Independent modules are built by parallel subagents where dependencies allow. Two standing quality gates run before each phase is declared done:
- **Type-check agent** — runs `tsc --noEmit` + lint, fixes type errors
- **Bug-hunt agent** — reviews the new code for logic bugs, broken flows, and edge cases, and fixes what it confirms

---

## Phase 0 — Project setup *(~half a day)*

| # | Task | Done when |
|---|---|---|
| 0.1 | Scaffold Next.js app (TypeScript, Tailwind, App Router) | `npm run dev` serves the starter page |
| 0.2 | `supabase init` + `supabase start` (Docker) | Supabase Studio opens at `localhost:54323` |
| 0.3 | Create `.env.local`: `MERCURY_API_URL`, `MERCURY_API_TOKEN` (sandbox), Supabase URL + keys | — |
| 0.4 | Mercury client module `lib/mercury.ts` with a connectivity check | A test route returns the sandbox's dummy accounts as JSON |

## Phase 1 — Data layer + subscription tracking *(~2 days)*

**Usable outcome:** the app is a real subscription tracker, even before any automation.

### Database schema (one migration)

| Table | Purpose | Key columns |
|---|---|---|
| `cards` | Mercury cards, synced via API — feeds the form dropdown | `mercury_card_id`, `nickname`, `last4`, `status`, `synced_at` |
| `subscriptions` | The core record from the form | `platform`, `product`, `order_number`, `amount`, `currency`, `billing_cycle` (monthly/yearly), `next_renewal_date`, `card_id → cards`, `account_email`, `status` (active/cancelled), `notes` |
| `transactions` | Local cache of Mercury transactions | `mercury_transaction_id` (unique), `amount`, `status` (pending/sent/failed/…), `counterparty_name`, `bank_description`, `card_ref`, `posted_at`, `failed_at`, `reason_for_failure`, `raw` (jsonb) |
| `renewal_checks` | One row per expected renewal — the verification audit trail | `subscription_id`, `expected_date`, `expected_amount`, `status` (pending/renewed/failed/needs_review), `matched_transaction_id`, `resolution_note`, `resolved_at` |
| `merchant_aliases` | Learned statement descriptors per subscription | `subscription_id`, `descriptor_pattern`, `learned_from_transaction_id` |

### Tasks

| # | Task | Done when |
|---|---|---|
| 1.1 | Write the migration, `supabase db reset` applies it | All 5 tables visible in Studio |
| 1.2 | Card sync: `POST /api/sync/cards` pulls Mercury cards into `cards` | Sandbox cards appear in the table |
| 1.3 | Subscription form (create/edit) with **card dropdown** fed from `cards` | Can add a subscription end-to-end |
| 1.4 | Subscription list page with status badges, edit/cancel actions | — |

## Phase 2 — Sync + matching engine *(~3 days, the core)*

**Usable outcome:** renewals verify themselves; the review queue is the daily workflow.

| # | Task | Done when |
|---|---|---|
| 2.1 | Transaction sync: `POST /api/sync/transactions` upserts recent Mercury transactions | Sandbox transactions land in `transactions` |
| 2.2 | Renewal-check generator: for each active subscription with `next_renewal_date` inside the window, create a `renewal_checks` row | — |
| 2.3 | **Matching engine** (`lib/matching.ts`): match a pending check against transactions on same card + amount within ±5% + date within ±3 days + merchant-alias match. Also match **failed** transactions (`status: failed`) → mark check `failed` with `reason_for_failure` | Unit-testable pure function; tests pass |
| 2.4 | Check runner: `POST /api/cron/check-renewals` = sync → generate checks → run matching → set statuses; on `renewed`, advance `next_renewal_date` by one cycle. (Triggered by a button/manually in dev; becomes Vercel Cron in production) | One click verifies all due renewals |
| 2.5 | **Review queue UI**: unresolved checks, each showing near-miss transactions + a Confirm (learns a merchant alias) / Mark failed action | Confirming a match auto-matches that vendor next cycle |

## Phase 3 — Dashboard + demo prep *(~2 days)*

| # | Task | Done when |
|---|---|---|
| 3.1 | Dashboard: renewals due this month, monthly + yearly spend totals, per-platform breakdown, needs-review count | — |
| 3.2 | Renewal history view per subscription (its `renewal_checks` trail) | — |
| 3.3 | **Demo seed script**: read actual sandbox transactions, then create subscriptions whose card/amount/merchant match some of them — so matching succeeds live, one fails, one lands in review | Demo shows all three outcomes |
| 3.4 | Pass through the demo script below start-to-finish | — |

### Demo script (for the company presentation)

1. Dashboard: current subscriptions, spend totals, upcoming renewals
2. Add a new subscription live — card picked from the real (sandbox) Mercury card list
3. Click "Run renewal check" → one subscription auto-verifies against a bank transaction
4. Show a **failed** renewal with Mercury's failure reason attached
5. Resolve a needs-review item → point out the app just *learned* that vendor's statement descriptor
6. Close: "going live = the company's read-only Mercury token + two env vars"

## Phase 3.5 — Teams, roles & analytics *(done)*

Two-role access model layered on the existing JWT auth.

- **Roles:** `admin` and `team_lead`. Role + team live in the Supabase JWT (`app_metadata`) so middleware authorizes without a DB hit, mirrored in a `profiles` table for the admin UI and joins. `ADMIN_EMAILS` remains the bootstrap super-admin (no profile row needed).
- **Teams (categories):** a `teams` table (`name`, `auto_approve`). Requests and subscriptions carry a `team_id` (FK `ON DELETE SET NULL` → nothing is lost if a team is deleted).
- **Request routing:** the public form makes the requester pick a team. If that team has `auto_approve`, the request skips manual review and lands straight in "pending purchase"; otherwise it waits for a reviewer.
- **Team leads** (module `m08-teams`) see and act on **only their own team's** requests, subscriptions, review items, and spend — approve/reject/**purchase** included. Enforced in every server action (they're public endpoints), not just hidden in the UI. Team-scoped reads use the `p_team_id` parameter added to the aggregate RPCs.
- **Admins** manage teams + team leads (create teams, add a lead with a temporary password via the GoTrue admin API, toggle auto-approve) on `/teams`, and see cross-team + cross-card spend on `/analytics` (`spend_by_team` / `spend_by_card` — the latter covers *all* synced Mercury transactions, not just renewals). `/teams` and `/analytics` are admin-only (middleware `ADMIN_ONLY_PREFIXES`).
- **Modules added:** `m08-teams` (teams + roles + lead accounts) and `m09-analytics`. Migration `20260721090000_teams_and_roles.sql`.

## Phase 4 — Production deployment *(only after company approval)*

> Supabase Cloud and auth already exist (done during development). Remaining:

1. **Replace the dev admin credentials** — the dev login is `admin@example.com` / `password` (deliberately throwaway). Create the real admin user(s) in Supabase Auth, update `ADMIN_EMAILS`, delete the dev user. Then create the real **teams** and add **team leads** (each gets a temporary password to change on first login).
2. Regenerate `CRON_SECRET` (random 32+ chars) for production
3. Deploy to Vercel; add `vercel.json` cron hitting `/api/cron/check-renewals` daily (note: Vercel cron sends GET — the route currently accepts POST only; adjust one or the other)
4. Create a **read-only token** in the company's real Mercury account
5. Set production env vars: `MERCURY_API_URL=https://api.mercury.com/api/v1`, real token, Supabase URL/keys, `ADMIN_EMAILS`, `CRON_SECRET`
6. Backups: Supabase free tier has none — upgrade to Pro or schedule `pg_dump` before real data lands
7. Clear demo/sandbox data (seeded subscriptions, test requests) before go-live
8. Optional later: Slack/email alert on failed renewals; email receipt parsing (README §4.2) if non-Mercury subscriptions ever appear

---

## Project structure

```
subscription-manager/
├── app/                            # Thin routes only — mount module components
│   ├── page.tsx                    # → m06-dashboard
│   ├── subscriptions/page.tsx      # → m02-subscriptions
│   ├── review/page.tsx             # → m05-review
│   └── api/
│       ├── mercury/health/route.ts
│       ├── sync/cards/route.ts         # → m01-cards handler
│       ├── sync/transactions/route.ts  # → m03-transactions handler
│       └── cron/check-renewals/route.ts# → orchestrates m03 + m04
├── modules/
│   ├── m01-cards/          # sync.ts, CardPicker.tsx, queries.ts
│   ├── m02-subscriptions/  # SubscriptionForm.tsx, SubscriptionList.tsx, actions.ts
│   ├── m03-transactions/   # sync.ts (no UI)
│   ├── m04-matching/       # engine.ts (pure), engine.test.ts
│   ├── m05-review/         # ReviewQueue.tsx, actions.ts
│   └── m06-dashboard/      # Dashboard.tsx, queries.ts (RPC calls only)
├── lib/
│   ├── mercury.ts                  # API client (reads MERCURY_API_URL/TOKEN)
│   └── supabase/                   # server + browser clients
├── supabase/
│   ├── migrations/                 # tables + views + RPC functions
│   └── seed.sql                    # Demo seed
└── .env.local                      # gitignored
```

## Environment variables

| Variable | Dev value |
|---|---|
| `MERCURY_API_URL` | `https://api-sandbox.mercury.com/api/v1` |
| `MERCURY_API_TOKEN` | sandbox token |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | printed by `supabase start` |

## Timeline summary

| Phase | Effort | Cumulative |
|---|---|---|
| 0 — Setup | 0.5 day | 0.5 day |
| 1 — Tracker | 2 days | ~2.5 days |
| 2 — Matching engine | 3 days | ~5.5 days |
| 3 — Dashboard + demo | 2 days | **~7.5 days to demo-ready** |
| 4 — Production | 1 day | after approval |
