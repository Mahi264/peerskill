import { NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/admin";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateAdminSkillSchema } from "@/lib/validations/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Skill ID is required.",
        },
      },
      { status: 400 },
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

  const parsed = updateAdminSkillSchema.safeParse(bodyData);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid skill update parameters.",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Skill not found.",
          },
        },
        { status: 404 },
      );
    }

    const updates: { name?: string; slug?: string; category?: string } = {};
    if (parsed.data.name && parsed.data.name !== existing.name) {
      updates.name = parsed.data.name;
      updates.slug = parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (parsed.data.category !== undefined) {
      updates.category = parsed.data.category;
    }

    const updated = await prisma.skill.update({
      where: { id },
      data: updates,
    });

    await logAdminAudit(admin.id, "SKILL_UPDATED", {
      skillId: id,
      previous: { name: existing.name, category: existing.category },
      updated: { name: updated.name, category: updated.category },
    });

    return NextResponse.json(
      {
        data: {
          skill: {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            category: updated.category,
            createdAt: updated.createdAt.toISOString(),
          },
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin update skill error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update skill.",
        },
      },
      { status: 500 },
    );
  }
}
