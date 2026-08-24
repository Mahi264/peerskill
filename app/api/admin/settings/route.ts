import { NextResponse } from "next/server";

import { logAdminAudit } from "@/lib/admin";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePlatformSettingsSchema } from "@/lib/validations/admin";

const DEFAULT_SETTINGS = {
  platformName: "PeerSkill",
  collegeDisplayName: "Madhav Institute of Technology & Science (MITS)",
  supportEmail: "support@mitsgwl.ac.in",
  allowCustomSkills: true,
};

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
    const records = await prisma.appMetadata.findMany({
      where: {
        key: {
          in: [
            "platform_name",
            "college_display_name",
            "support_contact_email",
            "allow_student_custom_skills",
          ],
        },
      },
    });

    const metaMap = new Map(records.map((r) => [r.key, r.value]));

    const settings = {
      platformName: metaMap.get("platform_name") || DEFAULT_SETTINGS.platformName,
      collegeDisplayName:
        metaMap.get("college_display_name") || DEFAULT_SETTINGS.collegeDisplayName,
      supportEmail:
        metaMap.get("support_contact_email") || DEFAULT_SETTINGS.supportEmail,
      allowCustomSkills: metaMap.has("allow_student_custom_skills")
        ? metaMap.get("allow_student_custom_skills") === "true"
        : DEFAULT_SETTINGS.allowCustomSkills,
    };

    return NextResponse.json(
      {
        data: {
          settings,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin get settings error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load platform settings.",
        },
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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

  const parsed = updatePlatformSettingsSchema.safeParse(bodyData);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid platform settings.",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const updates = parsed.data;

  try {
    const upserts = [];

    if (updates.platformName !== undefined) {
      upserts.push(
        prisma.appMetadata.upsert({
          where: { key: "platform_name" },
          update: { value: updates.platformName },
          create: { key: "platform_name", value: updates.platformName },
        }),
      );
    }

    if (updates.collegeDisplayName !== undefined) {
      upserts.push(
        prisma.appMetadata.upsert({
          where: { key: "college_display_name" },
          update: { value: updates.collegeDisplayName },
          create: { key: "college_display_name", value: updates.collegeDisplayName },
        }),
      );
    }

    if (updates.supportEmail !== undefined) {
      upserts.push(
        prisma.appMetadata.upsert({
          where: { key: "support_contact_email" },
          update: { value: updates.supportEmail },
          create: { key: "support_contact_email", value: updates.supportEmail },
        }),
      );
    }

    if (updates.allowCustomSkills !== undefined) {
      upserts.push(
        prisma.appMetadata.upsert({
          where: { key: "allow_student_custom_skills" },
          update: { value: String(updates.allowCustomSkills) },
          create: {
            key: "allow_student_custom_skills",
            value: String(updates.allowCustomSkills),
          },
        }),
      );
    }

    if (upserts.length > 0) {
      await prisma.$transaction(upserts);
      await logAdminAudit(admin.id, "SETTINGS_UPDATED", updates);
    }

    return NextResponse.json(
      {
        data: {
          success: true,
          updated: updates,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Admin update settings error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update platform settings.",
        },
      },
      { status: 500 },
    );
  }
}
