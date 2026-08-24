import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { getConversationDetails, MessagingError } from "@/lib/messages";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Conversation ID is required.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const conversation = await getConversationDetails(id, user.id);
    return NextResponse.json(
      {
        data: {
          conversation,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof MessagingError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    console.error("Get conversation error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load conversation details.",
        },
      },
      { status: 500 },
    );
  }
}
