import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  DEFAULT_SESSION_DURATION_MS,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { loginSchema } from "@/lib/validations/auth";

function genericAuthError() {
  return NextResponse.json(
    {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      },
    },
    { status: 401 },
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

  const result = loginSchema.safeParse(body);

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

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return genericAuthError();
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    return genericAuthError();
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      {
        error: {
          code: "ACCOUNT_NOT_ACTIVE",
          message: "Account is not active.",
        },
      },
      { status: 403 },
    );
  }

  const { rawToken } = await createSession(user.id);

  const response = NextResponse.json(
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
    { status: 200 },
  );

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(DEFAULT_SESSION_DURATION_MS / 1000),
  });

  return response;
}
