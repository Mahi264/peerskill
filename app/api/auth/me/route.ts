import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
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

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthenticatedResponse();
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  const userSkills = await prisma.userSkill.findMany({
    where: { userId: user.id },
    include: { skill: true },
  });

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
          profile: profile
            ? {
                userId: profile.userId,
                fullName: profile.fullName,
                avatarUrl: profile.avatarUrl,
                branch: profile.branch,
                graduationYear: profile.graduationYear,
                section: profile.section,
                bio: profile.bio,
                helpAvailable: profile.helpAvailable,
                helpStatus: profile.helpStatus,
                contactVisibility: profile.contactVisibility,
                chatRequestVisibility: profile.chatRequestVisibility,
                createdAt: profile.createdAt.toISOString(),
                updatedAt: profile.updatedAt.toISOString(),
              }
            : null,
          userSkills: userSkills.map((us) => ({
            id: us.id,
            skillId: us.skillId,
            name: us.skill.name,
            slug: us.skill.slug,
            level: us.level,
          })),
        },
      },
    },
    { status: 200 },
  );
}
