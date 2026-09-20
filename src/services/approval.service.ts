import { prisma } from "@/lib/prisma";
import {
  ApprovalStatus,
  RequestStatus,
  ActivityAction,
  NotificationType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { NotificationService } from "@/services/notification.service";
import { CurrentUserContext } from "@/types";

export interface DecideApprovalInput {
  organizationId: string;
  requestId: string;
  approvalId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_REVISION";
  comment?: string;
  actor: CurrentUserContext;
}

export interface GetPendingApprovalsParams {
  actor: CurrentUserContext;
  page?: number;
  limit?: number;
  search?: string;
}

export class ApprovalService {
  /**
   * Retrieves all sequential approval records for a given request within an organization.
   */
  static async getApprovalsByRequestId(organizationId: string, requestId: string) {
    const req = await prisma.request.findFirst({
      where: { id: requestId, organizationId },
      select: { id: true },
    });

    if (!req) {
      return [];
    }

    return prisma.approval.findMany({
      where: { requestId },
      include: {
        approver: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvalStep: true,
      },
      orderBy: [{ cycle: "asc" }, { stepOrder: "asc" }],
    });
  }

  /**
   * Executes an atomic approval decision inside a strict Prisma transaction.
   * Enforces server-side exact role authorization, request status lifecycle guards,
   * single-step sequential activation, and immutable audit logging.
   */
  static async decideApproval(input: DecideApprovalInput) {
    const { organizationId, requestId, approvalId, decision, comment, actor } = input;

    // Run within interactive transaction to guarantee ACID consistency and prevent race conditions
    return prisma.$transaction(async (tx) => {
      // 1. Fetch request with full type and approval steps configuration
      const request = await tx.request.findFirst({
        where: {
          id: requestId,
          organizationId,
        },
        include: {
          requestType: {
            include: {
              approvalSteps: {
                orderBy: { stepOrder: "asc" },
              },
            },
          },
        },
      });

      if (!request) {
        throw new Error("404 Not Found: Request not found in organization");
      }

      // 2. Lifecycle guard: Request must be currently IN_REVIEW
      if (request.status !== RequestStatus.IN_REVIEW) {
        throw new Error(
          `400 Bad Request: Cannot decide approval for request in '${request.status}' status. Only requests in IN_REVIEW status can be approved/rejected.`
        );
      }

      // 3. Fetch specific approval record
      const approval = await tx.approval.findFirst({
        where: {
          id: approvalId,
          requestId,
          cycle: request.currentCycle,
        },
        include: {
          approvalStep: true,
        },
      });

      if (!approval) {
        throw new Error("404 Not Found: Approval record not found for this request");
      }

      // 4. Stale approval guard: Must be PENDING
      if (approval.status !== ApprovalStatus.PENDING) {
        throw new Error(
          `400 Bad Request: This approval step has already been decided (${approval.status})`
        );
      }

      // 5. Active step guard: Must match the currentStepOrder of the request
      if (approval.stepOrder !== request.currentStepOrder) {
        throw new Error(
          `400 Bad Request: Approval step (${approval.stepOrder}) does not match current active workflow step (${request.currentStepOrder})`
        );
      }

      // 6. Organization isolation check
      if (actor.organizationId !== organizationId || actor.organizationId !== request.organizationId) {
        throw new Error("403 Forbidden: Cross-organization approval operation denied");
      }

      // 7. Role Matching or Administrative Authority
      const requiredRole = approval.approvalStep?.roleRequired;
      if (!requiredRole) {
        throw new Error("500 Internal Error: Approval step configuration missing required role");
      }

      const isExactRole = actor.role === requiredRole;
      const isAdminAuthority = actor.role === UserRole.ADMIN;

      if (!isExactRole && !isAdminAuthority) {
        throw new Error(
          `403 Forbidden: Role mismatch. Required role is '${requiredRole}', but your role is '${actor.role}'.`
        );
      }

      // 8. Comment validation
      const cleanComment = (comment || "").trim();
      if (decision === "REJECT" && cleanComment.length < 5) {
        throw new Error("Validation Error: A clear rejection reason is required (minimum 5 characters)");
      }
      if (decision === "REQUEST_REVISION" && cleanComment.length < 5) {
        throw new Error("Validation Error: A clear revision request reason is required (minimum 5 characters)");
      }

      // 9. Execute Decision Logic
      if (decision === "APPROVE") {
        // Mark current approval step as APPROVED with atomic concurrency condition
        const approvalUpdate = await tx.approval.updateMany({
          where: {
            id: approval.id,
            status: ApprovalStatus.PENDING,
          },
          data: {
            status: ApprovalStatus.APPROVED,
            approverId: actor.id,
            comment: cleanComment || null,
            decidedAt: new Date(),
          },
        });

        if (approvalUpdate.count === 0) {
          throw new Error(
            "409 Conflict: This approval step has already been decided or modified concurrently"
          );
        }

        const updatedApproval = await tx.approval.findUnique({
          where: { id: approval.id },
        });

        // Determine next sequential step
        const allSteps = request.requestType.approvalSteps;
        const nextStep = allSteps.find((s) => s.stepOrder > approval.stepOrder);

        if (nextStep && !approval.approvalStep?.isFinal) {
          // Advance request to next step, keep status IN_REVIEW
          const reqUpdate = await tx.request.updateMany({
            where: {
              id: request.id,
              organizationId,
              status: RequestStatus.IN_REVIEW,
              currentCycle: request.currentCycle,
              currentStepOrder: approval.stepOrder,
            },
            data: {
              currentStepOrder: nextStep.stepOrder,
            },
          });

          if (reqUpdate.count === 0) {
            throw new Error(
              "409 Conflict: Request workflow state was modified concurrently"
            );
          }

          // Activate/create ONLY the next approval step record for the current cycle
          await tx.approval.create({
            data: {
              requestId: request.id,
              cycle: request.currentCycle,
              approvalStepId: nextStep.id,
              stepOrder: nextStep.stepOrder,
              status: ApprovalStatus.PENDING,
            },
          });

          // Log intermediate step approval event
          await tx.activityLog.create({
            data: {
              organizationId,
              requestId: request.id,
              actorId: actor.id,
              action: ActivityAction.APPROVAL_APPROVED,
              details: `Tahap ${approval.stepOrder} (${approval.approvalStep?.title}) disetujui oleh ${actor.name} [${actor.role}]. Alur kerja berlanjut ke Tahap ${nextStep.stepOrder} (${nextStep.title}) [${nextStep.roleRequired}].${cleanComment ? ` Catatan: "${cleanComment}"` : ""}`,
            },
          });

          // Dispatch approval notifications to next step approvers inside transaction
          await NotificationService.dispatchApprovalPendingNotifications(
            {
              id: request.id,
              title: request.title,
              organizationId,
              requesterId: request.requesterId,
              currentCycle: request.currentCycle,
              currentStepOrder: nextStep.stepOrder,
            },
            tx
          );
        } else {
          // This was the final step: finalize request as APPROVED
          const reqUpdate = await tx.request.updateMany({
            where: {
              id: request.id,
              organizationId,
              status: RequestStatus.IN_REVIEW,
              currentCycle: request.currentCycle,
              currentStepOrder: approval.stepOrder,
            },
            data: {
              status: RequestStatus.APPROVED,
            },
          });

          if (reqUpdate.count === 0) {
            throw new Error(
              "409 Conflict: Request workflow state was modified concurrently"
            );
          }

          // Log final request approval event
          await tx.activityLog.create({
            data: {
              organizationId,
              requestId: request.id,
              actorId: actor.id,
              action: ActivityAction.REQUEST_APPROVED,
              details: `Persetujuan akhir diberikan pada Tahap ${approval.stepOrder} (${approval.approvalStep?.title}) oleh ${actor.name} [${actor.role}]. Permintaan resmi DISETUJUI.${cleanComment ? ` Catatan: "${cleanComment}"` : ""}`,
            },
          });

          // Dispatch final approval notification to requester inside transaction
          await NotificationService.dispatchLifecycleNotification(
            {
              organizationId,
              requestId: request.id,
              recipientId: request.requesterId,
              type: NotificationType.REQUEST_APPROVED,
              title: "Permintaan Disetujui Penuh",
              message: `Permintaan Anda "${request.title}" telah memperoleh persetujuan akhir dan resmi disetujui.`,
              cycle: request.currentCycle,
              stepOrder: approval.stepOrder,
            },
            tx
          );
        }

        return { success: true, decision: "APPROVE", approval: updatedApproval };
      }

      if (decision === "REJECT") {
        // Mark current approval as REJECTED with atomic concurrency condition
        const approvalUpdate = await tx.approval.updateMany({
          where: {
            id: approval.id,
            status: ApprovalStatus.PENDING,
          },
          data: {
            status: ApprovalStatus.REJECTED,
            approverId: actor.id,
            comment: cleanComment,
            decidedAt: new Date(),
          },
        });

        if (approvalUpdate.count === 0) {
          throw new Error(
            "409 Conflict: This approval step has already been decided or modified concurrently"
          );
        }

        const updatedApproval = await tx.approval.findUnique({
          where: { id: approval.id },
        });

        // Set request status to REJECTED (no future steps can be activated)
        const reqUpdate = await tx.request.updateMany({
          where: {
            id: request.id,
            organizationId,
            status: RequestStatus.IN_REVIEW,
            currentCycle: request.currentCycle,
            currentStepOrder: approval.stepOrder,
          },
          data: {
            status: RequestStatus.REJECTED,
          },
        });

        if (reqUpdate.count === 0) {
          throw new Error(
            "409 Conflict: Request workflow state was modified concurrently"
          );
        }

        // Log request rejection event
        await tx.activityLog.create({
          data: {
            organizationId,
            requestId: request.id,
            actorId: actor.id,
            action: ActivityAction.REQUEST_REJECTED,
            details: `Permintaan ditolak pada Tahap ${approval.stepOrder} (${approval.approvalStep?.title}) oleh ${actor.name} [${actor.role}]. Alasan: "${cleanComment}"`,
          },
        });

        // Dispatch rejection notification to requester inside transaction
        await NotificationService.dispatchLifecycleNotification(
          {
            organizationId,
            requestId: request.id,
            recipientId: request.requesterId,
            type: NotificationType.REQUEST_REJECTED,
            title: "Permintaan Ditolak",
            message: `Permintaan Anda "${request.title}" ditolak oleh ${actor.name} [${actor.role}]. Alasan: "${cleanComment}"`,
            cycle: request.currentCycle,
            stepOrder: approval.stepOrder,
          },
          tx
        );

        return { success: true, decision: "REJECT", approval: updatedApproval };
      }

      if (decision === "REQUEST_REVISION") {
        // Mark current approval as REVISION_REQUESTED with atomic concurrency condition
        const approvalUpdate = await tx.approval.updateMany({
          where: {
            id: approval.id,
            status: ApprovalStatus.PENDING,
          },
          data: {
            status: ApprovalStatus.REVISION_REQUESTED,
            approverId: actor.id,
            comment: cleanComment,
            decidedAt: new Date(),
          },
        });

        if (approvalUpdate.count === 0) {
          throw new Error(
            "409 Conflict: This approval step has already been decided or modified concurrently"
          );
        }

        const updatedApproval = await tx.approval.findUnique({
          where: { id: approval.id },
        });

        // Set request status to REVISION_REQUIRED
        const reqUpdate = await tx.request.updateMany({
          where: {
            id: request.id,
            organizationId,
            status: RequestStatus.IN_REVIEW,
            currentCycle: request.currentCycle,
            currentStepOrder: approval.stepOrder,
          },
          data: {
            status: RequestStatus.REVISION_REQUIRED,
          },
        });

        if (reqUpdate.count === 0) {
          throw new Error(
            "409 Conflict: Request workflow state was modified concurrently"
          );
        }

        // Log revision requested event
        await tx.activityLog.create({
          data: {
            organizationId,
            requestId: request.id,
            actorId: actor.id,
            action: ActivityAction.REVISION_REQUESTED,
            details: `Revisi diminta pada Tahap ${approval.stepOrder} (${approval.approvalStep?.title}) oleh ${actor.name} [${actor.role}]. Catatan perbaikan: "${cleanComment}"`,
          },
        });

        // Dispatch revision required notification to requester inside transaction
        await NotificationService.dispatchLifecycleNotification(
          {
            organizationId,
            requestId: request.id,
            recipientId: request.requesterId,
            type: NotificationType.REVISION_REQUESTED,
            title: "Revisi Diperlukan",
            message: `Revisi diminta untuk permintaan "${request.title}" oleh ${actor.name} [${actor.role}]. Catatan perbaikan: "${cleanComment}"`,
            cycle: request.currentCycle,
            stepOrder: approval.stepOrder,
          },
          tx
        );

        return { success: true, decision: "REQUEST_REVISION", approval: updatedApproval };
      }

      throw new Error(`400 Bad Request: Unknown approval decision '${decision}'`);
    });
  }

  /**
   * Retrieves pending approvals where the authenticated user is currently eligible to act.
   * Scoped strictly by organization, active step order, and exact role.
   */
  static async getPendingApprovalsForUser(params: GetPendingApprovalsParams) {
    const { actor, page = 1, limit = 10, search } = params;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 50);

    const where: Prisma.ApprovalWhereInput = {
      status: ApprovalStatus.PENDING,
      ...(actor.role === UserRole.ADMIN
        ? {}
        : {
            approvalStep: {
              roleRequired: actor.role,
            },
          }),
      request: {
        organizationId: actor.organizationId,
        status: RequestStatus.IN_REVIEW,
        ...(search && search.trim() !== ""
          ? {
              OR: [
                { title: { contains: search.trim(), mode: "insensitive" } },
                { requester: { name: { contains: search.trim(), mode: "insensitive" } } },
              ],
            }
          : {}),
      },
    };

    // Query pending approvals for this role
    const allMatching = await prisma.approval.findMany({
      where,
      include: {
        approvalStep: true,
        request: {
          include: {
            requester: {
              select: { id: true, name: true, email: true, role: true },
            },
            department: {
              select: { id: true, name: true, code: true },
            },
            requestType: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Strictly ensure approval.stepOrder === request.currentStepOrder and cycle === currentCycle (active step of active cycle only)
    const actionable = allMatching.filter(
      (a) =>
        a.stepOrder === a.request.currentStepOrder &&
        a.cycle === a.request.currentCycle
    );

    const totalCount = actionable.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
    const skip = (safePage - 1) * safeLimit;
    const paginatedItems = actionable.slice(skip, skip + safeLimit);

    return {
      approvals: paginatedItems,
      totalCount,
      totalPages,
      currentPage: safePage,
      limit: safeLimit,
    };
  }
}
