import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";

export interface RecordApprovalInput {
  organizationId: string;
  requestId: string;
  approvalStepId?: string;
  approverId: string;
  stepOrder: number;
  status: ApprovalStatus;
  comment?: string;
}

export class ApprovalService {
  /**
   * Retrieves all immutable approval records for a given request within an organization.
   */
  static async getApprovalsByRequestId(organizationId: string, requestId: string) {
    // Validate request ownership in organization
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
      orderBy: { stepOrder: "asc" },
    });
  }

  /**
   * Records an approval decision, creating an immutable history entry.
   * Approval history is preserved and never overwritten.
   */
  static async recordApprovalDecision(input: RecordApprovalInput) {
    const { organizationId, requestId, approvalStepId, approverId, stepOrder, status, comment } = input;

    // Verify request exists in organization
    const targetRequest = await prisma.request.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!targetRequest) {
      throw new Error("Request not found in specified organization");
    }

    return prisma.approval.create({
      data: {
        requestId,
        approvalStepId,
        approverId,
        stepOrder,
        status,
        comment,
        decidedAt: new Date(),
      },
      include: {
        approver: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }
}
