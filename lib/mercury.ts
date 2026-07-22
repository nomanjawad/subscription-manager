// Mercury API client — server-only. Config comes from the bank_settings table
// (edited by an admin under Settings → Bank API) and falls back to the
// MERCURY_API_URL / MERCURY_API_TOKEN env vars, so sandbox → production can be
// switched either in-app or via env.
import { createServiceClient } from "@/lib/supabase/server";

export interface MercuryAccount {
  id: string;
  name: string;
  accountNumber: string;
  status: string;
  type: string;
  kind: string; // "checking" | "savings" | ...
  availableBalance: number;
  currentBalance: number;
  legalBusinessName: string;
}

export interface MercuryCard {
  cardId: string;
  nameOnCard: string;
  lastFourDigits: string;
  network: string; // "mastercard" | "visa"
  status: string; // "active" | "frozen" | "cancelled" | ...
  type: string; // "physical" | "virtual"
  createdAt: string;
}

export type MercuryTransactionStatus =
  | "pending"
  | "sent"
  | "cancelled"
  | "failed"
  | "reversed"
  | "blocked";

export interface MercuryTransaction {
  id: string;
  accountId: string;
  amount: number; // dollars; negative = money out
  status: MercuryTransactionStatus;
  createdAt: string;
  postedAt: string | null;
  failedAt: string | null;
  reasonForFailure: string | null;
  bankDescription: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  counterpartyNickname: string | null;
  kind: string; // "creditCardTransaction" | "debitCardTransaction" | "other" | ...
  mercuryCategory: string | null;
  // Card transactions carry the card id inside details
  details: {
    creditCardInfo?: { id?: string; cardId?: string; paymentMethod?: string };
    debitCardInfo?: { id?: string; cardId?: string };
  } | null;
  merchant: { mcc?: string; merchantId?: string } | null;
}

interface TransactionsResponse {
  total: number;
  transactions: MercuryTransaction[];
}

/** Read the admin-editable bank_settings row, or null if none/unreadable. */
async function dbConfig(): Promise<{ url?: string; token?: string } | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("bank_settings")
      .select("api_url, api_token")
      .maybeSingle();
    if (error || !data) return null;
    return { url: data.api_url ?? undefined, token: data.api_token ?? undefined };
  } catch {
    return null;
  }
}

/** Effective Mercury config: DB settings win, env fills the gaps. */
async function config(): Promise<{ base: string; token: string }> {
  const db = (await dbConfig()) ?? {};
  const base = db.url || process.env.MERCURY_API_URL;
  const token = db.token || process.env.MERCURY_API_TOKEN;
  if (!base || !token) {
    throw new Error(
      "Mercury API is not configured — set it under Settings → Bank API (or MERCURY_API_URL / MERCURY_API_TOKEN in .env.local).",
    );
  }
  return { base: base.replace(/\/$/, ""), token };
}

async function mercuryGet<T>(path: string): Promise<T> {
  const { base, token } = await config();
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Bank data must never be served stale from Next's fetch cache
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mercury API ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export async function listAccounts(): Promise<MercuryAccount[]> {
  const data = await mercuryGet<{ accounts: MercuryAccount[] }>("/accounts");
  return data.accounts;
}

export async function listCards(accountId: string): Promise<MercuryCard[]> {
  const data = await mercuryGet<{ cards: MercuryCard[] }>(
    `/account/${accountId}/cards`,
  );
  return data.cards;
}

export async function listTransactions(
  accountId: string,
  opts: { limit?: number; offset?: number; start?: string; end?: string } = {},
): Promise<TransactionsResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  if (opts.start) params.set("start", opts.start);
  if (opts.end) params.set("end", opts.end);
  const qs = params.toString();
  return mercuryGet<TransactionsResponse>(
    `/account/${accountId}/transactions${qs ? `?${qs}` : ""}`,
  );
}

/** All cards across every account, tagged with their account id. */
export async function listAllCards(): Promise<
  Array<MercuryCard & { accountId: string }>
> {
  const accounts = await listAccounts();
  const perAccount = await Promise.all(
    accounts.map(async (a) => {
      const cards = await listCards(a.id).catch(() => [] as MercuryCard[]);
      return cards.map((c) => ({ ...c, accountId: a.id }));
    }),
  );
  return perAccount.flat();
}

/** Recent transactions across every account (for the sync job). */
export async function listAllTransactions(
  opts: { limit?: number; start?: string } = {},
): Promise<MercuryTransaction[]> {
  const accounts = await listAccounts();
  const perAccount = await Promise.all(
    accounts.map((a) =>
      listTransactions(a.id, { limit: opts.limit ?? 500, start: opts.start })
        .then((r) => r.transactions)
        .catch(() => [] as MercuryTransaction[]),
    ),
  );
  return perAccount.flat();
}
