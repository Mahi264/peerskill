import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth";
import { ConnectionError, removeOrCancelConnection } from "@/lib/connections";

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

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const connectionId = params.id;

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthenticatedResponse();
  }

  if (user.status === "SUSPENDED") {
    return suspendedResponse();
  }

  try {
    await removeOrCancelConnection(user.id, connectionId);
    return NextResponse.json(
      {
        data: {
          message: "Connection removed successfully.",
        },
      },
      { status: 200 }
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

    console.error("Error removing/canceling connection:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove connection.",
        },
      },
      { status: 500 }
    );
  }
}
