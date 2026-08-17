import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePrivacySchema } from "@/lib/validations/profile";

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

export async function PATCH(request: Request) {
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

  const result = updatePrivacySchema.safeParse(body);

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

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (!existingProfile) {
    return NextResponse.json(
      {
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "Profile must be created before updating privacy settings.",
        },
      },
      { status: 422 },
    );
  }

  const { contactVisibility, chatRequestVisibility } = result.data;

  const profile = await prisma.profile.update({
    where: { userId: user.id },
    data: {
      ...(contactVisibility !== undefined && { contactVisibility }),
      ...(chatRequestVisibility !== undefined && { chatRequestVisibility }),
    },
  });

  return NextResponse.json(
    {
      data: {
        profile: {
          userId: profile.userId,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          department: profile.department,
          branch: profile.branch,
          graduationYear: profile.graduationYear,
          section: profile.section,
          bio: profile.bio,
          helpAvailable: profile.helpAvailable,
          contactVisibility: profile.contactVisibility,
          chatRequestVisibility: profile.chatRequestVisibility,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
        user: {
          id: user.id,
          email: user.email,
          collegeEmailVerified: user.collegeEmailVerified,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        },
      },
    },
    { status: 200 },
  );
}
