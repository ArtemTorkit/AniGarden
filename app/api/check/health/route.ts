import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Baseline liveness probe — no external deps.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "anime-gacha-mvp",
    timestamp: new Date().toISOString(),
    runtime: "nodejs",
  });
}
