import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/sync
 * Lightweight real-time synchronization heartbeat endpoint.
 * Returns latest modification timestamps and recent events across the organization.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, id: userId } = session.user;

    const [latestRequest, latestApproval, latestActivity, unreadNotificationsCount] =
      await Promise.all([
        prisma.request.findFirst({
          where: { organizationId },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            requesterId: true,
            requester: { select: { name: true } },
            requestType: { select: { name: true } },
          },
        }),
        prisma.approval.findFirst({
          where: { request: { organizationId } },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            status: true,
            stepOrder: true,
            updatedAt: true,
            requestId: true,
            request: { select: { title: true } },
          },
        }),
        prisma.activityLog.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            action: true,
            details: true,
            createdAt: true,
            actor: { select: { name: true } },
          },
        }),
        prisma.notification.count({
          where: {
            recipientId: userId,
            isRead: false,
          },
        }),
      ]);

    const reqTime = latestRequest?.updatedAt ? new Date(latestRequest.updatedAt).getTime() : 0;
    const appTime = latestApproval?.updatedAt ? new Date(latestApproval.updatedAt).getTime() : 0;
    const actTime = latestActivity?.createdAt ? new Date(latestActivity.createdAt).getTime() : 0;

    const syncVersion = `${reqTime}_${appTime}_${actTime}_${unreadNotificationsCount}`;

    return NextResponse.json(
      {
        syncVersion,
        timestamp: Date.now(),
        unreadNotificationsCount,
        latestRequest: latestRequest
          ? {
              id: latestRequest.id,
              title: latestRequest.title,
              status: latestRequest.status,
              priority: latestRequest.priority,
              createdAt: latestRequest.createdAt,
              updatedAt: latestRequest.updatedAt,
              isSelf: latestRequest.requesterId === userId,
              requesterName: latestRequest.requester.name,
              requestTypeName: latestRequest.requestType.name,
            }
          : null,
        latestApproval: latestApproval
          ? {
              id: latestApproval.id,
              status: latestApproval.status,
              stepOrder: latestApproval.stepOrder,
              updatedAt: latestApproval.updatedAt,
              requestId: latestApproval.requestId,
              requestTitle: latestApproval.request.title,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("[Flowinaja Realtime Sync API Error]:", error);
    return NextResponse.json({ error: "Gagal menyinkronkan data" }, { status: 500 });
  }
}
