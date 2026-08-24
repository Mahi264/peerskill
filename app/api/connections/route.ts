import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import {
  ConnectionError,
  listUserConnections,
  sendConnectionRequest,
} from "@/lib/connections";
import { sendConnectionRequestSchema } from "@/lib/validations/connection";

function unauthenticatedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication required.",
      },
    },
    { status: 401 }
  );
}

function suspendedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "ACCOUNT_SUSPENDED",
        message: "Account is suspended.",
      },
    },
    { status: 403 }
  );
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthenticatedResponse();
  }

  if (user.status === "SUSPENDED") {
    return suspendedResponse();
  }

  try {
    const data = await listUserConnections(user.id);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error listing connections:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list connections.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthenticatedResponse();
  }

  if (user.status === "SUSPENDED") {
    return suspendedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Invalid request payload.",
        },
      },
      { status: 400 }
    );
  }

  const parsed = sendConnectionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Validation failed.",
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await sendConnectionRequest(user.id, parsed.data.receiverId);
    return NextResponse.json(
      {
        data: {
          connection: {
            id: result.connection.id,
            requesterId: result.connection.requesterId,
            receiverId: result.connection.receiverId,
            status: result.connection.status,
            acceptedAt: result.connection.acceptedAt,
            createdAt: result.connection.createdAt,
          },
          autoAccepted: result.autoAccepted,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ConnectionError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error("Error sending connection request:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send connection request.",
        },
      },
      { status: 500 }
    );
  }
}
