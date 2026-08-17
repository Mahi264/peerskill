import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const DEFAULT_SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Generates an opaque, cryptographically random raw session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Deterministically hashes a raw session token using SHA-256 for safe database storage.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a database session for a user.
 * Returns the unhashed raw token (to be sent to client/cookies) along with the created Session record.
 */
export async function createSession(
  userId: string,
  expiresAt: Date = new Date(Date.now() + DEFAULT_SESSION_DURATION_MS),
) {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    rawToken,
    session,
  };
}

/**
 * Finds a valid, non-expired session by its raw token.
 * Automatically cleans up expired sessions.
 */
export async function findValidSession(rawToken: string) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    // Delete expired session and return null
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

/**
 * Revokes a session by its raw token.
 */
export async function revokeSession(rawToken: string) {
  if (!rawToken) {
    return;
  }

  const tokenHash = hashSessionToken(rawToken);

  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

/**
 * Revokes all sessions for a specific user ID.
 */
export async function revokeAllUserSessions(userId: string) {
  await prisma.session.deleteMany({
    where: { userId },
  });
}
