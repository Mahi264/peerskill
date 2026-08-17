import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/profile";

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

  const result = updateProfileSchema.safeParse(body);

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

  const {
    fullName,
    department,
    branch,
    graduationYear,
    section,
    bio,
    avatarUrl,
  } = result.data;

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName,
      department,
      branch: branch || null,
      graduationYear: graduationYear || null,
      section: section || null,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
    },
    update: {
      fullName,
      department,
      branch: branch || null,
      graduationYear: graduationYear || null,
      section: section || null,
      bio: bio || null,
      avatarUrl: avatarUrl || null,
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
