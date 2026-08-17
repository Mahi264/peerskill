import { NextResponse } from "next/server";

import { revokeSession, SESSION_COOKIE_NAME } from "@/lib/session";

function getSessionTokenFromRequest(request: Request): string | null {
  if (
    "cookies" in request &&
    typeof (request as { cookies?: { get: (name: string) => { value: string } | undefined } })
      .cookies?.get === "function"
  ) {
    const cookie = (
      request as { cookies: { get: (name: string) => { value: string } | undefined } }
    ).cookies.get(SESSION_COOKIE_NAME);
    if (cookie?.value) {
      return cookie.value;
    }
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookie.substring(SESSION_COOKIE_NAME.length + 1);
    }
  }

  return null;
}

export async function POST(request: Request) {
  const rawToken = getSessionTokenFromRequest(request);

  if (rawToken) {
    await revokeSession(rawToken);
  }

  const response = NextResponse.json(
    {
      data: {
        success: true,
      },
    },
    { status: 200 },
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
