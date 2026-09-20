import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Database connectivity probe
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      app: "Flowinaja",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        app: "Flowinaja",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
