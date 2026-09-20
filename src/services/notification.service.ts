import { prisma } from "@/lib/prisma";
import {
  NotificationType,
  Prisma,
  ApprovalStatus,
  UserRole,
} from "@prisma/client";

export interface GetNotificationsParams {
  organizationId: string;
  userId: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface DispatchLifecycleNotificationParams {
  organizationId: string;
  requestId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  cycle?: number;
  stepOrder?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface UpdatePreferencesInput {
  requestUpdates?: boolean;
  processingUpdates?: boolean;
  completionUpdates?: boolean;
  approvalPending?: boolean;
}

export class NotificationService {
  /**
   * Retrieves paginated notifications strictly scoped to user and organization.
   */
  static async getNotificationsForUser(params: GetNotificationsParams) {
    const { organizationId, userId, unreadOnly = false, page = 1, limit = 20 } = params;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 50);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.NotificationWhereInput = {
      organizationId,
      recipientId: userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          request: {
            select: { id: true, title: true, status: true, currentCycle: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          organizationId,
          recipientId: userId,
          isRead: false,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));

    return {
      notifications,
      totalCount,
      unreadCount,
      totalPages,
      currentPage: safePage,
      limit: safeLimit,
    };
  }

  /**
   * Returns fast unread notification count strictly scoped to user and tenant.
   */
  static async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        organizationId,
        recipientId: userId,
        isRead: false,
      },
    });
  }

  /**
   * Marks a single notification as read, enforcing strict tenant and recipient ownership.
   */
  static async markAsRead(
    notificationId: string,
    recipientId: string,
    organizationId: string
  ) {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId,
        organizationId,
      },
    });

    if (!existing) {
      throw new Error("404 Not Found: Notification not found or unauthorized");
    }

    if (existing.isRead) {
      return existing;
    }

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId,
        organizationId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return prisma.notification.findUniqueOrThrow({
      where: { id: notificationId },
    });
  }

  /**
   * Marks all unread notifications as read for current user in organization.
   */
  static async markAllAsRead(organizationId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        organizationId,
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Retrieves or initializes notification preferences for a user in an organization.
   */
  static async getPreferences(organizationId: string, userId: string) {
    const existing = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    return prisma.notificationPreference.create({
      data: {
        userId,
        organizationId,
        approvalPending: true,
        requestUpdates: true,
        processingUpdates: true,
        completionUpdates: true,
      },
    });
  }

  /**
   * Updates notification preferences for a user.
   * Ensures approvalPending remains mandatory for approvers.
   */
  static async updatePreferences(
    organizationId: string,
    userId: string,
    userRole: UserRole,
    input: UpdatePreferencesInput
  ) {
    // Approval notifications are non-negotiably mandatory for approvers
    const isApproverRole = ([UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN] as UserRole[]).includes(userRole);
    const enforcedApprovalPending = isApproverRole ? true : (input.approvalPending ?? true);

    return prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(input.requestUpdates !== undefined ? { requestUpdates: input.requestUpdates } : {}),
        ...(input.processingUpdates !== undefined ? { processingUpdates: input.processingUpdates } : {}),
        ...(input.completionUpdates !== undefined ? { completionUpdates: input.completionUpdates } : {}),
        approvalPending: enforcedApprovalPending,
      },
      create: {
        userId,
        organizationId,
        approvalPending: enforcedApprovalPending,
        requestUpdates: input.requestUpdates ?? true,
        processingUpdates: input.processingUpdates ?? true,
        completionUpdates: input.completionUpdates ?? true,
      },
    });
  }

  /**
   * Dispatches APPROVAL_PENDING notifications to authoritative eligible approvers.
   * Derives recipients from the active Approval record, cycle, step order, and ApprovalStep.roleRequired.
   * Protects against duplicate notifications using deterministic dedupeKey.
   */
  static async dispatchApprovalPendingNotifications(
    request: {
      id: string;
      title: string;
      organizationId: string;
      requesterId: string;
      currentCycle: number;
      currentStepOrder: number;
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;

    // 1. Authoritative lookup of active pending approval record
    const pendingApproval = await client.approval.findFirst({
      where: {
        requestId: request.id,
        cycle: request.currentCycle,
        stepOrder: request.currentStepOrder,
        status: ApprovalStatus.PENDING,
      },
      include: {
        approvalStep: true,
      },
    });

    if (!pendingApproval || !pendingApproval.approvalStep) {
      return [];
    }

    const requiredRole = pendingApproval.approvalStep.roleRequired;

    // 2. Resolve eligible approvers in the same organization
    let approvers = await client.user.findMany({
      where: {
        organizationId: request.organizationId,
        role: requiredRole,
        isActive: true,
        id: { not: request.requesterId }, // Exclude requester if they happen to share role
      },
      include: {
        notificationPreference: true,
      },
    });

    // Fallback if requester is the only user with that role
    if (approvers.length === 0) {
      approvers = await client.user.findMany({
        where: {
          organizationId: request.organizationId,
          role: requiredRole,
          isActive: true,
        },
        include: {
          notificationPreference: true,
        },
      });
    }

    // 3. Create deterministic, de-duplicated notifications for each eligible approver
    const createdNotifications = [];
    for (const approver of approvers) {
      // Check preferences (approver alerts are mandatory for approvers)
      const pref = approver.notificationPreference;
      if (pref && pref.approvalPending === false && approver.role === UserRole.EMPLOYEE) {
        continue;
      }

      const dedupeKey = `${request.organizationId}:${approver.id}:APPROVAL_PENDING:${request.id}:${request.currentCycle}:${pendingApproval.stepOrder}`;

      const notif = await client.notification.upsert({
        where: { dedupeKey },
        update: {}, // Idempotent: don't alter existing
        create: {
          organizationId: request.organizationId,
          recipientId: approver.id,
          requestId: request.id,
          type: NotificationType.APPROVAL_PENDING,
          title: `Approval Required: Step ${pendingApproval.stepOrder}`,
          message: `Request "${request.title}" is waiting for your ${pendingApproval.approvalStep.title} sign-off.`,
          cycle: request.currentCycle,
          stepOrder: pendingApproval.stepOrder,
          dedupeKey,
          metadata: {
            stepTitle: pendingApproval.approvalStep.title,
            roleRequired: requiredRole,
            cycle: request.currentCycle,
          },
        },
      });

      createdNotifications.push(notif);
    }

    return createdNotifications;
  }

  /**
   * Dispatches a lifecycle notification (REQUEST_APPROVED, REQUEST_REJECTED, REVISION_REQUESTED, etc.)
   * Respects user notification preferences and prevents duplicates via deterministic dedupeKey.
   */
  static async dispatchLifecycleNotification(
    params: DispatchLifecycleNotificationParams,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;

    // 1. Check recipient preferences
    const pref = await client.notificationPreference.findUnique({
      where: { userId: params.recipientId },
    });

    if (pref) {
      if (
        (params.type === NotificationType.REQUEST_APPROVED ||
          params.type === NotificationType.REQUEST_REJECTED ||
          params.type === NotificationType.REVISION_REQUESTED) &&
        pref.requestUpdates === false
      ) {
        return null;
      }

      if (params.type === NotificationType.REQUEST_PROCESSING && pref.processingUpdates === false) {
        return null;
      }

      if (
        (params.type === NotificationType.REQUEST_COMPLETED ||
          params.type === NotificationType.REQUEST_CANCELLED) &&
        pref.completionUpdates === false
      ) {
        return null;
      }
    }

    // 2. Build deterministic dedupeKey
    let dedupeKey = `${params.organizationId}:${params.recipientId}:${params.type}:${params.requestId}`;
    if (params.cycle !== undefined) {
      dedupeKey += `:${params.cycle}`;
    }
    if (params.stepOrder !== undefined) {
      dedupeKey += `:${params.stepOrder}`;
    }

    // 3. Upsert notification
    return client.notification.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        organizationId: params.organizationId,
        recipientId: params.recipientId,
        requestId: params.requestId,
        type: params.type,
        title: params.title,
        message: params.message,
        cycle: params.cycle ?? null,
        stepOrder: params.stepOrder ?? null,
        dedupeKey,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }
}
