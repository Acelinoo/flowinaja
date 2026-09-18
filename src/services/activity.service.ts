import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@prisma/client";

export interface LogActivityInput {
  organizationId: string;
  requestId?: string;
  actorId?: string;
  action: ActivityAction;
  details?: string;
}

export class ActivityService {
  /**
   * Logs a domain activity event to the immutable activity log.
   */
  static async logActivity(input: LogActivityInput) {
    return prisma.activityLog.create({
      data: {
        organizationId: input.organizationId,
        requestId: input.requestId,
        actorId: input.actorId,
        action: input.action,
        details: input.details,
      },
    });
  }

  /**
   * Retrieves audit activity logs for an organization or specific request.
   */
  static async getActivityLogs(params: {
    organizationId: string;
    requestId?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { organizationId, requestId, actorId, limit = 25, offset = 0 } = params;

    return prisma.activityLog.findMany({
      where: {
        organizationId,
        ...(requestId ? { requestId } : {}),
        ...(actorId ? { actorId } : {}),
      },
      include: {
        actor: {
          select: { id: true, name: true, email: true, role: true },
        },
        request: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      skip: offset,
    });
  }
}
