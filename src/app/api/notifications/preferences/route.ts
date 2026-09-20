import { NextRequest, NextResponse } from "next/server";
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

    const preferences = await NotificationService.getPreferences(
      user.organizationId,
      user.id
    );

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isClientSafe = rawMessage && !rawMessage.toLowerCase().includes("prisma") && !rawMessage.toLowerCase().includes("database");
    return NextResponse.json(
      { error: isClientSafe ? rawMessage : "Gagal memuat preferensi notifikasi" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "401 Tidak terautentikasi: Sesi tidak valid atau telah berakhir" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const preferences = await NotificationService.updatePreferences(
      user.organizationId,
      user.id,
      user.role,
      {
        requestUpdates: body.requestUpdates,
        processingUpdates: body.processingUpdates,
        completionUpdates: body.completionUpdates,
        approvalPending: body.approvalPending,
      }
    );

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isClientSafe = rawMessage && !rawMessage.toLowerCase().includes("prisma") && !rawMessage.toLowerCase().includes("database");
    return NextResponse.json(
      { error: isClientSafe ? rawMessage : "Gagal memperbarui preferensi notifikasi" },
      { status: 500 }
    );
  }
}
