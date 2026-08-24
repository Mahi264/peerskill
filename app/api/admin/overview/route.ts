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
    const [
      totalStudents,
      activeStudents,
      pendingStudents,
      totalDoubts,
      resolvedDoubts,
      totalAnswers,
      acceptedAnswers,
      totalConnections,
      totalConversations,
      totalPredefinedSkills,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.doubt.count(),
      prisma.doubt.count({ where: { status: "RESOLVED" } }),
      prisma.answer.count(),
      prisma.answer.count({ where: { isAccepted: true } }),
      prisma.connection.count({ where: { status: "ACCEPTED" } }),
      prisma.conversation.count(),
      prisma.skill.count(),
    ]);

    return NextResponse.json(
      {
        data: {
          stats: {
            totalStudents,
            activeStudents,
            pendingStudents,
            totalDoubts,
            resolvedDoubts,
            totalAnswers,
            acceptedAnswers,
            totalConnections,
            totalConversations,
            totalPredefinedSkills,
          },
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin overview error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load platform overview.",
        },
      },
      { status: 500 },
    );
  }
}
