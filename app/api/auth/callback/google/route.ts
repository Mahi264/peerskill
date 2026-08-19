import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  GOOGLE_CODE_VERIFIER_COOKIE,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyAndValidateGoogleIdToken,
  type VerifyGoogleIdTokenOptions,
} from "@/lib/oauth";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  DEFAULT_SESSION_DURATION_MS,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

function getCookieFromRequest(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }

  return null;
}

function createErrorRedirect(request: Request, errorCode: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/?error=${errorCode}`, request.url));
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  response.cookies.delete(GOOGLE_CODE_VERIFIER_COOKIE);
  response.cookies.delete(GOOGLE_NONCE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;

  const errorParam = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (errorParam || !code || !state) {
    return createErrorRedirect(request, "OAUTH_CANCELLED");
  }

  const storedState = getCookieFromRequest(request, GOOGLE_OAUTH_STATE_COOKIE);
  const storedCodeVerifier = getCookieFromRequest(request, GOOGLE_CODE_VERIFIER_COOKIE);
  const storedNonce = getCookieFromRequest(request, GOOGLE_NONCE_COOKIE);

  if (!storedState || !storedCodeVerifier || state !== storedState) {
    return createErrorRedirect(request, "INVALID_STATE");
  }

  if (!storedNonce) {
    return createErrorRedirect(request, "INVALID_NONCE");
  }

  let idToken: string | undefined;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        client_id: env.GOOGLE_CLIENT_ID || "dev-google-client-id",
        client_secret: env.GOOGLE_CLIENT_SECRET || "dev-google-client-secret",
        code_verifier: storedCodeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      return createErrorRedirect(request, "TOKEN_EXCHANGE_FAILED");
    }

    const tokenData = await tokenResponse.json();
    idToken = tokenData.id_token;
  } catch {
    return createErrorRedirect(request, "TOKEN_EXCHANGE_FAILED");
  }

  if (!idToken) {
    return createErrorRedirect(request, "MISSING_ID_TOKEN");
  }

  const jwksOverride = (globalThis as Record<string, unknown>).__TEST_JWKS_OVERRIDE__ as
    | VerifyGoogleIdTokenOptions["jwksOverride"]
    | undefined;

  const validation = await verifyAndValidateGoogleIdToken(idToken, {
    expectedClientId: env.GOOGLE_CLIENT_ID,
    expectedDomain: env.COLLEGE_EMAIL_DOMAIN,
    expectedNonce: storedNonce,
    jwksOverride,
  });

  if (!validation.valid || !validation.payload) {
    const errCode = validation.error || "INVALID_TOKEN";
    return createErrorRedirect(request, errCode);
  }

  const payload = validation.payload;
  const cleanEmail = payload.email.trim().toLowerCase();
  const googleId = payload.sub;

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ email: cleanEmail }, { googleId }],
    },
  });

  if (user) {
    if (!user.googleId || !user.collegeEmailVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? googleId,
          collegeEmailVerified: true,
        },
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        googleId,
        collegeEmailVerified: true,
        status: "PENDING",
        role: "STUDENT",
      },
    });
  }

  const { rawToken } = await createSession(user.id);

  const destination = user.status === "PENDING" ? "/onboarding" : "/home";
  const response = NextResponse.redirect(new URL(destination, request.url));

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(DEFAULT_SESSION_DURATION_MS / 1000),
  });

  // Clear temporary OAuth cookies
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  response.cookies.delete(GOOGLE_CODE_VERIFIER_COOKIE);
  response.cookies.delete(GOOGLE_NONCE_COOKIE);

  return response;
}
