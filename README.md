# Subscription Manager

In-house tool for tracking company subscriptions paid through [Mercury](https://mercury.com) virtual cards, automatically verifying that each renewal actually went through, and flagging the ones that didn't.

---

## 1. The Problem

The company pays for many subscriptions (SaaS tools, hosting, licenses) on different Mercury virtual cards. Today there is no single place that answers:

- What subscriptions do we have, on which card, for how much?
- Did this month's renewals actually charge successfully?
- Which renewals **failed silently** (expired card, insufficient balance, cancelled plan) so a service is about to be cut off?

This app is that single place. It tracks every subscription and **verifies renewals against real bank data**, so a failed payment surfaces as an alert instead of a surprise outage.

---

## 2. How It Works — High Level

```
                        ┌──────────────────────────────────────────┐
                        │        Next.js App (Vercel)              │
                        │                                          │
   You / Admin ───────▶ │  • Subscription form (add/edit)          │
                        │  • Dashboard (upcoming, spend, status)   │
                        │  • Needs-Review queue (manual override)  │
                        │                                          │
                        │  Vercel Cron ─▶ /api/cron/check-renewals │
                        └───────┬──────────────┬───────────┬───────┘
                                │              │           │
                                ▼              ▼           ▼
                        ┌────────────┐  ┌────────────┐  ┌─────────────────┐
                        │  Supabase  │  │  Mercury   │  │ Email Accounts  │
                        │  Postgres  │  │  API       │  │ Gmail API +     │
                        │  (data)    │  │ (read-only)│  │ IMAP (receipts) │
                        └────────────┘  └────────────┘  └─────────────────┘
```

| Layer | Technology | Role |
|---|---|---|
| Web app | Next.js (App Router) on Vercel | Form, dashboard, review queue, cron endpoint |
| Database | Supabase Postgres — Docker locally for dev; **self-hosted Docker on a VPS** or Supabase Cloud for prod (see §2.1) | All subscription and verification data |
| Bank data | Mercury API — **read-only token** | Transactions, cards, accounts (primary verification source) |
| Email *(optional — see §4.2)* | Gmail API (Google Workspace) + IMAP (other providers) | Receipt emails, only for non-Mercury payments or invoice detail |
| Parsing | Claude API | Turns messy receipt emails into structured data |
| Scheduler | Vercel Cron | Runs the daily renewal check |

### 2.1 Hosting strategy

| Phase | App | Database |
|---|---|---|
| **Now — development** | `next dev` locally | **Supabase Cloud** (project `skytech-sub-management`, Mumbai) — schema applied via `supabase db push`; deny-all RLS so only the server-side service key can read data |
| **Later — production** | Deploy to Vercel + daily cron | Same Supabase Cloud project (or a separate prod project); swap Mercury env vars to the real account |

The project started on a local Docker Supabase stack and was migrated to Supabase Cloud during development (the local stack was retired; its data survives in a Docker volume backup if ever needed). Migrations are the single source of truth — the same files apply to any environment. **Note:** the database can never run *on Vercel* itself — Vercel's Docker support runs stateless, autoscaling functions with no persistent disk.

**Security posture:** RLS enabled deny-all on every table (verified: the public REST API returns nothing to the publishable key); all RPC functions are `security invoker`, so RLS applies inside them too; the service-role key exists only in server-side env (never `NEXT_PUBLIC_`-prefixed, never in git); the cron endpoint requires a Bearer secret; the seed endpoint is disabled in production builds. Free tier has no automated backups — upgrade to Pro or schedule `pg_dump` before real company data lands here.

### Daily lifecycle of a subscription

1. **You register a subscription once** via the form.
2. Every day, a cron job checks which subscriptions are **due for renewal**.
3. For each due subscription it looks for a **matching charge in Mercury transactions** (primary check).
4. If Mercury can't confirm, it looks for a **receipt or failure email** in the connected inboxes (secondary check).
5. Result: the subscription is marked **`renewed`**, or it lands in the **Needs-Review queue** where you confirm or mark it **`failed`** manually. Manual override is always available.

---

## 3. How Subscription Information Is Captured

### 3.1 Manual entry (the form)

Each subscription is registered once through a form with these fields:

| Field | Example | Notes |
|---|---|---|
| Order number | `INV-2024-0091` | Your internal or vendor order reference |
| Platform | `Figma` | The vendor/service |
| Product | `Professional plan, 5 seats` | What exactly is being paid for |
| Amount + currency | `$75.00 USD` | Expected charge per cycle |
| Billing cycle | `monthly` / `yearly` | Drives the expected next-renewal date |
| Card | `•• 4821 — Design Team card` | **Picked from a dropdown, not typed** (see below) |
| Account email | `design@company.com` | Which inbox receives this vendor's receipts |
| Next renewal date | `2026-08-01` | Auto-advanced after each confirmed renewal |
| Status | `active` | Lifecycle status (see §5) |

### 3.2 Card data comes from Mercury, not from typing

Instead of manually typing "last 4 digits", the app calls Mercury's **`GET /cards`** endpoint and syncs your virtual cards into the database. The form shows a dropdown of real cards (nickname + last 4). This matters because:

- No typos in card numbers.
- The app stores the **Mercury card ID**, so transaction matching is exact instead of guessing by last-4.
- When a card is frozen/cancelled in Mercury, the app can flag every subscription attached to it.

### 3.3 Transaction data comes from the Mercury API

A read-only Mercury API token (created in Mercury → Settings → Tokens) lets the app pull:

- **`GET /accounts`** — all bank accounts.
- **`GET /account/{id}/transactions`** — transactions filtered by date/status. Synced daily and cached in the database.
- **`GET /cards`** — virtual card inventory.

The read-only tier **cannot move money or create cards**, requires no IP whitelist, and is free (Mercury's API is included with any Mercury account). The token lives in an environment variable, never in the repository.

### 3.4 Development uses the Mercury Sandbox

Development and the demo run against **Mercury's sandbox**, not the real company account:

| | Sandbox (dev/demo) | Production (after approval) |
|---|---|---|
| Account | Free signup at [sandbox.mercury.com/signup](https://sandbox.mercury.com/signup) — no business docs, no onboarding, pre-loaded with dummy orgs/accounts/transactions | The company's existing Mercury account |
| API base URL | `https://api-sandbox.mercury.com/api/v1/` | `https://api.mercury.com/api/v1/` |
| Token | Created in the sandbox dashboard (Settings → API Tokens) | Read-only token from the real account |

The app reads `MERCURY_API_URL` and `MERCURY_API_TOKEN` from environment variables, so **going live after the demo is a two-line `.env` change** — no code changes. Sandbox and production tokens are not interchangeable, so there's no risk of accidentally touching real data during development.

---

## 4. Renewal Verification

Verification uses two independent signals, in order of trust:

### 4.1 Primary: Mercury transaction matching

When a subscription's renewal date arrives, the daily cron searches the cached Mercury transactions for a charge that matches **all** of:

| Criterion | Rule | Why the tolerance |
|---|---|---|
| Card | Same Mercury card ID | Exact — no ambiguity |
| Amount | Expected amount ± small tolerance (~5%) | Tax, FX conversion, or price changes shift amounts slightly |
| Date | Renewal date ± 3 days | Vendors charge a bit early or late |
| Merchant | Matches a **known descriptor alias** | See below |

**Merchant descriptor aliases.** Bank statements rarely show the platform name you know — Google Workspace appears as `GOOGLE *GSUITE_yourco`, Figma as `FIGMA MONTHLY RENEWAL`, etc. The app keeps a `merchant_aliases` table: the **first** time a match needs manual confirmation, the descriptor is saved, and every future renewal of that subscription auto-matches. The system gets more automatic over time.

**Failure detection is also native.** Mercury's transaction `status` field includes `failed` (plus `reversed` and `blocked`), with a `failedAt` timestamp and a `reasonForFailure` field. So a declined renewal doesn't just show up as silence — the API reports the failed charge and why it failed. The matching engine checks for failed transactions the same way it checks for successful ones.

**Outcome:** a confirmed match marks the renewal `renewed`; a matched **failed** transaction marks it `failed` with Mercury's failure reason attached; either way the record links to the transaction that proved it (full audit trail).

### 4.2 Optional: email verification

Since Mercury's API reports failed charges directly (see §4.1), email is **not needed for the core workflow** as long as every subscription is paid through Mercury. It becomes worth building only if either of these happens: a subscription paid by another method (personal card, PayPal, bank the API can't see), or a need for invoice-level detail (plan names, invoice numbers, billing periods) that bank data doesn't carry. Kept here as a documented option, not a commitment.

**How it works:**

1. **Connect inboxes.** Google Workspace accounts connect via the **Gmail API with OAuth** (recommended — reliable, supports label filters and push notifications). Other providers connect via **IMAP polling**. Credentials/tokens are stored encrypted.
2. **Find candidate emails.** The cron searches connected inboxes for recent messages from known vendor domains (e.g. `billing@figma.com`) and generic billing patterns ("receipt", "invoice", "payment failed", "card declined").
3. **Parse with an LLM.** Receipt emails have wildly inconsistent formats, so instead of writing a regex per vendor, each candidate email body is sent to an LLM that returns structured JSON: `{ vendor, amount, currency, date, outcome: paid | failed, order_ref }`. This is a lightweight extraction task — no heavyweight model needed. During development, a **local model via Ollama** keeps email content on our machine (consistent with the local-first approach); if accuracy falls short, **Claude Haiku** with strict JSON schema output costs under $1/month at our volume. Free API tiers that require data-sharing opt-ins (e.g. Grok's $150/month program) are ruled out — company billing emails must not become training data.
4. **Corroborate.** The parsed result is matched against due subscriptions:
   - A **paid receipt** for a subscription Mercury couldn't confirm → suggested as `renewed` (goes to review queue with the email attached as evidence).
   - A **failure email** ("your payment was declined") → the subscription is flagged `failed` immediately. For Mercury-paid subscriptions this duplicates what the API already reports; its real value is covering **payments Mercury can't see**.

**Important:** email is treated as *evidence*, not truth. It suggests; the Mercury transaction or your manual confirmation decides.

### 4.3 Fallback: manual review

Anything unresolved lands in the **Needs-Review queue** — the heart of the daily workflow. Each entry shows the expected renewal, the closest near-miss transactions, and any related emails. You click **Confirm** (optionally teaching a new merchant alias) or **Mark failed**. Nothing is ever silently dropped: every due renewal ends in `renewed` or `failed`, by machine or by you.

---

## 5. Status Lifecycle

```
                    ┌────────── renewal date approaching ──────────┐
                    ▼                                              │
 active ──▶ upcoming ──▶ due ──▶ ┌─ renewed ✓ (match found) ───────┘  (date advances,
                                 │                                     cycle repeats)
                                 ├─ needs_review ⚠ (no match) ──▶ renewed / failed (manual)
                                 └─ failed ✗ (failed transaction in Mercury, or manual)

 cancelled — subscription intentionally ended; excluded from checks
```

---

## 6. Pros and Cons

### Mercury API verification (primary)

| Pros | Cons |
|---|---|
| **Ground truth** — a matched bank transaction is proof money actually moved | Only covers subscriptions paid via Mercury cards/accounts |
| **Reports failures natively** — `status: failed` with `failedAt` and `reasonForFailure`, so declined renewals are detected, not just successful ones | A vendor that never *attempts* the charge (e.g. plan already cancelled) leaves no transaction at all — those fall to the no-match review queue |
| Free, official, stable API with a read-only token (no money-movement risk) | Merchant descriptors are cryptic; needs the alias-learning step for the first renewal of each vendor |
| Card-ID matching is exact; no OCR or scraping fragility | |
| Webhooks available later for real-time push instead of daily polling | Amount tolerance can mis-match when a vendor has multiple similar-priced products on the same card (review queue catches this) |

### Email verification (secondary)

| Pros | Cons |
|---|---|
| **Catches failures proactively** — "payment declined" emails arrive before you'd notice missing money | Email formats are inconsistent and change without notice; parsing is inherently fuzzy (mitigated by LLM parsing + human review) |
| Covers subscriptions **not** paid through Mercury | Requires inbox access — an OAuth/IMAP credential per account email, stored encrypted; a real security surface to protect |
| Receipts carry rich detail (invoice number, plan name, period) that bank data lacks | Vendors sometimes don't send receipts, or send them to a different address than expected |
| Gmail API is free and supports precise filters/labels | IMAP polling for non-Google providers is slower and less reliable than Gmail push |
|  | Small ongoing cost for LLM parsing (pennies/month at this volume) |

### Manual review (fallback)

| Pros | Cons |
|---|---|
| 100% coverage — a human decision closes every gap automation leaves | Doesn't scale if the queue grows; goal is for alias-learning to shrink it toward zero |
| Teaches the system (confirmations create merchant aliases) | Depends on someone actually checking the queue (mitigated by Phase-4 Slack/email alerts) |

### Why this layered design

For subscriptions paid through Mercury, **the API alone covers both success and failure** — email adds value only for payments Mercury can't see or for invoice-level detail, which is why it's optional rather than core. The manual review queue remains the backstop that guarantees nothing falls through (including vendors that never attempt a charge), and alias-learning makes that manual work rarer every month.

---

## 7. Security

- **Mercury token:** read-only tier only — cannot initiate payments, create cards, or manage recipients. Stored as a Vercel environment variable; never committed to the repository. Revoke instantly from the Mercury dashboard if exposed.
- **Card data:** only card nicknames, last-4, and Mercury card IDs are stored — never full card numbers (the API doesn't expose them anyway).
- **Email credentials:** OAuth tokens / IMAP passwords encrypted at rest in the database; Gmail scope limited to read-only.
- **Access:** single-admin app (1–2 users) behind Supabase Auth; no public signup.
- **Database:** row-level security enabled in either hosting mode. Self-hosted Docker: change every default secret from the Supabase compose file, expose only via HTTPS, and run scheduled offsite backups. Supabase Cloud: daily backups managed by Supabase. Local development runs an isolated Supabase stack in Docker.

---

## 8. Roadmap

| Phase | Deliverable | Value |
|---|---|---|
| **1** | Supabase schema, subscription CRUD form, Mercury card sync (dropdown), dashboard with upcoming renewals + spend totals | Usable tracker from day one |
| **2** | Transaction sync, matching engine, status lifecycle, needs-review queue | Automated renewal verification — the core value |
| **3** *(optional)* | Gmail OAuth + IMAP connectors, LLM receipt parsing | Only needed if subscriptions exist outside Mercury, or invoice-level detail is wanted — Mercury's API already detects failures for Mercury-paid subscriptions |
| **4** | Slack/email alerts for failures and review-queue items; Mercury webhooks for real-time matching | Zero-effort monitoring |

---

## 9. Running Costs

| Component | Cost |
|---|---|
| Mercury API | Free (included with Mercury account; read-only usage has no fees) |
| Database — dev phase (local Docker) | Free |
| Database — Supabase Cloud (if/when deployed) | Free tier sufficient at this scale |
| Vercel (app + cron, if/when deployed) | Free hobby tier sufficient |
| Gmail API | Free |
| LLM email parsing | Free (local Ollama model) or under $1/month (Claude Haiku) |
