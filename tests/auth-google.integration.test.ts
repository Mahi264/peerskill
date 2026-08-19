import { execSync } from "node:child_process";
import { generateKeyPairSync, createSign } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLocalJWKSet,
  exportJWK,
  importSPKI,
  type JWK,
} from "jose";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-google-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-google-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/callback/google";
});

import { GET as GET_INITIATE } from "@/app/api/auth/google/route";
import { GET as GET_CALLBACK } from "@/app/api/auth/callback/google/route";
import { POST as POST_LOGOUT } from "@/app/api/auth/logout/route";
import { prisma } from "@/lib/prisma";
import {
  GOOGLE_CODE_VERIFIER_COOKIE,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/oauth";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/session";

describe("Google OAuth 2.0 / OIDC Authentication Integration (SQLite)", () => {
  let privateKeyPem: string;
  let testJwks: ReturnType<typeof createLocalJWKSet>;

  beforeAll(async () => {
    // Generate real RSA key pair for testing using node:crypto
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    privateKeyPem = privateKey;

    const publicCryptoKey = await importSPKI(publicKey, "RS256");
    const publicJwk = await exportJWK(publicCryptoKey);
    publicJwk.kid = "integration-key-1";
    testJwks = createLocalJWKSet({ keys: [publicJwk as JWK] });

    (globalThis as Record<string, unknown>).__TEST_JWKS_OVERRIDE__ = testJwks;

    execSync("npx prisma db push --skip-generate", {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: "ignore",
    });
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    delete (globalThis as Record<string, unknown>).__TEST_JWKS_OVERRIDE__;
    await prisma.$disconnect();
  });

  function createSignedToken(payloadObj: Record<string, unknown>, kid = "integration-key-1"): string {
    const header = { alg: "RS256", kid, typ: "JWT" };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");

    const signer = createSign("RSA-SHA256");
    signer.update(`${headerB64}.${payloadB64}`);
    const signatureB64 = signer.sign(privateKeyPem, "base64url");

    return `${headerB64}.${payloadB64}.${signatureB64}`;
  }

  function mockSignedGoogleTokenResponse(payloadObj: Record<string, unknown>, ok = true) {
    let idToken = "";

    if (ok) {
      idToken = createSignedToken(payloadObj);
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url === "https://oauth2.googleapis.com/token") {
          if (!ok) {
            return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
          }
          return new Response(
            JSON.stringify({
              access_token: "mock-access-token",
              id_token: idToken,
              token_type: "Bearer",
              expires_in: 3600,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
      }),
    );
  }

  it("GET /api/auth/google initiates OAuth flow with PKCE, state, and nonce cookies", async () => {
    const res = await GET_INITIATE();
    expect([302, 307]).toContain(res.status);

    const redirectUrl = res.headers.get("location");
    expect(redirectUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(redirectUrl).toContain("client_id=test-google-client-id");
    expect(redirectUrl).toContain("code_challenge_method=S256");
    expect(redirectUrl).toContain("nonce=");

    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.includes(GOOGLE_OAUTH_STATE_COOKIE))).toBe(true);
    expect(cookies.some((c) => c.includes(GOOGLE_CODE_VERIFIER_COOKIE))).toBe(true);
    expect(cookies.some((c) => c.includes(GOOGLE_NONCE_COOKIE))).toBe(true);
  });

  it("completes first-time user registration via Google OAuth -> PENDING status, session cookie, /onboarding redirect", async () => {
    const state = "test-state-123";
    const codeVerifier = "test-verifier-123";
    const nonce = "test-nonce-123";

    mockSignedGoogleTokenResponse({
      iss: "https://accounts.google.com",
      aud: "test-google-client-id",
      sub: "google-sub-firsttime",
      email: "newstudent@mitsgwl.ac.in",
      email_verified: true,
      hd: "mitsgwl.ac.in",
      nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = new Request(`http://localhost:3000/api/auth/callback/google?code=valid-code&state=${state}`, {
      headers: {
        cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; ${GOOGLE_CODE_VERIFIER_COOKIE}=${codeVerifier}; ${GOOGLE_NONCE_COOKIE}=${nonce}`,
      },
    });

    const res = await GET_CALLBACK(req);
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBe("http://localhost:3000/onboarding");

    // Verify SQLite user record created
    const dbUser = await prisma.user.findUnique({
      where: { email: "newstudent@mitsgwl.ac.in" },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.googleId).toBe("google-sub-firsttime");
    expect(dbUser?.collegeEmailVerified).toBe(true);
    expect(dbUser?.status).toBe("PENDING");
    expect(dbUser?.role).toBe("STUDENT");

    // Verify PeerSkill local session created
    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);

    const rawToken = cookieHeader?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1];
    expect(rawToken).toBeTruthy();

    const session = await prisma.session.findFirst({ where: { userId: dbUser!.id } });
    expect(session).not.toBeNull();
    expect(session?.tokenHash).toBe(hashSessionToken(rawToken!));
  });

  it("authenticates returning ACTIVE user -> creates session, redirects to /home", async () => {
    const activeUser = await prisma.user.create({
      data: {
        email: "activestudent@mitsgwl.ac.in",
        googleId: "google-sub-active",
        collegeEmailVerified: true,
        status: "ACTIVE",
      },
    });

    const state = "test-state-active";
    const codeVerifier = "test-verifier-active";
    const nonce = "test-nonce-active";

    mockSignedGoogleTokenResponse({
      iss: "https://accounts.google.com",
      aud: "test-google-client-id",
      sub: "google-sub-active",
      email: "activestudent@mitsgwl.ac.in",
      email_verified: true,
      hd: "mitsgwl.ac.in",
      nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = new Request(`http://localhost:3000/api/auth/callback/google?code=valid-code&state=${state}`, {
      headers: {
        cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; ${GOOGLE_CODE_VERIFIER_COOKIE}=${codeVerifier}; ${GOOGLE_NONCE_COOKIE}=${nonce}`,
      },
    });

    const res = await GET_CALLBACK(req);
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBe("http://localhost:3000/home");

    // Verify no duplicate user created
    const count = await prisma.user.count({ where: { email: "activestudent@mitsgwl.ac.in" } });
    expect(count).toBe(1);

    // Verify local session created for activeUser
    const session = await prisma.session.findFirst({ where: { userId: activeUser.id } });
    expect(session).not.toBeNull();
  });

  it("rejects mismatched nonce with INVALID_NONCE error redirect", async () => {
    const state = "state-nonce-mismatch";
    const verifier = "verifier-nonce-mismatch";
    const storedNonce = "stored-nonce-123";

    mockSignedGoogleTokenResponse({
      iss: "https://accounts.google.com",
      aud: "test-google-client-id",
      sub: "sub-nonce-mismatch",
      email: "student@mitsgwl.ac.in",
      email_verified: true,
      hd: "mitsgwl.ac.in",
      nonce: "different-nonce-456",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = new Request(`http://localhost:3000/api/auth/callback/google?code=valid-code&state=${state}`, {
      headers: {
        cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; ${GOOGLE_CODE_VERIFIER_COOKIE}=${verifier}; ${GOOGLE_NONCE_COOKIE}=${storedNonce}`,
      },
    });

    const res = await GET_CALLBACK(req);
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=INVALID_NONCE");
  });

  it("rejects personal Google accounts (@gmail.com) with INVALID_COLLEGE_DOMAIN error redirect", async () => {
    const state = "state-gmail";
    const verifier = "verifier-gmail";
    const nonce = "nonce-gmail";

    mockSignedGoogleTokenResponse({
      iss: "https://accounts.google.com",
      aud: "test-google-client-id",
      sub: "google-sub-gmail",
      email: "user@gmail.com",
      email_verified: true,
      nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = new Request(`http://localhost:3000/api/auth/callback/google?code=valid-code&state=${state}`, {
      headers: {
        cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; ${GOOGLE_CODE_VERIFIER_COOKIE}=${verifier}; ${GOOGLE_NONCE_COOKIE}=${nonce}`,
      },
    });

    const res = await GET_CALLBACK(req);
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=INVALID_COLLEGE_DOMAIN");

    // Verify no user created in DB
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });

  it("rejects faculty accounts (@mitsgwalior.in) with INVALID_COLLEGE_DOMAIN error redirect", async () => {
    const state = "state-faculty";
    const verifier = "verifier-faculty";
    const nonce = "nonce-faculty";

    mockSignedGoogleTokenResponse({
      iss: "https://accounts.google.com",
      aud: "test-google-client-id",
      sub: "google-sub-faculty",
      email: "professor@mitsgwalior.in",
      email_verified: true,
      hd: "mitsgwalior.in",
      nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const req = new Request(`http://localhost:3000/api/auth/callback/google?code=valid-code&state=${state}`, {
      headers: {
        cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; ${GOOGLE_CODE_VERIFIER_COOKIE}=${verifier}; ${GOOGLE_NONCE_COOKIE}=${nonce}`,
      },
    });

    const res = await GET_CALLBACK(req);
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=INVALID_COLLEGE_DOMAIN");

    const count = await prisma.user.count();
    expect(count).toBe(0);
  });

  it("allows user to log out cleanly by revoking session", async () => {
    const user = await prisma.user.create({
      data: {
        email: "student@mitsgwl.ac.in",
        googleId: "google-logout",
        collegeEmailVerified: true,
        status: "ACTIVE",
      },
    });

    const state = "logout-state";
    const verifier = "logout-verifier";
    const nonce = "logout-nonce";

    mockSignedGoogleTokenResponse({
      iss: "https://accounts.google.com",
      aud: "test-google-client-id",
      sub: "google-logout",
      email: "student@mitsgwl.ac.in",
      email_verified: true,
      hd: "mitsgwl.ac.in",
      nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    });

    const reqAuth = new Request(`http://localhost:3000/api/auth/callback/google?code=valid-code&state=${state}`, {
      headers: {
        cookie: `${GOOGLE_OAUTH_STATE_COOKIE}=${state}; ${GOOGLE_CODE_VERIFIER_COOKIE}=${verifier}; ${GOOGLE_NONCE_COOKIE}=${nonce}`,
      },
    });

    const callbackRes = await GET_CALLBACK(reqAuth);
    const sessionCookie = callbackRes.headers.get("set-cookie");
    const rawToken = sessionCookie?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`))?.[1];

    expect(rawToken).toBeTruthy();

    // Call logout endpoint with session cookie
    const logoutReq = new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${rawToken}` },
    });

    const logoutRes = await POST_LOGOUT(logoutReq);
    expect(logoutRes.status).toBe(200);

    // Verify session revoked in DB
    const sessionCount = await prisma.session.count({ where: { userId: user.id } });
    expect(sessionCount).toBe(0);
  });
});
