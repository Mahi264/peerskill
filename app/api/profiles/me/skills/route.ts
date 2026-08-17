import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSkillsSchema } from "@/lib/validations/profile";

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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function PUT(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return unauthenticatedResponse();
  }

  if (user.status === "SUSPENDED") {
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


  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const result = updateSkillsSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input.",
          details: result.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const { skills: inputSkills } = result.data;

  // Resolve or create Skill entities
  const resolvedSkills: Array<{ id: string; name: string; slug: string; level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR" }> = [];

  for (const item of inputSkills) {
    let skillRecord;

    if (item.skillId) {
      skillRecord = await prisma.skill.findUnique({
        where: { id: item.skillId },
      });
    }

    if (!skillRecord && item.name) {
      const cleanName = item.name.trim();
      const slug = generateSlug(cleanName);

      skillRecord = await prisma.skill.upsert({
        where: { slug },
        create: {
          name: cleanName,
          slug,
        },
        update: {
          name: cleanName,
        },
      });
    }

    if (!skillRecord) {
      return NextResponse.json(
        {
          error: {
            code: "SKILL_NOT_FOUND",
            message: `Skill with id ${item.skillId} was not found.`,
          },
        },
        { status: 422 },
      );
    }

    resolvedSkills.push({
      id: skillRecord.id,
      name: skillRecord.name,
      slug: skillRecord.slug,
      level: item.level,
    });
  }

  // Replace user's UserSkill records in a transaction
  await prisma.$transaction([
    prisma.userSkill.deleteMany({ where: { userId: user.id } }),
    prisma.userSkill.createMany({
      data: resolvedSkills.map((s) => ({
        userId: user.id,
        skillId: s.id,
        level: s.level,
      })),
    }),
  ]);

  // Check if profile exists; if so, transition User.status to ACTIVE upon completing onboarding condition (profile + 3+ skills)
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  let updatedUser = user;

  if (profile && resolvedSkills.length >= 3 && user.status === "PENDING") {
    updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE" },
    });
  }


  const userSkills = await prisma.userSkill.findMany({
    where: { userId: user.id },
    include: { skill: true },
  });

  return NextResponse.json(
    {
      data: {
        skills: userSkills.map((us) => ({
          id: us.id,
          skillId: us.skillId,
          name: us.skill.name,
          slug: us.skill.slug,
          level: us.level,
        })),
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          collegeEmailVerified: updatedUser.collegeEmailVerified,
          role: updatedUser.role,
          status: updatedUser.status,
          createdAt: updatedUser.createdAt.toISOString(),
        },
      },
    },
    { status: 200 },
  );
}
