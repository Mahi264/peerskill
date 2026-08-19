import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: "OBSOLETE_AUTH_METHOD",
        message: "Password login is obsolete. PeerSkill uses institutional Google OAuth via /api/auth/google.",
      },
    },
    { status: 410 },
  );
}
