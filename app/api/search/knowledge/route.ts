import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { searchKnowledge } from "@/lib/search-knowledge";
import { knowledgeSearchSchema } from "@/lib/validations/search";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
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

  const { searchParams } = new URL(request.url);
  const rawParams = {
    q: searchParams.get("q") || undefined,
    status: searchParams.get("status") || undefined,
    urgency: searchParams.get("urgency") || undefined,
    skillId: searchParams.get("skillId") || searchParams.get("skill") || undefined,
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
  };

  const parsed = knowledgeSearchSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMETERS",
          message: "Invalid search query parameters.",
          details: parsed.error.format(),
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await searchKnowledge(parsed.data);
    return NextResponse.json({
      data: result,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to execute search.",
        },
      },
      { status: 500 },
    );
  }
}
