import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { NotificationService } from "@/services/notification.service";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "401 Tidak terautentikasi: Sesi tidak valid atau telah berakhir" },
        { status: 401 }
      );
    }

    const result = await NotificationService.markAllAsRead(
      user.organizationId,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isClientSafe = rawMessage && !rawMessage.toLowerCase().includes("prisma") && !rawMessage.toLowerCase().includes("database");
    return NextResponse.json(
      { error: isClientSafe ? rawMessage : "Gagal menandai seluruh notifikasi sebagai telah dibaca" },
      { status: 500 }
    );
  }
}
