import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_CODE_VERIFIER_COOKIE = "google_code_verifier";
export const GOOGLE_NONCE_COOKIE = "google_oauth_nonce";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("hex");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

export function generateOAuthNonce(): string {
  return randomBytes(32).toString("hex");
}

export interface GoogleIdTokenPayload {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean | string;
  hd?: string;
  name?: string;
  picture?: string;
  nonce?: string;
  exp: number;
  iat: number;
}

let googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export function getGoogleJWKS() {
  if (!googleJwks) {
    googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  }
  return googleJwks;
}

export interface VerifyGoogleIdTokenOptions {
  expectedClientId?: string;
  expectedDomain?: string;
  allowedAdminEmails?: string[];
  expectedNonce?: string;
  jwksOverride?: Parameters<typeof jwtVerify>[1];
}

export async function verifyAndValidateGoogleIdToken(
  idToken: string,
  options: VerifyGoogleIdTokenOptions = {},
): Promise<{ valid: boolean; payload?: GoogleIdTokenPayload; error?: string }> {
  if (!idToken || !idToken.trim()) {
    return { valid: false, error: "MISSING_ID_TOKEN" };
  }

  let payload: GoogleIdTokenPayload;

  try {
    const keySet = options.jwksOverride ?? getGoogleJWKS();
    const { payload: verifiedPayload } = await jwtVerify(idToken, keySet, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    payload = verifiedPayload as unknown as GoogleIdTokenPayload;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || "";
    if (code === "ERR_JWT_EXPIRED") {
      return { valid: false, error: "EXPIRED_TOKEN" };
    }
    if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
      return { valid: false, error: "INVALID_ISSUER" };
    }
    return { valid: false, error: "INVALID_SIGNATURE" };
  }

  // Audience check
  if (
    options.expectedClientId &&
    options.expectedClientId.trim() !== "" &&
    payload.aud !== options.expectedClientId
  ) {
    return { valid: false, error: "INVALID_AUDIENCE" };
  }

  // Nonce check
  if (options.expectedNonce !== undefined) {
    if (!payload.nonce || payload.nonce !== options.expectedNonce) {
      return { valid: false, error: "INVALID_NONCE" };
    }
  }

  // Email verified check
  const isVerified =
    payload.email_verified === true || payload.email_verified === "true";
  if (!isVerified) {
    return { valid: false, error: "UNVERIFIED_EMAIL" };
  }

  // Domain / Admin check
  const domain = (options.expectedDomain ?? "mitsgwl.ac.in").toLowerCase().trim();
  const userEmail = (payload.email ?? "").toLowerCase().trim();

  const isEmailMatch = userEmail.endsWith(`@${domain}`);
  const isHdMatch = payload.hd ? payload.hd.toLowerCase().trim() === domain : true;
  const isCollegeDomain = isEmailMatch && isHdMatch;

  const isAllowedAdmin = Boolean(
    options.allowedAdminEmails?.some(
      (e) => e && e.toLowerCase().trim() === userEmail,
    ),
  );

  if (!isCollegeDomain && !isAllowedAdmin) {
    return { valid: false, error: "INVALID_COLLEGE_DOMAIN" };
  }

  return { valid: true, payload };
}
