import { describe, expect, it } from "vitest";

import { generateSessionToken, hashSessionToken } from "@/lib/session";

describe("session token utilities", () => {
  it("generates an unpredictable random raw token", () => {
    const firstToken = generateSessionToken();
    const secondToken = generateSessionToken();

    expect(firstToken).toBeTruthy();
    expect(typeof firstToken).toBe("string");
    expect(firstToken.length).toBe(64); // 32 bytes in hex = 64 characters
    expect(firstToken).not.toBe(secondToken);
  });

  it("produces deterministic SHA-256 hashes for raw tokens", () => {
    const rawToken = "sample-raw-session-token-12345";
    const hash1 = hashSessionToken(rawToken);
    const hash2 = hashSessionToken(rawToken);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 in hex = 64 characters
  });

  it("ensures raw token is never equal to its tokenHash", () => {
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);

    expect(tokenHash).not.toBe(rawToken);
  });
});
