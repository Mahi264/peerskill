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
    fullName: requestedFullName,
    branch,
    graduationYear,
    section,
    bio,
    avatarUrl,
  } = result.data;

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  const effectiveFullName =
    existingProfile?.fullName ||
    (requestedFullName && requestedFullName.trim() ? requestedFullName.trim() : user.email.split("@")[0]);

  const effectiveAvatarUrl =
    avatarUrl !== undefined ? avatarUrl || null : existingProfile?.avatarUrl || null;

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName: effectiveFullName,
      branch: existingProfile?.branch || branch || null,
      graduationYear: existingProfile?.graduationYear || graduationYear || null,
      section: section || null,
      bio: bio || null,
      avatarUrl: effectiveAvatarUrl,
    },
    update: {
      fullName: existingProfile?.fullName || effectiveFullName,
      branch: existingProfile?.branch || branch || null,
      graduationYear: graduationYear !== undefined ? graduationYear : existingProfile?.graduationYear,
      section: section !== undefined ? section : existingProfile?.section,
      bio: bio !== undefined ? bio : existingProfile?.bio,
      avatarUrl: effectiveAvatarUrl,
    },
  });

  return NextResponse.json(
    {
      data: {
        profile: {
          userId: profile.userId,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
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
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        },
      },
    },
    { status: 200 },
  );
}
