import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Flowinaja",
    version: "0.1.0",
    phase: "Phase 0 - Foundation & Architecture",
    timestamp: new Date().toISOString(),
  });
}
