import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { NotificationService } from "@/services/notification.service";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "401 Tidak terautentikasi: Sesi tidak valid atau telah berakhir" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID notifikasi wajib disertakan" }, { status: 400 });
    }

    const notification = await NotificationService.markAsRead(
      id,
      user.id,
      user.organizationId
    );

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error: unknown) {
    const message = (error as Error).message || "";
    if (message.includes("404")) {
      return NextResponse.json(
        { error: "404 Not Found: Notifikasi tidak ditemukan atau akses ditolak" },
        { status: 404 }
      );
    }
    const isClientSafe = message && !message.toLowerCase().includes("prisma") && !message.toLowerCase().includes("database");
    return NextResponse.json(
      { error: isClientSafe ? message : "Gagal memperbarui status notifikasi" },
      { status: 500 }
    );
  }
}
