import { describe, expect, it } from "vitest";
import {
  matchRenewal,
  toEngineTransaction,
  type EngineCheck,
  type EngineSubscription,
  type EngineTransaction,
} from "./engine";

const CHECK: EngineCheck = {
  id: "check-1",
  expectedDate: "2026-07-10",
  expectedAmount: 100,
};

const CARD_SUB: EngineSubscription = {
  mercuryCardId: "card-abc",
  aliases: [],
};

function tx(overrides: Partial<EngineTransaction> = {}): EngineTransaction {
  return {
    id: "tx-1",
    amount: -100,
    status: "sent",
    mercuryCardId: "card-abc",
    postedAt: "2026-07-10T12:00:00Z",
    createdAt: "2026-07-09T00:00:00Z",
    counterpartyName: "ACME Corp",
    bankDescription: "ACME* SUBSCRIPTION",
    reasonForFailure: null,
    ...overrides,
  };
}

describe("matchRenewal", () => {
  it("matches exactly on card + amount + date", () => {
    const outcome = matchRenewal(CHECK, CARD_SUB, [tx()]);
    expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
  });

  it("returns no_match when there are no transactions", () => {
    expect(matchRenewal(CHECK, CARD_SUB, [])).toEqual({ kind: "no_match" });
  });

  describe("amount tolerance (±5%)", () => {
    it("accepts a deviation of exactly 5.0%", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [tx({ amount: -105 })]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });

    it("accepts 5.0% below the expected amount", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [tx({ amount: -95 })]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });

    it("rejects a deviation of 5.1%", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [tx({ amount: -105.1 })]);
      expect(outcome).toEqual({ kind: "no_match" });
    });
  });

  describe("date window (±3 days)", () => {
    it("accepts a transaction 3 days after the expected date", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ postedAt: "2026-07-13T08:00:00Z" }),
      ]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });

    it("accepts a transaction 3 days before the expected date", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ postedAt: "2026-07-07T23:59:59Z" }),
      ]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });

    it("rejects a transaction 4 days out", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ postedAt: "2026-07-14T00:00:00Z" }),
      ]);
      expect(outcome).toEqual({ kind: "no_match" });
    });

    it("falls back to createdAt when postedAt is null", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ postedAt: null, createdAt: "2026-07-11T10:00:00Z" }),
      ]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });
  });

  describe("card and alias evidence", () => {
    it("rejects a different card when both card ids are known", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ mercuryCardId: "card-other" }),
      ]);
      expect(outcome).toEqual({ kind: "no_match" });
    });

    it("requires an alias when the transaction card is unknown", () => {
      // Card check skipped (tx card null), no aliases → not enough evidence.
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ mercuryCardId: null }),
      ]);
      expect(outcome).toEqual({ kind: "no_match" });
    });

    it("requires an alias when the subscription card is unknown", () => {
      const sub: EngineSubscription = { mercuryCardId: null, aliases: [] };
      expect(matchRenewal(CHECK, sub, [tx()])).toEqual({ kind: "no_match" });
    });

    it("matches on alias when the card is unknown", () => {
      const sub: EngineSubscription = {
        mercuryCardId: null,
        aliases: ["acme"],
      };
      const outcome = matchRenewal(CHECK, sub, [tx({ mercuryCardId: null })]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });

    it("matches aliases case-insensitively", () => {
      const sub: EngineSubscription = {
        mercuryCardId: null,
        aliases: ["AcMe* SubSCRIPTION"],
      };
      const outcome = matchRenewal(CHECK, sub, [
        tx({ mercuryCardId: null, counterpartyName: null }),
      ]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });

    it("rejects when aliases are present but none match the descriptor", () => {
      const sub: EngineSubscription = {
        mercuryCardId: "card-abc",
        aliases: ["netflix"],
      };
      expect(matchRenewal(CHECK, sub, [tx()])).toEqual({ kind: "no_match" });
    });
  });

  describe("status handling", () => {
    it("maps a failed transaction to a failed outcome with its reason", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ status: "failed", reasonForFailure: "insufficient funds" }),
      ]);
      expect(outcome).toEqual({
        kind: "failed",
        transactionId: "tx-1",
        reason: "insufficient funds",
      });
    });

    it("uses a default reason when a failed transaction has none", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ status: "failed", reasonForFailure: null }),
      ]);
      expect(outcome).toEqual({
        kind: "failed",
        transactionId: "tx-1",
        reason: "charge failed",
      });
    });

    it("treats pending as renewed", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [tx({ status: "pending" })]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-1" });
    });

    it("treats other statuses (e.g. reversed) as failed with the status as reason", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ status: "reversed" }),
      ]);
      expect(outcome).toEqual({
        kind: "failed",
        transactionId: "tx-1",
        reason: "reversed",
      });
    });
  });

  describe("candidate selection", () => {
    it("picks the candidate with the amount closest to expected", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ id: "tx-off", amount: -104 }),
        tx({ id: "tx-exact", amount: -100 }),
        tx({ id: "tx-low", amount: -96 }),
      ]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-exact" });
    });

    it("tie-breaks equal amounts by date closest to expected", () => {
      const outcome = matchRenewal(CHECK, CARD_SUB, [
        tx({ id: "tx-far", postedAt: "2026-07-13T00:00:00Z" }),
        tx({ id: "tx-near", postedAt: "2026-07-10T00:00:00Z" }),
      ]);
      expect(outcome).toEqual({ kind: "renewed", transactionId: "tx-near" });
    });
  });

  it("never matches positive amounts (credits)", () => {
    const outcome = matchRenewal(CHECK, CARD_SUB, [
      tx({ amount: 100 }),
      tx({ id: "tx-refund", amount: 95 }),
    ]);
    expect(outcome).toEqual({ kind: "no_match" });
  });
});

describe("toEngineTransaction", () => {
  it("maps a DB row to the engine shape", () => {
    const mapped = toEngineTransaction({
      id: "uuid-1",
      mercury_transaction_id: "mt-1",
      mercury_account_id: "acct-1",
      amount: -42.5,
      status: "sent",
      kind: "creditCardTransaction",
      counterparty_name: "ACME",
      bank_description: "ACME*SUB",
      mercury_card_id: "card-abc",
      posted_at: "2026-07-10T00:00:00Z",
      created_at_mercury: "2026-07-09T00:00:00Z",
      failed_at: null,
      reason_for_failure: null,
      raw: {},
      synced_at: "2026-07-16T00:00:00Z",
    });
    expect(mapped).toEqual({
      id: "uuid-1",
      amount: -42.5,
      status: "sent",
      mercuryCardId: "card-abc",
      postedAt: "2026-07-10T00:00:00Z",
      createdAt: "2026-07-09T00:00:00Z",
      counterpartyName: "ACME",
      bankDescription: "ACME*SUB",
      reasonForFailure: null,
    });
  });
});
