import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { DashboardService } from "@/services/dashboard.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "401 Tidak terautentikasi: Sesi tidak valid" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "ALL";

    const data = await DashboardService.getDashboardForUser(user, range);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Gagal memuat data dasbor" },
      { status: 500 }
    );
  }
}
