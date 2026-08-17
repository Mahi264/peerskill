import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";

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
    { status: 200 },
  );
}

