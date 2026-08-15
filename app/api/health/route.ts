import { NextResponse } from "next/server";

import { getDatabaseHealth } from "@/lib/health";

export async function GET() {
  const database = await getDatabaseHealth();

  return NextResponse.json({
    name: "PeerSkill",
    phase: "Phase 0",
    status: "ok",
    database,
    timestamp: new Date().toISOString(),
  });
}
