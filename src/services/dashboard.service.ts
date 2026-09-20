import { prisma } from "@/lib/prisma";
import {
  RequestStatus,
  ApprovalStatus,
  UserRole,
  Prisma,
} from "@prisma/client";
import { CurrentUserContext } from "@/types";
import { ApprovalService } from "@/services/approval.service";
import { STATUS_LABELS } from "@/lib/constants/presentation";

export type DateRangeType = "ALL" | "TODAY" | "7D" | "30D" | "THIS_MONTH" | "LAST_MONTH";

export interface DateRangeBounds {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Menghitung batas awal dan akhir rentang tanggal waktu lokal.
 */
export function getDateRangeBounds(range?: string): DateRangeBounds {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range?.toUpperCase()) {
    case "TODAY":
      return {
        startDate: todayStart,
        endDate: now,
      };
    case "7D": {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: sevenDaysAgo,
        endDate: now,
      };
    }
    case "30D": {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: thirtyDaysAgo,
        endDate: now,
      };
    }
    case "THIS_MONTH": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: monthStart,
        endDate: now,
      };
    }
    case "LAST_MONTH": {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
      };
    }
    case "ALL":
    default:
      return {};
  }
}

export class DashboardService {
  /**
   * Mengambil data dasbor untuk peran Pengaju (Karyawan).
   * Menampilkan ringkasan permintaan pribadi, permintaan terbaru, dan log aktivitas terkait.
   */
  static async getRequesterDashboard(actor: CurrentUserContext, range: string = "ALL") {
    const { organizationId, id: requesterId } = actor;
    const bounds = getDateRangeBounds(range);

    // Agregasi status permintaan pribadi (server-side groupBy)
    const statusGroups = await prisma.request.groupBy({
      by: ["status"],
      where: {
        organizationId,
        requesterId,
      },
      _count: {
        _all: true,
      },
    });

    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const g of statusGroups) {
      statusCounts[g.status] = g._count._all;
      total += g._count._all;
    }

    const myRequestsSummary = {
      total,
      draft: statusCounts[RequestStatus.DRAFT] || 0,
      inReview:
        (statusCounts[RequestStatus.IN_REVIEW] || 0) +
        (statusCounts[RequestStatus.SUBMITTED] || 0),
      revisionRequired: statusCounts[RequestStatus.REVISION_REQUIRED] || 0,
      processing: statusCounts[RequestStatus.PROCESSING] || 0,
      completed: statusCounts[RequestStatus.COMPLETED] || 0,
      rejected: statusCounts[RequestStatus.REJECTED] || 0,
      cancelled: statusCounts[RequestStatus.CANCELLED] || 0,
    };

    // 5 Permintaan terbaru
    const recentRequests = await prisma.request.findMany({
      where: {
        organizationId,
        requesterId,
        ...(bounds.startDate ? { createdAt: { gte: bounds.startDate, lte: bounds.endDate } } : {}),
      },
      include: {
        requestType: {
          select: { id: true, name: true, code: true },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 5 Log aktivitas terbaru terkait permintaan pengaju
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        organizationId,
        request: {
          requesterId,
        },
        ...(bounds.startDate ? { createdAt: { gte: bounds.startDate, lte: bounds.endDate } } : {}),
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
      take: 5,
    });

    return {
      role: actor.role,
      dateRange: range,
      myRequestsSummary,
      recentRequests,
      recentActivity,
    };
  }

  /**
   * Mengambil data dasbor untuk peran Penyetuju (Supervisor / Manajer).
   * Menampilkan antrean persetujuan yang dapat ditindaklanjuti, beban kerja persetujuan,
   * dan ringkasan permintaan pengaju.
   */
  static async getApproverDashboard(actor: CurrentUserContext, range: string = "ALL") {
    const { id: userId, organizationId } = actor;
    const bounds = getDateRangeBounds(range);

    // Ambil antrean persetujuan tertunda yang actionable (tahap aktif & siklus aktif)
    const pendingResult = await ApprovalService.getPendingApprovalsForUser({
      actor,
      limit: 5,
    });

    // Statistik keputusan persetujuan yang telah diambil oleh penyetuju (historis berfilter tanggal dan terisolasi organisasi)
    const decidedApprovals = await prisma.approval.findMany({
      where: {
        approverId: userId,
        request: {
          organizationId,
        },
        status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.REVISION_REQUESTED] },
        decidedAt: {
          not: null,
          ...(bounds.startDate ? { gte: bounds.startDate, lte: bounds.endDate } : {}),
        },
      },
      select: {
        status: true,
        createdAt: true,
        decidedAt: true,
      },
    });

    let approvedCount = 0;
    let rejectedCount = 0;
    let revisionRequestedCount = 0;
    let totalDecisionDurationMs = 0;

    for (const a of decidedApprovals) {
      if (a.status === ApprovalStatus.APPROVED) approvedCount++;
      if (a.status === ApprovalStatus.REJECTED) rejectedCount++;
      if (a.status === ApprovalStatus.REVISION_REQUESTED) revisionRequestedCount++;
      if (a.decidedAt) {
        totalDecisionDurationMs += a.decidedAt.getTime() - a.createdAt.getTime();
      }
    }

    const totalDecided = decidedApprovals.length;
    const avgDecisionTimeHours =
      totalDecided > 0
        ? Math.round((totalDecisionDurationMs / totalDecided / (1000 * 60 * 60)) * 10) / 10
        : 0;

    // Ambil juga ringkasan permintaan pribadi pengaju
    const requesterData = await this.getRequesterDashboard(actor, range);

    return {
      role: actor.role,
      dateRange: range,
      pendingApprovals: {
        totalCount: pendingResult.totalCount,
        actionableItems: pendingResult.approvals,
      },
      workloadStats: {
        totalDecided,
        approvedCount,
        rejectedCount,
        revisionRequestedCount,
        avgDecisionTimeHours,
      },
      myRequestsSummary: requesterData.myRequestsSummary,
      recentRequests: requesterData.recentRequests,
      recentActivity: requesterData.recentActivity,
    };
  }

  /**
   * Mengambil data dasbor untuk peran Admin (Pengawasan Tingkat Organisasi Penuh).
   * Menampilkan ringkasan operasional, distribusi status, beban antrean persetujuan per peran,
   * metrik pemrosesan, rasio penyelesaian, rasio revisi & penolakan, serta aktivitas organisasi.
   */
  static async getAdminDashboard(actor: CurrentUserContext, range: string = "ALL") {
    const { organizationId } = actor;
    const bounds = getDateRangeBounds(range);

    // 1. Snapshot operasional status organisasi saat ini
    const statusGroups = await prisma.request.groupBy({
      by: ["status"],
      where: {
        organizationId,
      },
      _count: {
        _all: true,
      },
    });

    const statusCounts: Record<string, number> = {};
    let totalRequests = 0;
    for (const g of statusGroups) {
      statusCounts[g.status] = g._count._all;
      totalRequests += g._count._all;
    }

    const operationalOverview = {
      totalRequests,
      pendingReview:
        (statusCounts[RequestStatus.IN_REVIEW] || 0) +
        (statusCounts[RequestStatus.SUBMITTED] || 0),
      processing: statusCounts[RequestStatus.PROCESSING] || 0,
      completed: statusCounts[RequestStatus.COMPLETED] || 0,
      revisionRequired: statusCounts[RequestStatus.REVISION_REQUIRED] || 0,
      rejected: statusCounts[RequestStatus.REJECTED] || 0,
      cancelled: statusCounts[RequestStatus.CANCELLED] || 0,
      draft: statusCounts[RequestStatus.DRAFT] || 0,
    };

    // 2. Distribusi status permintaan
    const statusDistribution = Object.values(RequestStatus).map((st) => {
      const count = statusCounts[st] || 0;
      const percentage = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0;
      return {
        status: st,
        label: STATUS_LABELS[st] || st,
        count,
        percentage,
      };
    });

    // 3. Beban kerja persetujuan per peran (antrean aktif saat ini)
    const activePendingApprovals = await prisma.approval.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        request: {
          organizationId,
          status: RequestStatus.IN_REVIEW,
        },
      },
      include: {
        approvalStep: true,
        request: {
          select: {
            currentCycle: true,
            currentStepOrder: true,
          },
        },
      },
    });

    const strictlyActive = activePendingApprovals.filter(
      (a) =>
        a.cycle === a.request.currentCycle &&
        a.stepOrder === a.request.currentStepOrder
    );

    const approvalWorkloadByRole = {
      SUPERVISOR: strictlyActive.filter((a) => a.approvalStep?.roleRequired === UserRole.SUPERVISOR).length,
      MANAGER: strictlyActive.filter((a) => a.approvalStep?.roleRequired === UserRole.MANAGER).length,
      ADMIN: strictlyActive.filter((a) => a.approvalStep?.roleRequired === UserRole.ADMIN).length,
      totalActive: strictlyActive.length,
    };

    // 4. Metrik penyelesaian (historis terfilter tanggal)
    const finalizedFilter: Prisma.RequestWhereInput = {
      organizationId,
      status: { in: [RequestStatus.COMPLETED, RequestStatus.REJECTED, RequestStatus.CANCELLED] },
      ...(bounds.startDate ? { updatedAt: { gte: bounds.startDate, lte: bounds.endDate } } : {}),
    };

    const finalizedRequests = await prisma.request.findMany({
      where: finalizedFilter,
      select: {
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let completedInRange = 0;
    let rejectedInRange = 0;
    let cancelledInRange = 0;
    let totalCompletionDurationMs = 0;

    for (const req of finalizedRequests) {
      if (req.status === RequestStatus.COMPLETED) {
        completedInRange++;
        totalCompletionDurationMs += req.updatedAt.getTime() - req.createdAt.getTime();
      } else if (req.status === RequestStatus.REJECTED) {
        rejectedInRange++;
      } else if (req.status === RequestStatus.CANCELLED) {
        cancelledInRange++;
      }
    }

    const totalFinalized = finalizedRequests.length;
    const completionRate =
      totalFinalized > 0 ? Math.round((completedInRange / totalFinalized) * 100) : 0;
    const avgCompletionDurationHours =
      completedInRange > 0
        ? Math.round((totalCompletionDurationMs / completedInRange / (1000 * 60 * 60)) * 10) / 10
        : 0;

    // 5. Metrik revisi & penolakan dari riwayat persetujuan (historis terfilter tanggal)
    const historicalApprovals = await prisma.approval.findMany({
      where: {
        request: {
          organizationId,
        },
        decidedAt: {
          not: null,
          ...(bounds.startDate ? { gte: bounds.startDate, lte: bounds.endDate } : {}),
        },
        status: { in: [ApprovalStatus.REVISION_REQUESTED, ApprovalStatus.REJECTED] },
      },
      select: {
        status: true,
      },
    });

    const revisionEventsCount = historicalApprovals.filter(
      (a) => a.status === ApprovalStatus.REVISION_REQUESTED
    ).length;
    const rejectionEventsCount = historicalApprovals.filter(
      (a) => a.status === ApprovalStatus.REJECTED
    ).length;

    // 6. Log aktivitas terbaru se-organisasi
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        organizationId,
        ...(bounds.startDate ? { createdAt: { gte: bounds.startDate, lte: bounds.endDate } } : {}),
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
      take: 10,
    });

    // Ambil juga data penyetuju & pengaju untuk integrasi dasbor
    const approverData = await this.getApproverDashboard(actor, range);

    return {
      role: actor.role,
      dateRange: range,
      operationalOverview,
      statusDistribution,
      approvalWorkloadByRole,
      completionMetrics: {
        completedCount: completedInRange,
        rejectedCount: rejectedInRange,
        cancelledCount: cancelledInRange,
        totalFinalized,
        completionRate,
        avgCompletionDurationHours,
      },
      revisionAndRejectionMetrics: {
        revisionEventsCount,
        rejectionEventsCount,
      },
      recentActivity,
      pendingApprovals: approverData.pendingApprovals,
      myRequestsSummary: approverData.myRequestsSummary,
      recentRequests: approverData.recentRequests,
    };
  }

  /**
   * Entrypoint serbaguna yang secara otomatis mengembalikan payload dasbor
   * yang sesuai dengan tingkat otorisasi peran pengguna.
   */
  static async getDashboardForUser(actor: CurrentUserContext, range: string = "ALL") {
    switch (actor.role) {
      case UserRole.ADMIN:
        return this.getAdminDashboard(actor, range);
      case UserRole.MANAGER:
      case UserRole.SUPERVISOR:
        return this.getApproverDashboard(actor, range);
      case UserRole.EMPLOYEE:
      default:
        return this.getRequesterDashboard(actor, range);
    }
  }
}
