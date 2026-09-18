import { prisma } from "@/lib/prisma";

export interface CreateNotificationInput {
  organizationId: string;
  recipientId: string;
  requestId?: string;
  title: string;
  message: string;
}

export class NotificationService {
  /**
   * Retrieves notifications for a specific user in an organization.
   */
  static async getNotificationsForUser(params: {
    organizationId: string;
    userId: string;
    unreadOnly?: boolean;
    limit?: number;
  }) {
    const { organizationId, userId, unreadOnly = false, limit = 20 } = params;

    return prisma.notification.findMany({
      where: {
        organizationId,
        recipientId: userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        request: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
    });
  }

  /**
   * Marks a notification as read, ensuring it belongs to the requesting recipient.
   */
  static async markAsRead(notificationId: string, recipientId: string) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Creates an in-app database notification.
   */
  static async createNotification(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        recipientId: input.recipientId,
        requestId: input.requestId,
        title: input.title,
        message: input.message,
      },
    });
  }
}
