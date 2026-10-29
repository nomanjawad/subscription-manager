import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, sessionGate } from "./policy";

const T0 = 1_800_000_000;

describe("sessionGate", () => {
  it("accepts a Google + TOTP session inside 30 minutes", () => {
    const gate = sessionGate(
      {
        currentLevel: "aal2",
        nextLevel: "aal2",
        methods: [
          { method: "totp", timestamp: T0 + 60 },
          { method: "oauth", timestamp: T0 },
        ],
      },
      T0 + 29 * 60,
    );
    expect(gate).toEqual({ kind: "ok", expiresAt: T0 + SESSION_MAX_AGE_SECONDS });
  });

  it("expires 30 minutes after the Google sign-in, not the TOTP step", () => {
    const gate = sessionGate(
      {
        currentLevel: "aal2",
        nextLevel: "aal2",
        methods: [
          { method: "totp", timestamp: T0 + 20 * 60 },
          { method: "oauth", timestamp: T0 },
        ],
      },
      T0 + 30 * 60,
    );
    expect(gate.kind).toBe("expired");
  });

  it("rejects sessions that didn't start with Google", () => {
    expect(
      sessionGate(
        { currentLevel: "aal1", nextLevel: "aal1", methods: [{ method: "password", timestamp: T0 }] },
        T0,
      ).kind,
    ).toBe("invalid");
    expect(
      sessionGate({ currentLevel: "aal2", nextLevel: "aal2", methods: [] }, T0).kind,
    ).toBe("invalid");
  });

  it("asks for a code when a factor exists but isn't verified this session", () => {
    expect(
      sessionGate(
        { currentLevel: "aal1", nextLevel: "aal2", methods: [{ method: "oauth", timestamp: T0 }] },
        T0 + 10,
      ).kind,
    ).toBe("mfa_verify");
  });

  it("asks to enroll when there's no factor yet", () => {
    expect(
      sessionGate(
        { currentLevel: "aal1", nextLevel: "aal1", methods: [{ method: "oauth", timestamp: T0 }] },
        T0 + 10,
      ).kind,
    ).toBe("mfa_enroll");
  });

  it("expiry beats a pending MFA step", () => {
    expect(
      sessionGate(
        { currentLevel: "aal1", nextLevel: "aal2", methods: [{ method: "oauth", timestamp: T0 }] },
        T0 + SESSION_MAX_AGE_SECONDS + 1,
      ).kind,
    ).toBe("expired");
  });
});
