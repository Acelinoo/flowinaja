import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { NotificationService } from "@/services/notification.service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "401 Tidak terautentikasi: Sesi tidak valid atau telah berakhir" },
        { status: 401 }
      );
    }

    const unreadCount = await NotificationService.getUnreadCount(
      user.organizationId,
      user.id
    );

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isClientSafe = rawMessage && !rawMessage.toLowerCase().includes("prisma") && !rawMessage.toLowerCase().includes("database");
    return NextResponse.json(
      { error: isClientSafe ? rawMessage : "Gagal memuat jumlah notifikasi belum dibaca" },
      { status: 500 }
    );
  }
}
