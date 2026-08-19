import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthNonce,
  generateOAuthState,
  GOOGLE_CODE_VERIFIER_COOKIE,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/oauth";

export async function GET() {
  const state = generateOAuthState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const nonce = generateOAuthNonce();

  const clientId = env.GOOGLE_CLIENT_ID || "dev-google-client-id";
  const redirectUri = env.GOOGLE_REDIRECT_URI;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl.toString());

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };

  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(GOOGLE_CODE_VERIFIER_COOKIE, codeVerifier, cookieOptions);
  response.cookies.set(GOOGLE_NONCE_COOKIE, nonce, cookieOptions);

  return response;
}
