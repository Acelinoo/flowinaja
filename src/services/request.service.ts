import { prisma } from "@/lib/prisma";
import {
  RequestStatus,
  RequestPriority,
  ActivityAction,
  ApprovalStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import {
  validateCommonFields,
  validateTypeSpecificMetadata,
  RequestMetadata,
} from "@/lib/validations/request.schema";
import { hasPermission } from "@/lib/auth/permissions";
import { NotificationService } from "@/services/notification.service";
import { CurrentUserContext } from "@/types";

export interface ListMyRequestsParams {
  organizationId: string;
  requesterId: string;
  search?: string;
  status?: RequestStatus;
  requestTypeId?: string;
  priority?: RequestPriority;
  page?: number;
  limit?: number;
}

export interface CreateRequestInput {
  title: string;
  description: string;
  requestTypeId: string;
  priority?: RequestPriority;
  metadata?: RequestMetadata;
}

export interface UpdateDraftInput {
  title?: string;
  description?: string;
  requestTypeId?: string;
  priority?: RequestPriority;
  metadata?: RequestMetadata;
}

export interface UpdateRevisionInput {
  title?: string;
  description?: string;
  priority?: RequestPriority;
  metadata?: RequestMetadata;
}

export class RequestService {
  /**
   * Retrieves all active request types for the organization.
   */
  static async getRequestTypes(organizationId: string) {
    return prisma.requestType.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        approvalSteps: {
          orderBy: { stepOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Retrieves a specific request type by ID with organization isolation.
   */
  static async getRequestTypeById(organizationId: string, requestTypeId: string) {
    return prisma.requestType.findFirst({
      where: {
        id: requestTypeId,
        organizationId,
        isActive: true,
      },
      include: {
        approvalSteps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });
  }

  /**
   * Retrieves paginated requests strictly scoped to the requester and organization.
   * Supports searching by title and filtering by status, request type, and priority.
   */
  static async listMyRequests(params: ListMyRequestsParams) {
    const {
      organizationId,
      requesterId,
      search,
      status,
      requestTypeId,
      priority,
      page = 1,
      limit = 10,
    } = params;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 50);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.RequestWhereInput = {
      organizationId,
      requesterId,
      ...(status ? { status } : {}),
      ...(requestTypeId ? { requestTypeId } : {}),
      ...(priority ? { priority } : {}),
      ...(search && search.trim() !== ""
        ? {
            title: {
              contains: search.trim(),
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [requests, totalCount] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          requestType: {
            select: { id: true, name: true, code: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip,
      }),
      prisma.request.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));

    return {
      requests,
      totalCount,
      totalPages,
      currentPage: safePage,
      limit: safeLimit,
    };
  }

  /**
   * Retrieves a single request by ID strictly ensuring organization isolation
   * and optional requester IDOR verification.
   */
  static async getRequestById(
    organizationId: string,
    requestId: string,
    requesterId?: string
  ) {
    const request = await prisma.request.findFirst({
      where: {
        id: requestId,
        organizationId,
        ...(requesterId ? { requesterId } : {}),
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
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
          orderBy: [{ cycle: "asc" }, { stepOrder: "asc" }],
        },
        activityLogs: {
          include: {
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return request;
  }

  /**
   * Creates a new request record in DRAFT status.
   * Minimal validation required to allow iterative draft saving.
   * Logs ActivityAction.REQUEST_CREATED.
   */
  static async createDraft(input: CreateRequestInput, actor: CurrentUserContext) {
    const title = (input.title || "").trim();
    if (!title || title.length < 3) {
      throw new Error("Validation Error: Draft title must be at least 3 characters");
    }
    if (title.length > 150) {
      throw new Error("Validation Error: Draft title must not exceed 150 characters");
    }

    if (!input.requestTypeId) {
      throw new Error("Validation Error: Request type is required");
    }

    // Verify request type exists in tenant
    const requestType = await this.getRequestTypeById(
      actor.organizationId,
      input.requestTypeId
    );
    if (!requestType) {
      throw new Error("Validation Error: Invalid or inactive request type selected");
    }

    const priority = input.priority && Object.values(RequestPriority).includes(input.priority)
      ? input.priority
      : RequestPriority.NORMAL;

    // Persist draft
    const request = await prisma.request.create({
      data: {
        organizationId: actor.organizationId,
        requesterId: actor.id,
        departmentId: actor.departmentId,
        requestTypeId: requestType.id,
        title,
        description: (input.description || "").trim(),
        priority,
        status: RequestStatus.DRAFT,
        currentStepOrder: 1,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    // Record audit log
    await prisma.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        requestId: request.id,
        actorId: actor.id,
        action: ActivityAction.REQUEST_CREATED,
        details: `Draft request "${request.title}" created.`,
      },
    });

    return request;
  }

  /**
   * Updates an existing request in DRAFT status.
   * Rejects if not owned by actor or if already submitted.
   * Logs ActivityAction.REQUEST_UPDATED.
   */
  static async updateDraft(
    requestId: string,
    input: UpdateDraftInput,
    actor: CurrentUserContext
  ) {
    // 1. Check existing record
    const existing = await prisma.request.findFirst({
      where: {
        id: requestId,
        organizationId: actor.organizationId,
      },
    });

    if (!existing) {
      throw new Error("404 Not Found: Request not found");
    }

    // 2. IDOR / Ownership verification
    if (existing.requesterId !== actor.id) {
      throw new Error("403 Forbidden: You can only edit your own draft requests");
    }

    // 3. Status lifecycle guard
    if (existing.status !== RequestStatus.DRAFT) {
      throw new Error(
        `400 Bad Request: Cannot edit request in '${existing.status}' status. Only DRAFT requests can be edited.`
      );
    }

    // 4. Validate fields if provided
    const updateData: Prisma.RequestUpdateInput = {};

    if (input.title !== undefined) {
      const trimmedTitle = input.title.trim();
      if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
        throw new Error("Validation Error: Title must be between 3 and 150 characters");
      }
      updateData.title = trimmedTitle;
    }

    if (input.description !== undefined) {
      updateData.description = input.description.trim();
    }

    if (input.requestTypeId !== undefined && input.requestTypeId !== existing.requestTypeId) {
      const typeRecord = await this.getRequestTypeById(
        actor.organizationId,
        input.requestTypeId
      );
      if (!typeRecord) {
        throw new Error("Validation Error: Invalid or inactive request type selected");
      }
      updateData.requestType = { connect: { id: typeRecord.id } };
    }

    if (input.priority !== undefined) {
      if (!Object.values(RequestPriority).includes(input.priority)) {
        throw new Error("Validation Error: Invalid priority level");
      }
      updateData.priority = input.priority;
    }

    if (input.metadata !== undefined) {
      updateData.metadata = (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull;
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: updateData,
    });

    // Record audit log
    await prisma.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        requestId: updated.id,
        actorId: actor.id,
        action: ActivityAction.REQUEST_UPDATED,
        details: `Draft request "${updated.title}" details updated.`,
      },
    });

    return updated;
  }

  /**
   * Submits an existing DRAFT request for approval processing.
   * Enforces full validation of common fields and type-specific metadata.
   * Logs ActivityAction.REQUEST_SUBMITTED.
   */
  static async submitDraft(requestId: string, actor: CurrentUserContext) {
    const existing = await prisma.request.findFirst({
      where: {
        id: requestId,
        organizationId: actor.organizationId,
      },
      include: {
        requestType: true,
      },
    });

    if (!existing) {
      throw new Error("404 Not Found: Request not found");
    }

    if (existing.requesterId !== actor.id) {
      throw new Error("403 Forbidden: You can only submit your own draft requests");
    }

    if (existing.status !== RequestStatus.DRAFT) {
      throw new Error(
        `400 Bad Request: Request is already in '${existing.status}' status and cannot be submitted again.`
      );
    }

    // Comprehensive validation before submission
    const commonValidation = validateCommonFields({
      title: existing.title,
      description: existing.description,
      requestTypeId: existing.requestTypeId,
      priority: existing.priority,
    });

    if (!commonValidation.success || !commonValidation.data) {
      const errorMsg = Object.values(commonValidation.errors || {}).join(", ");
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    const metadataValidation = validateTypeSpecificMetadata(
      existing.requestType.code,
      (existing.metadata as Record<string, unknown>) || {}
    );

    if (!metadataValidation.success || !metadataValidation.data) {
      const errorMsg = Object.values(metadataValidation.errors || {}).join(", ");
      throw new Error(`Type-Specific Validation Error: ${errorMsg}`);
    }

    const requestTypeWithSteps = await prisma.requestType.findFirst({
      where: { id: existing.requestTypeId, organizationId: actor.organizationId },
      include: { approvalSteps: { orderBy: { stepOrder: "asc" } } },
    });

    if (!requestTypeWithSteps || requestTypeWithSteps.approvalSteps.length === 0) {
      throw new Error("Validation Error: Selected request type has no approval steps configured");
    }

    const firstStep = requestTypeWithSteps.approvalSteps[0];

    // Atomically transition status to IN_REVIEW, create first pending approval, and log submission
    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.request.updateMany({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
          status: RequestStatus.DRAFT,
          requesterId: actor.id,
        },
        data: {
          status: RequestStatus.IN_REVIEW,
          currentStepOrder: firstStep.stepOrder,
          metadata: (metadataValidation.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          "409 Conflict: Permintaan tidak lagi berstatus DRAFT atau telah diajukan oleh proses lain"
        );
      }

      const req = (await tx.request.findUnique({
        where: { id: requestId },
      }))!;

      await tx.approval.create({
        data: {
          requestId: req.id,
          cycle: 1,
          approvalStepId: firstStep.id,
          stepOrder: firstStep.stepOrder,
          status: ApprovalStatus.PENDING,
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: actor.organizationId,
          requestId: req.id,
          actorId: actor.id,
          action: ActivityAction.REQUEST_SUBMITTED,
          details: `Request "${req.title}" submitted. Approval workflow started at Step 1 (${firstStep.title}) requiring ${firstStep.roleRequired}.`,
        },
      });

      // Dispatch approval notifications inside the same interactive transaction
      await NotificationService.dispatchApprovalPendingNotifications(
        {
          id: req.id,
          title: req.title,
          organizationId: actor.organizationId,
          requesterId: actor.id,
          currentCycle: req.currentCycle,
          currentStepOrder: req.currentStepOrder,
        },
        tx
      );

      return req;
    });

    return updated;
  }

  /**
   * Directly creates and submits a request in one step.
   * Enforces full validation, transitions to IN_REVIEW, creates Step 1 approval, and logs activity.
   */
  static async createAndSubmit(input: CreateRequestInput, actor: CurrentUserContext) {
    // 1. Verify request type
    const requestType = await this.getRequestTypeById(
      actor.organizationId,
      input.requestTypeId
    );
    if (!requestType) {
      throw new Error("Validation Error: Invalid or inactive request type selected");
    }

    if (requestType.approvalSteps.length === 0) {
      throw new Error("Validation Error: Selected request type has no approval steps configured");
    }

    // 2. Full common fields validation
    const commonValidation = validateCommonFields({
      title: input.title,
      description: input.description,
      requestTypeId: input.requestTypeId,
      priority: input.priority,
    });

    if (!commonValidation.success || !commonValidation.data) {
      const errorMsg = Object.values(commonValidation.errors || {}).join(", ");
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    // 3. Full type-specific metadata validation
    const metadataValidation = validateTypeSpecificMetadata(
      requestType.code,
      (input.metadata as Record<string, unknown>) || {}
    );

    if (!metadataValidation.success || !metadataValidation.data) {
      const errorMsg = Object.values(metadataValidation.errors || {}).join(", ");
      throw new Error(`Type-Specific Validation Error: ${errorMsg}`);
    }

    const validCommonData = commonValidation.data;
    const validMetaData = metadataValidation.data;
    const firstStep = requestType.approvalSteps[0];

    // 4. Atomically create in IN_REVIEW status, initialize Step 1 approval, and record dual logs
    const request = await prisma.$transaction(async (tx) => {
      const req = await tx.request.create({
        data: {
          organizationId: actor.organizationId,
          requesterId: actor.id,
          departmentId: actor.departmentId,
          requestTypeId: requestType.id,
          title: validCommonData.title,
          description: validCommonData.description,
          priority: validCommonData.priority || RequestPriority.NORMAL,
          status: RequestStatus.IN_REVIEW,
          currentStepOrder: firstStep.stepOrder,
          metadata: (validMetaData as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      await tx.approval.create({
        data: {
          requestId: req.id,
          cycle: 1,
          approvalStepId: firstStep.id,
          stepOrder: firstStep.stepOrder,
          status: ApprovalStatus.PENDING,
        },
      });

      await tx.activityLog.createMany({
        data: [
          {
            organizationId: actor.organizationId,
            requestId: req.id,
            actorId: actor.id,
            action: ActivityAction.REQUEST_CREATED,
            details: `Request "${req.title}" created.`,
          },
          {
            organizationId: actor.organizationId,
            requestId: req.id,
            actorId: actor.id,
            action: ActivityAction.REQUEST_SUBMITTED,
            details: `Request "${req.title}" submitted. Approval workflow started at Step 1 (${firstStep.title}) requiring ${firstStep.roleRequired}.`,
          },
        ],
      });

      // Dispatch approval notifications inside the same interactive transaction
      await NotificationService.dispatchApprovalPendingNotifications(
        {
          id: req.id,
          title: req.title,
          organizationId: actor.organizationId,
          requesterId: actor.id,
          currentCycle: req.currentCycle,
          currentStepOrder: req.currentStepOrder,
        },
        tx
      );

      return req;
    });

    return request;
  }

  /**
   * Updates an existing request in REVISION_REQUIRED status.
   * Only the original requester may modify their revised request.
   * requestTypeId, requesterId, and organizationId remain strictly immutable.
   * Logs ActivityAction.REQUEST_UPDATED.
   */
  static async updateRevision(
    requestId: string,
    input: UpdateRevisionInput,
    actor: CurrentUserContext
  ) {
    const existing = await prisma.request.findFirst({
      where: {
        id: requestId,
        organizationId: actor.organizationId,
      },
      include: {
        requestType: true,
      },
    });

    if (!existing) {
      throw new Error("404 Not Found: Request not found");
    }

    if (existing.requesterId !== actor.id) {
      throw new Error("403 Forbidden: You can only edit your own requests");
    }

    if (existing.status !== RequestStatus.REVISION_REQUIRED) {
      throw new Error(
        `400 Bad Request: Cannot edit revision for request in '${existing.status}' status. Only REVISION_REQUIRED requests can be revised.`
      );
    }

    const updateData: Prisma.RequestUpdateInput = {};

    if (input.title !== undefined) {
      const trimmedTitle = input.title.trim();
      if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
        throw new Error("Validation Error: Title must be between 3 and 150 characters");
      }
      updateData.title = trimmedTitle;
    }

    if (input.description !== undefined) {
      updateData.description = input.description.trim();
    }

    if (input.priority !== undefined) {
      if (!Object.values(RequestPriority).includes(input.priority)) {
        throw new Error("Validation Error: Invalid priority level");
      }
      updateData.priority = input.priority;
    }

    if (input.metadata !== undefined) {
      const metadataValidation = validateTypeSpecificMetadata(
        existing.requestType.code,
        input.metadata as Record<string, unknown>
      );
      if (!metadataValidation.success || !metadataValidation.data) {
        const errorMsg = Object.values(metadataValidation.errors || {}).join(", ");
        throw new Error(`Type-Specific Validation Error: ${errorMsg}`);
      }
      updateData.metadata = (metadataValidation.data as Prisma.InputJsonValue) ?? Prisma.JsonNull;
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        organizationId: actor.organizationId,
        requestId: updated.id,
        actorId: actor.id,
        action: ActivityAction.REQUEST_UPDATED,
        details: `Revised specifications for request "${updated.title}" updated by requester.`,
      },
    });

    return updated;
  }

  /**
   * Resubmits a request in REVISION_REQUIRED status.
   * Atomically validates the request, increments approval cycle, resets to Step 1,
   * activates ONLY the first approval step for the new cycle, sets status to IN_REVIEW,
   * and records immutable ActivityAction.REQUEST_RESUBMITTED.
   */
  static async resubmitRevision(requestId: string, actor: CurrentUserContext) {
    const existing = await prisma.request.findFirst({
      where: {
        id: requestId,
        organizationId: actor.organizationId,
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

    if (!existing) {
      throw new Error("404 Not Found: Request not found");
    }

    if (existing.requesterId !== actor.id) {
      throw new Error("403 Forbidden: You can only resubmit your own requests");
    }

    if (existing.status !== RequestStatus.REVISION_REQUIRED) {
      throw new Error(
        `400 Bad Request: Request is in '${existing.status}' status and cannot be resubmitted. Only REVISION_REQUIRED requests can be resubmitted.`
      );
    }

    // Comprehensive validation before resubmission
    const commonValidation = validateCommonFields({
      title: existing.title,
      description: existing.description,
      requestTypeId: existing.requestTypeId,
      priority: existing.priority,
    });

    if (!commonValidation.success || !commonValidation.data) {
      const errorMsg = Object.values(commonValidation.errors || {}).join(", ");
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    const metadataValidation = validateTypeSpecificMetadata(
      existing.requestType.code,
      (existing.metadata as Record<string, unknown>) || {}
    );

    if (!metadataValidation.success || !metadataValidation.data) {
      const errorMsg = Object.values(metadataValidation.errors || {}).join(", ");
      throw new Error(`Type-Specific Validation Error: ${errorMsg}`);
    }

    if (existing.requestType.approvalSteps.length === 0) {
      throw new Error("Validation Error: Selected request type has no approval steps configured");
    }

    const firstStep = existing.requestType.approvalSteps[0];
    const newCycle = existing.currentCycle + 1;

    // Interactive transaction ensures ACID consistency and protects against concurrent resubmissions
    const updated = await prisma.$transaction(async (tx) => {
      // Atomic precondition update to guarantee no concurrent resubmissions or cycle tampering
      const updateResult = await tx.request.updateMany({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
          status: RequestStatus.REVISION_REQUIRED,
          requesterId: actor.id,
          currentCycle: existing.currentCycle,
        },
        data: {
          status: RequestStatus.IN_REVIEW,
          currentStepOrder: firstStep.stepOrder,
          currentCycle: newCycle,
          metadata: (metadataValidation.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          `Conflict: Request status was modified concurrently or cycle is no longer ${existing.currentCycle}`
        );
      }

      const req = (await tx.request.findUnique({
        where: { id: requestId },
      }))!;

      // Create ONLY the first approval step for the new cycle (historical approval records are completely untouched)
      await tx.approval.create({
        data: {
          requestId: req.id,
          cycle: newCycle,
          approvalStepId: firstStep.id,
          stepOrder: firstStep.stepOrder,
          status: ApprovalStatus.PENDING,
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: actor.organizationId,
          requestId: req.id,
          actorId: actor.id,
          action: ActivityAction.REQUEST_RESUBMITTED,
          details: `Request "${req.title}" resubmitted for Approval Cycle #${newCycle}. Workflow restarted at Step 1 (${firstStep.title}) requiring ${firstStep.roleRequired}.`,
        },
      });

      // Dispatch approval notifications for new cycle inside interactive transaction
      await NotificationService.dispatchApprovalPendingNotifications(
        {
          id: req.id,
          title: req.title,
          organizationId: actor.organizationId,
          requesterId: actor.id,
          currentCycle: req.currentCycle,
          currentStepOrder: req.currentStepOrder,
        },
        tx
      );

      return req;
    });

    return updated;
  }

  /**
   * Starts fulfillment/processing for an APPROVED request.
   * Actor must possess 'request:manage' permission (MANAGER or ADMIN).
   * Atomically transitions status to PROCESSING and logs ActivityAction.REQUEST_PROCESSING.
   */
  static async startProcessing(requestId: string, actor: CurrentUserContext) {
    if (!hasPermission(actor.role, "request:manage")) {
      throw new Error(
        `403 Forbidden: Role '${actor.role}' is not authorized to start processing requests. Requires management privilege.`
      );
    }

    return prisma.$transaction(async (tx) => {
      const request = await tx.request.findFirst({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
        },
      });

      if (!request) {
        throw new Error("404 Not Found: Request not found in organization");
      }

      if (request.status !== RequestStatus.APPROVED) {
        throw new Error(
          `400 Bad Request: Cannot start processing request in '${request.status}' status. Only APPROVED requests can transition to PROCESSING.`
        );
      }

      const updateResult = await tx.request.updateMany({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
          status: RequestStatus.APPROVED,
        },
        data: {
          status: RequestStatus.PROCESSING,
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          "409 Conflict: Request is no longer in APPROVED status or was modified concurrently"
        );
      }

      const updated = (await tx.request.findUnique({
        where: { id: requestId },
      }))!;

      await tx.activityLog.create({
        data: {
          organizationId: actor.organizationId,
          requestId: request.id,
          actorId: actor.id,
          action: ActivityAction.REQUEST_PROCESSING,
          details: `Request processing initiated by ${actor.name} [${actor.role}].`,
        },
      });

      // Dispatch lifecycle notification to requester
      await NotificationService.dispatchLifecycleNotification(
        {
          organizationId: actor.organizationId,
          requestId: request.id,
          recipientId: request.requesterId,
          type: NotificationType.REQUEST_PROCESSING,
          title: "Fulfillment Started",
          message: `Operational processing has commenced for request "${request.title}".`,
          cycle: request.currentCycle,
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Marks a PROCESSING request as COMPLETED (terminal state).
   * Actor must possess 'request:manage' permission (MANAGER or ADMIN).
   * Atomically transitions status to COMPLETED and logs ActivityAction.REQUEST_COMPLETED.
   */
  static async completeRequest(requestId: string, actor: CurrentUserContext) {
    if (!hasPermission(actor.role, "request:manage")) {
      throw new Error(
        `403 Forbidden: Role '${actor.role}' is not authorized to complete requests. Requires management privilege.`
      );
    }

    return prisma.$transaction(async (tx) => {
      const request = await tx.request.findFirst({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
        },
      });

      if (!request) {
        throw new Error("404 Not Found: Request not found in organization");
      }

      if (request.status !== RequestStatus.PROCESSING) {
        throw new Error(
          `400 Bad Request: Cannot complete request in '${request.status}' status. Only requests in PROCESSING status can be completed.`
        );
      }

      const updateResult = await tx.request.updateMany({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
          status: RequestStatus.PROCESSING,
        },
        data: {
          status: RequestStatus.COMPLETED,
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          "409 Conflict: Request is not in PROCESSING status or was completed concurrently"
        );
      }

      const updated = (await tx.request.findUnique({
        where: { id: requestId },
      }))!;

      await tx.activityLog.create({
        data: {
          organizationId: actor.organizationId,
          requestId: request.id,
          actorId: actor.id,
          action: ActivityAction.REQUEST_COMPLETED,
          details: `Request successfully completed and fulfilled by ${actor.name} [${actor.role}].`,
        },
      });

      // Dispatch lifecycle notification to requester
      await NotificationService.dispatchLifecycleNotification(
        {
          organizationId: actor.organizationId,
          requestId: request.id,
          recipientId: request.requesterId,
          type: NotificationType.REQUEST_COMPLETED,
          title: "Request Completed",
          message: `Your request "${request.title}" has been successfully completed and fulfilled.`,
          cycle: request.currentCycle,
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Cancels a non-terminal request.
   * Can be initiated by the original requester or authorized management personnel ('request:manage').
   * Cannot cancel terminal states (COMPLETED, REJECTED, CANCELLED).
   * Atomically transitions status to CANCELLED and logs ActivityAction.REQUEST_CANCELLED.
   */
  static async cancelRequest(
    requestId: string,
    actor: CurrentUserContext,
    reason?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.request.findFirst({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
        },
      });

      if (!request) {
        throw new Error("404 Not Found: Request not found in organization");
      }

      const terminalStates: RequestStatus[] = [
        RequestStatus.COMPLETED,
        RequestStatus.REJECTED,
        RequestStatus.CANCELLED,
      ];

      if (terminalStates.includes(request.status)) {
        throw new Error(
          `400 Bad Request: Cannot cancel request in terminal state '${request.status}'.`
        );
      }

      const isOwner = request.requesterId === actor.id;
      const canManage = hasPermission(actor.role, "request:manage");

      if (!isOwner && !canManage) {
        throw new Error(
          "403 Forbidden: You do not have permission to cancel this request. Only the requester or management may cancel."
        );
      }

      const cleanReason = (reason || "").trim();

      const updateResult = await tx.request.updateMany({
        where: {
          id: requestId,
          organizationId: actor.organizationId,
          status: {
            notIn: terminalStates,
          },
        },
        data: {
          status: RequestStatus.CANCELLED,
        },
      });

      if (updateResult.count === 0) {
        throw new Error(
          "400 Bad Request: Cannot cancel request in terminal state or modified concurrently"
        );
      }

      const updated = (await tx.request.findUnique({
        where: { id: requestId },
      }))!;

      await tx.activityLog.create({
        data: {
          organizationId: actor.organizationId,
          requestId: request.id,
          actorId: actor.id,
          action: ActivityAction.REQUEST_CANCELLED,
          details: `Request cancelled by ${actor.name} [${actor.role}]${
            isOwner ? " (Requester)" : ""
          }.${cleanReason ? ` Reason: "${cleanReason}"` : ""}`,
        },
      });

      // Dispatch lifecycle notification to requester (or active party)
      await NotificationService.dispatchLifecycleNotification(
        {
          organizationId: actor.organizationId,
          requestId: request.id,
          recipientId: request.requesterId,
          type: NotificationType.REQUEST_CANCELLED,
          title: "Request Cancelled",
          message: `Request "${request.title}" was cancelled by ${actor.name} [${actor.role}].${
            cleanReason ? ` Reason: "${cleanReason}"` : ""
          }`,
          cycle: request.currentCycle,
        },
        tx
      );

      return updated;
    });
  }
}
