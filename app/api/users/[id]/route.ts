import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getViewerConnectionInfo } from "@/lib/connections";
import { prisma } from "@/lib/prisma";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getAuthenticatedUser(request);

  if (!viewer) {
    return unauthenticatedResponse();
  }

  if (viewer.status === "SUSPENDED") {
    return NextResponse.json(
      {
        error: {
          code: "ACCOUNT_SUSPENDED",
          message: "Account is suspended.",
        },
      },
      { status: 403 },
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_USER_ID",
          message: "User ID is required.",
        },
      },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      userSkills: {
        include: {
          skill: true,
        },
      },
      _count: {
        select: {
          doubts: true,
          answers: true,
        },
      },
    },
  });

  // Only ACTIVE users with a completed profile are accessible
  if (!targetUser || targetUser.status !== "ACTIVE" || !targetUser.profile) {
    return NextResponse.json(
      {
        error: {
          code: "USER_NOT_FOUND",
          message: "Student profile not found.",
        },
      },
      { status: 404 },
    );
  }

  const viewerConnection = await getViewerConnectionInfo(
    viewer.id,
    targetUser.id
  );

  return NextResponse.json(
    {
      data: {
        user: {
          id: targetUser.id,
          status: targetUser.status,
          createdAt: targetUser.createdAt.toISOString(),
          profile: {
            fullName: targetUser.profile.fullName,
            avatarUrl: targetUser.profile.avatarUrl,
            branch: targetUser.profile.branch,
            section: targetUser.profile.section,
            graduationYear: targetUser.profile.graduationYear,
            bio: targetUser.profile.bio,
            helpAvailable: targetUser.profile.helpAvailable,
            helpStatus: targetUser.profile.helpStatus,
          },
          skills: targetUser.userSkills.map((us) => ({
            id: us.skill.id,
            name: us.skill.name,
            slug: us.skill.slug,
            level: us.level,
          })),
          stats: {
            doubtsCount: targetUser._count.doubts,
            answersCount: targetUser._count.answers,
          },
          viewerConnection,
        },
      },
    },
    { status: 200 },
  );
}
