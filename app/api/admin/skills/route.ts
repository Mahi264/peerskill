import { NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/admin";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSkillSchema } from "@/lib/validations/admin";

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
    const skills = await prisma.skill.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        createdAt: true,
        _count: {
          select: {
            userSkills: true,
            doubtSkills: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const items = skills.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: s.category || "General",
      userCount: s._count.userSkills,
      doubtCount: s._count.doubtSkills,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        data: {
          skills: items,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin list skills error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list skills.",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  let bodyData: unknown;
  try {
    bodyData = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Invalid request payload.",
        },
      },
      { status: 400 },
    );
  }

  const parsed = createAdminSkillSchema.safeParse(bodyData);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid skill parameters.",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const { name, category } = parsed.data;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  try {
    const existing = await prisma.skill.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: name } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: "SKILL_EXISTS",
            message: `A skill with name "${name}" or slug "${slug}" already exists.`,
          },
        },
        { status: 409 },
      );
    }

    const skill = await prisma.skill.create({
      data: {
        name,
        slug,
        category: category || "General",
      },
    });

    await logAdminAudit(admin.id, "SKILL_CREATED", {
      skillId: skill.id,
      name: skill.name,
      slug: skill.slug,
      category: skill.category,
    });

    return NextResponse.json(
      {
        data: {
          skill: {
            id: skill.id,
            name: skill.name,
            slug: skill.slug,
            category: skill.category,
            createdAt: skill.createdAt.toISOString(),
          },
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Admin create skill error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create skill.",
        },
      },
      { status: 500 },
    );
  }
}
