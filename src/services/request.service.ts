import { prisma } from "@/lib/prisma";
import { RequestStatus, RequestPriority } from "@prisma/client";

export interface RequestFilterParams {
  organizationId: string;
  requesterId?: string;
  status?: RequestStatus;
  requestTypeId?: string;
  departmentId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRequestInput {
  organizationId: string;
  requesterId: string;
  departmentId?: string;
  requestTypeId: string;
  title: string;
  description: string;
  priority?: RequestPriority;
}

export class RequestService {
  /**
   * Retrieves requests safely scoped to the organization with optional filtering and pagination.
   */
  static async getRequests(params: RequestFilterParams) {
    const {
      organizationId,
      requesterId,
      status,
      requestTypeId,
      departmentId,
      limit = 20,
      offset = 0,
    } = params;

    return prisma.request.findMany({
      where: {
        organizationId,
        ...(requesterId ? { requesterId } : {}),
        ...(status ? { status } : {}),
        ...(requestTypeId ? { requestTypeId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
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
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      skip: offset,
    });
  }

  /**
   * Retrieves a single request by ID strictly ensuring organization isolation.
   */
  static async getRequestById(organizationId: string, requestId: string) {
    return prisma.request.findFirst({
      where: {
        id: requestId,
        organizationId,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, role: true, departmentId: true },
        },
        department: true,
        requestType: {
          include: {
            approvalSteps: {
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, email: true, role: true },
            },
            approvalStep: true,
          },
          orderBy: { stepOrder: "asc" },
        },
        activityLogs: {
          include: {
            actor: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Creates a new request record within organization boundaries.
   */
  static async createRequest(input: CreateRequestInput) {
    return prisma.request.create({
      data: {
        organizationId: input.organizationId,
        requesterId: input.requesterId,
        departmentId: input.departmentId,
        requestTypeId: input.requestTypeId,
        title: input.title,
        description: input.description,
        priority: input.priority ?? RequestPriority.NORMAL,
        status: RequestStatus.DRAFT,
        currentStepOrder: 1,
      },
    });
  }
}
