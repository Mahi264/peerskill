import { NextResponse } from "next/server";

import { AdminError, transferAdminOwnership } from "@/lib/admin";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { transferOwnershipSchema } from "@/lib/validations/admin";

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin(request);
  if (!admin) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Administrative access required.",
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

  const parsed = transferOwnershipSchema.safeParse(bodyData);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid ownership transfer parameters.",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;

  try {
    const updated = await transferAdminOwnership(
      admin.id,
      parsed.data.targetEmail,
      ipAddress,
    );

    const response = NextResponse.json(
      {
        data: {
          success: true,
          message: `Platform administrative ownership transferred to ${updated.email}. You have been logged out.`,
          newAdminEmail: updated.email,
        },
      },
      { status: 200 },
    );

    // Invalidate current cookie immediately
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof AdminError) {
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

    console.error("Ownership transfer error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to transfer platform ownership.",
        },
      },
      { status: 500 },
    );
  }
}
