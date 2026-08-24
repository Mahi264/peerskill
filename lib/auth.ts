import "server-only";

import { type AdminAccount, type AdminSession, type Session, type User } from "@prisma/client";

import { findValidAdminSession } from "@/lib/admin";
import { findValidSession, SESSION_COOKIE_NAME } from "@/lib/session";

export type AuthenticatedPrincipal =
  | { type: "STUDENT"; user: User; session: Session }
  | { type: "ADMIN"; admin: AdminAccount; session: AdminSession }
  | null;

export function getSessionTokenFromRequest(request: Request): string | null {
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
 * Resolves the authenticated principal (STUDENT or ADMIN) from the HTTP-only session cookie.
 */
export async function getAuthenticatedPrincipal(
  request: Request,
): Promise<AuthenticatedPrincipal> {
  const rawToken = getSessionTokenFromRequest(request);

  if (!rawToken) {
    return null;
  }

  // 1. Check Student Session
  const studentSession = await findValidSession(rawToken);
  if (studentSession && studentSession.user) {
    return {
      type: "STUDENT",
      user: studentSession.user,
      session: studentSession,
    };
  }

  // 2. Check Admin Session
  const adminSession = await findValidAdminSession(rawToken);
  if (adminSession && adminSession.adminAccount) {
    return {
      type: "ADMIN",
      admin: adminSession.adminAccount,
      session: adminSession,
    };
  }

  return null;
}

/**
 * Resolves the authenticated student user from the session cookie.
 * Returns null if unauthenticated or if the principal is an Admin.
 */
export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const principal = await getAuthenticatedPrincipal(request);
  if (principal && principal.type === "STUDENT") {
    return principal.user;
  }
  return null;
}

/**
 * Resolves the authenticated platform administrator from the session cookie.
 * Returns null if unauthenticated or if the principal is a Student.
 */
export async function getAuthenticatedAdmin(request: Request): Promise<AdminAccount | null> {
  const principal = await getAuthenticatedPrincipal(request);
  if (principal && principal.type === "ADMIN") {
    return principal.admin;
  }
  return null;
}
