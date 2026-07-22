// Shared row/contract types mirroring supabase/migrations/20260716075435_initial_schema.sql.
// Modules depend on these types + the views/RPCs — never on another module's internals.

export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "cancelled";
export type CheckStatus = "pending" | "renewed" | "failed" | "needs_review";
export type RequestStatus = "requested" | "approved" | "rejected" | "purchased";
export type CancellationStatus = "pending" | "cancelled";
export type UserRole = "admin" | "team_lead" | "buyer";

// ── Teams & roles ──────────────────────────────────────────────────────────

export interface TeamRow {
  id: string;
  name: string;
  auto_approve: boolean;
  created_at: string;
}

/** Minimal team shape for the public request form's picker. */
export interface TeamOption {
  id: string;
  name: string;
}

export interface ProfileRow {
  id: string; // = auth.users.id
  email: string;
  full_name: string | null;
  role: UserRole;
  team_id: string | null;
  created_at: string;
}

/** A team lead joined with the name of the team they lead (admin UI). */
export interface TeamLeadRow {
  id: string;
  email: string;
  full_name: string | null;
  team_id: string | null;
  team_name: string | null;
  created_at: string;
}

/**
 * A "member": a non-login user who can only request subscriptions. Assigned to
 * a team lead (whose team then handles their requests). No auth account.
 */
export interface MemberRow {
  id: string;
  full_name: string | null;
  email: string;
  lead_id: string | null;
  created_at: string;
}

/** A member joined with their assigned lead + that lead's team, plus how many
 *  requests they've submitted and when they last did (admin UI). */
export interface MemberDirectoryRow {
  id: string;
  full_name: string | null;
  email: string;
  lead_id: string | null;
  lead_name: string | null;
  lead_email: string | null;
  team_id: string | null;
  team_name: string | null;
  request_count: number;
  last_requested_at: string | null;
  created_at: string;
}

/** A request email that matches no member — surfaced so an admin can add them
 *  (admin Users UI). */
export interface UnrecognizedRequesterRow {
  requester_email: string;
  requester_name: string | null;
  request_count: number;
  last_requested_at: string | null;
}

/** A team lead as a pickable option (admin "assign to lead" controls). */
export interface LeadOption {
  id: string;
  label: string;
}

/**
 * A "buyer": a login user (role='buyer', no team) whose job is to purchase
 * approved requests company-wide. purchase_count is how many subscriptions
 * they've bought (stamped via subscriptions.purchased_by).
 */
export interface BuyerRow {
  id: string;
  email: string;
  full_name: string | null;
  purchase_count: number;
  created_at: string;
}

/** Outbound SMTP config the admin edits in-app (smtp_settings singleton).
 *  lib/email/smtp.ts reads this first, falling back to SMTP_* env vars. */
export interface SmtpSettingsRow {
  host: string | null;
  port: number | null;
  username: string | null;
  password: string | null;
  from_email: string | null;
  updated_at: string | null;
}

export interface CardRow {
  id: string;
  mercury_card_id: string;
  mercury_account_id: string;
  name_on_card: string | null;
  nickname: string | null;
  last4: string;
  network: string | null;
  card_type: string | null;
  status: string;
  team_id: string | null;
  synced_at: string;
}

/** A card joined with the name of the team it's assigned to (admin Cards UI). */
export interface CardWithTeamRow extends CardRow {
  team_name: string | null;
}

export interface SubscriptionRow {
  id: string;
  platform: string;
  product: string | null;
  order_number: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_renewal_date: string; // date (YYYY-MM-DD)
  card_id: string | null;
  account_email: string | null;
  status: SubscriptionStatus;
  notes: string | null;
  tag: string | null;
  team_id: string | null;
  purchased_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRequestRow {
  id: string;
  requester_name: string;
  requester_email: string;
  platform: string;
  product: string | null;
  reason: string | null;
  amount_estimate: number | null;
  billing_cycle: BillingCycle;
  credentials: string | null;
  tag: string | null;
  team_id: string | null;
  status: RequestStatus;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  purchased_subscription_id: string | null;
  created_at: string;
}

export interface RequestCountsRow {
  status: RequestStatus;
  count: number;
}

export interface TransactionRow {
  id: string;
  mercury_transaction_id: string;
  mercury_account_id: string;
  amount: number;
  status: string;
  kind: string | null;
  counterparty_name: string | null;
  bank_description: string | null;
  mercury_card_id: string | null;
  posted_at: string | null;
  created_at_mercury: string | null;
  failed_at: string | null;
  reason_for_failure: string | null;
  raw: unknown;
  synced_at: string;
}

export interface RenewalCheckRow {
  id: string;
  subscription_id: string;
  expected_date: string;
  expected_amount: number;
  status: CheckStatus;
  matched_transaction_id: string | null;
  failure_reason: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface MerchantAliasRow {
  id: string;
  subscription_id: string;
  descriptor_pattern: string;
  learned_from_transaction_id: string | null;
  created_at: string;
}

// ── View rows ────────────────────────────────────────────────────────────

export interface SubscriptionOverviewRow {
  id: string;
  platform: string;
  product: string | null;
  order_number: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  next_renewal_date: string;
  account_email: string | null;
  status: SubscriptionStatus;
  notes: string | null;
  created_at: string;
  card_id: string | null;
  card_nickname: string | null;
  card_name: string | null;
  card_last4: string | null;
  card_status: string | null;
  last_check_status: CheckStatus | null;
  last_check_date: string | null;
  last_check_failure_reason: string | null;
  tag: string | null;
  team_id: string | null;
  team_name: string | null;
  purchased_by: string | null;
  purchased_by_name: string | null;
  cancellation_pending: boolean;
}

/** A cancellation request joined with team, actor names, and (if linked) the
 *  subscription's details (cancellation_overview view). */
export interface CancellationOverviewRow {
  id: string;
  subscription_id: string | null;
  requester_name: string | null;
  requester_email: string | null;
  platform: string | null;
  product: string | null;
  reason: string | null;
  team_id: string | null;
  team_name: string | null;
  status: CancellationStatus;
  requested_by: string | null;
  requested_by_name: string | null;
  cancelled_by: string | null;
  cancelled_by_name: string | null;
  created_at: string;
  cancelled_at: string | null;
  sub_status: SubscriptionStatus | null;
  sub_amount: number | null;
  sub_currency: string | null;
}

export interface ReviewQueueRow {
  check_id: string;
  expected_date: string;
  expected_amount: number;
  status: CheckStatus;
  created_at: string;
  subscription_id: string;
  platform: string;
  product: string | null;
  currency: string;
  card_last4: string | null;
  mercury_card_id: string | null;
  team_id: string | null;
}

// ── RPC return rows ──────────────────────────────────────────────────────

export interface DashboardTotalsRow {
  active_subscriptions: number;
  monthly_spend: number;
  yearly_spend: number;
  needs_review_count: number;
  failed_count: number;
}

export interface UpcomingRenewalRow {
  subscription_id: string;
  platform: string;
  product: string | null;
  amount: number;
  currency: string;
  next_renewal_date: string;
  card_last4: string | null;
}

export interface SpendByPlatformRow {
  platform: string;
  monthly_amount: number;
  subscription_count: number;
}

export interface CandidateTransactionRow {
  transaction_id: string;
  mercury_transaction_id: string;
  amount: number;
  tx_status: string;
  counterparty_name: string | null;
  bank_description: string | null;
  posted_at: string | null;
  mercury_card_id: string | null;
  same_card: boolean;
}

export interface TeamOverviewRow {
  team_id: string;
  name: string;
  auto_approve: boolean;
  lead_count: number;
  subscription_count: number;
  monthly_spend: number;
  open_request_count: number;
}

export interface SpendByTeamRow {
  team_id: string | null;
  team_name: string;
  monthly_amount: number;
  subscription_count: number;
}

/** Actual money-out per team, derived from transactions → card → team. The
 *  team_id-null row is the 'Unassigned' bucket (spend on cards with no team). */
export interface SpendByTeamActualRow {
  team_id: string | null;
  team_name: string;
  total_out: number;
  transaction_count: number;
}

export interface SpendByCardRow {
  mercury_card_id: string;
  card_last4: string | null;
  card_nickname: string | null;
  card_name: string | null;
  total_out: number;
  transaction_count: number;
}

export interface SpendByMonthRow {
  month: string; // YYYY-MM-DD (first of month)
  total_out: number;
  transaction_count: number;
}
