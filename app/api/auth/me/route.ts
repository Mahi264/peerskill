import { NextResponse } from "next/server";

import { findValidSession, SESSION_COOKIE_NAME } from "@/lib/session";

function unauthenticatedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      },
    },
    { status: 401 },
  );
}

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

export async function GET(request: Request) {
  const rawToken = getSessionTokenFromRequest(request);

  if (!rawToken) {
    return unauthenticatedResponse();
  }

  const session = await findValidSession(rawToken);

  if (!session || !session.user) {
    return unauthenticatedResponse();
  }

  const { user } = session;

  return NextResponse.json(
    {
      data: {
        user: {
          id: user.id,
          email: user.email,
          collegeEmailVerified: user.collegeEmailVerified,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        },
      },
    },
    { status: 200 },
  );
}
