import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import {
  getOrCreateConversation,
  listUserConversations,
  MessagingError,
} from "@/lib/messages";
import { createConversationSchema } from "@/lib/validations/message";

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

  try {
    const conversations = await listUserConversations(user.id);
    return NextResponse.json(
      {
        data: {
          conversations,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("List conversations error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list conversations.",
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const parsed = createConversationSchema.safeParse(bodyData);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid conversation parameters.",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await getOrCreateConversation(user.id, parsed.data.peerId);
    return NextResponse.json(
      {
        data: {
          conversation: result.conversation,
          isNew: result.isNew,
        },
      },
      { status: result.isNew ? 201 : 200 },
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

    console.error("Create conversation error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to initialize conversation.",
        },
      },
      { status: 500 },
    );
  }
}
