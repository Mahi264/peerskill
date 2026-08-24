import "server-only";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SESSION_DURATION_MS,
  generateSessionToken,
  hashSessionToken,
} from "@/lib/session";

export class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/**
 * Returns the single active platform AdminAccount if one exists.
 */
export async function getAdminAccount() {
  return prisma.adminAccount.findFirst();
}

/**
 * Checks and creates the initial singleton AdminAccount if no Admin exists yet
 * and the authenticated Google email matches PEERSKILL_INITIAL_ADMIN_EMAIL.
 * If an Admin already exists, returns the existing record if email matches.
 */
export async function checkAndBootstrapInitialAdmin(
  email: string,
  googleId?: string | null,
  displayName?: string | null,
) {
  const cleanEmail = email.trim().toLowerCase();
  const configuredInitialEmail = env.PEERSKILL_INITIAL_ADMIN_EMAIL?.trim().toLowerCase();

  const existingAdmin = await prisma.adminAccount.findFirst();

  if (existingAdmin) {
    if (existingAdmin.email.toLowerCase() === cleanEmail) {
      if (googleId && (!existingAdmin.googleId || existingAdmin.googleId !== googleId)) {
        return prisma.adminAccount.update({
          where: { id: existingAdmin.id },
          data: { googleId },
        });
      }
      return existingAdmin;
    }
    return null;
  }

  // No admin exists yet: Check if email matches initial bootstrap configuration
  if (configuredInitialEmail && cleanEmail === configuredInitialEmail) {
    const created = await prisma.adminAccount.create({
      data: {
        email: cleanEmail,
        googleId: googleId ?? null,
        displayName: displayName || "Platform Administrator",
      },
    });

    await logAdminAudit(created.id, "INITIAL_ADMIN_BOOTSTRAPPED", {
      bootstrappedEmail: cleanEmail,
    });

    return created;
  }

  return null;
}

/**
 * Creates an authenticated AdminSession in the database.
 */
export async function createAdminSession(
  adminAccountId: string,
  expiresAt: Date = new Date(Date.now() + DEFAULT_SESSION_DURATION_MS),
) {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.adminSession.create({
    data: {
      adminAccountId,
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
 * Finds a valid, non-expired AdminSession by its raw token.
 */
export async function findValidAdminSession(rawToken: string) {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { adminAccount: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session;
}

/**
 * Revokes all sessions for a specific admin ID.
 */
export async function revokeAllAdminSessions(adminAccountId: string) {
  await prisma.adminSession.deleteMany({
    where: { adminAccountId },
  });
}

/**
 * Atomically transfers administrative ownership to a target Google email.
 * Updates the singleton AdminAccount row and immediately revokes all current sessions.
 */
export async function transferAdminOwnership(
  currentAdminId: string,
  targetEmail: string,
  ipAddress?: string,
) {
  const cleanTargetEmail = targetEmail.trim().toLowerCase();

  if (!cleanTargetEmail || !cleanTargetEmail.includes("@")) {
    throw new AdminError("Valid target email is required.", "INVALID_EMAIL", 400);
  }

  const currentAdmin = await prisma.adminAccount.findUnique({
    where: { id: currentAdminId },
  });

  if (!currentAdmin) {
    throw new AdminError("Current admin not found.", "NOT_FOUND", 404);
  }

  if (currentAdmin.email.toLowerCase() === cleanTargetEmail) {
    throw new AdminError(
      "Cannot transfer ownership to the current administrator email.",
      "SELF_TRANSFER_NOT_ALLOWED",
      400,
    );
  }

  // Atomically update singleton AdminAccount row and revoke all sessions
  const [updatedAdmin] = await prisma.$transaction([
    prisma.adminAccount.update({
      where: { id: currentAdminId },
      data: {
        email: cleanTargetEmail,
        googleId: null, // Reset until new admin signs in via Google
      },
    }),
    prisma.adminSession.deleteMany({
      where: { adminAccountId: currentAdminId },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminAccountId: currentAdminId,
        action: "OWNERSHIP_TRANSFERRED",
        details: JSON.stringify({
          fromEmail: currentAdmin.email,
          toEmail: cleanTargetEmail,
        }),
        ipAddress: ipAddress ?? null,
      },
    }),
  ]);

  return updatedAdmin;
}

/**
 * Records an operational action in AdminAuditLog.
 */
export async function logAdminAudit(
  adminAccountId: string,
  action: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
) {
  try {
    return await prisma.adminAuditLog.create({
      data: {
        adminAccountId,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write admin audit log:", err);
    return null;
  }
}
