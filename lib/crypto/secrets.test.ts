import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, tryDecryptSecret } from "./secrets";

beforeAll(() => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("secrets", () => {
  it("round-trips with the same context", () => {
    const stored = encryptSecret("hunter2 — ünïcode", "ctx:a");
    expect(stored.startsWith("v1:")).toBe(true);
    expect(stored).not.toContain("hunter2");
    expect(decryptSecret(stored, "ctx:a")).toBe("hunter2 — ünïcode");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same", "ctx")).not.toBe(encryptSecret("same", "ctx"));
  });

  it("rejects a value moved to another context (row)", () => {
    const stored = encryptSecret("secret", "request_credentials:1");
    expect(() => decryptSecret(stored, "request_credentials:2")).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const [v, iv, tag, data] = encryptSecret("secret", "ctx").split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 1;
    expect(() =>
      decryptSecret([v, iv, tag, flipped.toString("base64")].join(":"), "ctx"),
    ).toThrow();
  });

  it("rejects a different key", () => {
    const stored = encryptSecret("secret", "ctx");
    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptSecret(stored, "ctx")).toThrow();
    expect(tryDecryptSecret(stored, "ctx")).toBeNull();
  });

  it("rejects plaintext / unknown formats", () => {
    expect(() => decryptSecret("plain-password", "ctx")).toThrow();
    expect(tryDecryptSecret(null, "ctx")).toBeNull();
  });
});
