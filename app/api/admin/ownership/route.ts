import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await getAuthenticatedAdmin(request);
  if (!admin) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Administrative access required.",
        },
      },
      { status: 403 },
    );
  }

  try {
    const [currentAdmin, auditLogs] = await Promise.all([
      prisma.adminAccount.findUnique({
        where: { id: admin.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.adminAuditLog.findMany({
        where: {
          action: {
            in: ["INITIAL_ADMIN_BOOTSTRAPPED", "OWNERSHIP_TRANSFERRED"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json(
      {
        data: {
          currentAdmin: currentAdmin
            ? {
                ...currentAdmin,
                createdAt: currentAdmin.createdAt.toISOString(),
                updatedAt: currentAdmin.updatedAt.toISOString(),
              }
            : null,
          auditHistory: auditLogs.map((log) => ({
            id: log.id,
            action: log.action,
            details: log.details ? JSON.parse(log.details) : null,
            ipAddress: log.ipAddress,
            createdAt: log.createdAt.toISOString(),
          })),
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin get ownership error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load ownership information.",
        },
      },
      { status: 500 },
    );
  }
}
