import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";

import { isCollegeEmail } from "@/lib/college-email";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

function duplicateEmailResponse() {
  return NextResponse.json(
    {
      error: {
        code: "DUPLICATE_EMAIL",
        message: "An account with this email already exists.",
      },
    },
    { status: 409 },
  );
}

export async function POST(request: Request) {
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

  const result = registerSchema.safeParse(body);

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

  const email = result.data.email.trim().toLowerCase();
  const { password } = result.data;

  if (!isCollegeEmail(email, env.COLLEGE_EMAIL_DOMAIN)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_COLLEGE_EMAIL",
          message: "Email must belong to the college domain.",
        },
      },
      { status: 422 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return duplicateEmailResponse();
  }

  const passwordHash = await hashPassword(password);

  let user;

  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        collegeEmailVerified: false,
        status: "PENDING",
        role: "STUDENT",
      },
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return duplicateEmailResponse();
    }
    throw error;
  }

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
        },
      },
    },
    { status: 201 },
  );
}
