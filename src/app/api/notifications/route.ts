import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { NotificationService } from "@/services/notification.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "401 Tidak terautentikasi: Sesi tidak valid atau telah berakhir" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await NotificationService.getNotificationsForUser({
      organizationId: user.organizationId,
      userId: user.id,
      unreadOnly,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isClientSafe = rawMessage && !rawMessage.toLowerCase().includes("prisma") && !rawMessage.toLowerCase().includes("database");
    return NextResponse.json(
      { error: isClientSafe ? rawMessage : "Terjadi kendala saat memuat notifikasi" },
      { status: 500 }
    );
  }
}
