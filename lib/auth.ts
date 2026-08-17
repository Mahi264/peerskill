import "server-only";

import { UserRole, type User } from "@prisma/client";

import { findValidSession, SESSION_COOKIE_NAME } from "@/lib/session";

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

/**
  * Resolves the authenticated user from the HTTP-only session cookie.
  * Returns null if the session cookie is missing, invalid, expired, or revoked.
  */
export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const rawToken = getSessionTokenFromRequest(request);

  if (!rawToken) {
    return null;
  }

  const session = await findValidSession(rawToken);

  if (!session || !session.user) {
    return null;
  }

  return session.user;
}

/**
  * Checks if the user has a specific role.
  */
export function hasRole(user: { role: UserRole }, role: UserRole): boolean {
  return user.role === role;
}
