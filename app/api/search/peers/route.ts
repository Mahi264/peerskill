import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { searchPeers } from "@/lib/search-peers";
import { peerSearchSchema } from "@/lib/validations/search";

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

  const { searchParams } = new URL(request.url);

  const rawParams: Record<string, string | undefined> = {
    q: searchParams.get("q") ?? undefined,
    skill: searchParams.get("skill") ?? undefined,
    skillId: searchParams.get("skillId") ?? undefined,
    available: searchParams.get("available") ?? undefined,
    level: searchParams.get("level") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };

  const validationResult = peerSearchSchema.safeParse(rawParams);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid peer search parameters.",
          details: validationResult.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  try {
    const result = await searchPeers(validationResult.data, user.id);

    return NextResponse.json(
      {
        data: result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Search peers error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to search campus peers.",
        },
      },
      { status: 500 },
    );
  }
}
