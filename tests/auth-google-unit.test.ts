import { generateKeyPairSync, createSign } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createLocalJWKSet,
  exportJWK,
  importSPKI,
  type JWK,
} from "jose";

import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthNonce,
  generateOAuthState,
  verifyAndValidateGoogleIdToken,
} from "@/lib/oauth";

describe("Google OAuth & OIDC Helpers (Unit Tests)", () => {
  let privateKeyPem: string;
  let jwks: ReturnType<typeof createLocalJWKSet>;
  let otherPrivateKeyPem: string;

  beforeAll(async () => {
    // Generate primary key pair using node:crypto
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    privateKeyPem = privateKey;

    const publicCryptoKey = await importSPKI(publicKey, "RS256");
    const publicJwk = await exportJWK(publicCryptoKey);
    publicJwk.kid = "test-key-id-1";
    jwks = createLocalJWKSet({ keys: [publicJwk as JWK] });

    // Generate secondary key pair for wrong key test
    const otherKeys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    otherPrivateKeyPem = otherKeys.privateKey;
  });

  function createSignedToken(
    payloadObj: Record<string, unknown>,
    keyPem: string = privateKeyPem,
    kid = "test-key-id-1",
  ): string {
    const header = { alg: "RS256", kid, typ: "JWT" };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");

    const signer = createSign("RSA-SHA256");
    signer.update(`${headerB64}.${payloadB64}`);
    const signatureB64 = signer.sign(keyPem, "base64url");

    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  describe("PKCE, State & Nonce Generators", () => {
    it("generates random 64-character hex state, verifier, and nonce strings", () => {
      const state = generateOAuthState();
      const verifier = generateCodeVerifier();
      const nonce = generateOAuthNonce();

      expect(state).toHaveLength(64);
      expect(verifier).toHaveLength(64);
      expect(nonce).toHaveLength(64);
    });

    it("generates deterministic URL-safe S256 code challenge for a verifier", () => {
      const verifier = "test-code-verifier-1234567890-abcdefghijklmn";
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
      expect(challenge1).not.toContain("+");
      expect(challenge1).not.toContain("/");
      expect(challenge1).not.toContain("=");
    });
  });

  describe("Cryptographic ID Token Signature & Nonce Verification", () => {
    function getValidClaims() {
      return {
        iss: "https://accounts.google.com",
        aud: "mits-client-id",
        sub: "google-uid-100",
        email: "student@mitsgwl.ac.in",
        email_verified: true,
        hd: "mitsgwl.ac.in",
        nonce: "valid-nonce-123",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };
    }

    it("accepts a valid cryptographically signed Google ID token with valid nonce", async () => {
      const token = createSignedToken(getValidClaims());

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        expectedDomain: "mitsgwl.ac.in",
        expectedNonce: "valid-nonce-123",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(true);
      expect(res.payload?.email).toBe("student@mitsgwl.ac.in");
      expect(res.payload?.sub).toBe("google-uid-100");
    });

    it("rejects token signed with an untrusted/wrong key", async () => {
      const token = createSignedToken(getValidClaims(), otherPrivateKeyPem, "unknown-kid");

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        expectedNonce: "valid-nonce-123",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_SIGNATURE");
    });

    it("rejects tampered token with invalid signature", async () => {
      const token = createSignedToken(getValidClaims());
      const tamperedToken = token.substring(0, token.length - 6) + "XXXXXX";

      const res = await verifyAndValidateGoogleIdToken(tamperedToken, {
        expectedClientId: "mits-client-id",
        expectedNonce: "valid-nonce-123",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_SIGNATURE");
    });

    it("rejects token with invalid issuer", async () => {
      const token = createSignedToken({
        ...getValidClaims(),
        iss: "https://untrusted-issuer.com",
      });

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_ISSUER");
    });

    it("rejects token with invalid audience / client ID", async () => {
      const token = createSignedToken({
        ...getValidClaims(),
        aud: "wrong-client-id",
      });

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_AUDIENCE");
    });

    it("rejects expired token", async () => {
      const expiredClaims = {
        ...getValidClaims(),
        exp: Math.floor(Date.now() / 1000) - 60,
      };

      const token = createSignedToken(expiredClaims);

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("EXPIRED_TOKEN");
    });

    it("rejects missing nonce when expectedNonce is specified", async () => {
      const claimsWithoutNonce = { ...getValidClaims(), nonce: undefined };
      const token = createSignedToken(claimsWithoutNonce);

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        expectedNonce: "valid-nonce-123",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_NONCE");
    });

    it("rejects mismatched nonce", async () => {
      const token = createSignedToken({
        ...getValidClaims(),
        nonce: "wrong-nonce",
      });

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        expectedNonce: "valid-nonce-123",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_NONCE");
    });

    it("rejects unverified email", async () => {
      const token = createSignedToken({
        ...getValidClaims(),
        email_verified: false,
      });

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("UNVERIFIED_EMAIL");
    });

    it("rejects non-MITS domain (@gmail.com)", async () => {
      const token = createSignedToken({
        ...getValidClaims(),
        email: "user@gmail.com",
        hd: undefined,
      });

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        expectedDomain: "mitsgwl.ac.in",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_COLLEGE_DOMAIN");
    });

    it("rejects faculty domain (@mitsgwalior.in)", async () => {
      const token = createSignedToken({
        ...getValidClaims(),
        email: "prof@mitsgwalior.in",
        hd: "mitsgwalior.in",
      });

      const res = await verifyAndValidateGoogleIdToken(token, {
        expectedClientId: "mits-client-id",
        expectedDomain: "mitsgwl.ac.in",
        jwksOverride: jwks,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toBe("INVALID_COLLEGE_DOMAIN");
    });
  });
});
