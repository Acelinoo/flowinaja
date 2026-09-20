import React from "react";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { DashboardService } from "@/services/dashboard.service";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { RequesterOverview } from "@/components/dashboard/requester-overview";
import { ApproverOverview } from "@/components/dashboard/approver-overview";
import { AdminOperationalOverview } from "@/components/dashboard/admin-operational-overview";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { UserRole } from "@prisma/client";

export const metadata = {
  title: "Dasbor Operasional | Flowinaja",
  description: "Platform Pengelolaan Permintaan dan Alur Persetujuan Internal Perusahaan.",
};

interface OverviewPageProps {
  searchParams: Promise<{
    range?: string;
  }>;
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const user = await requireAuthenticatedUser();
  const resolvedParams = await searchParams;
  const range = resolvedParams.range || "ALL";

  if (user.role === UserRole.ADMIN) {
    const adminData = await DashboardService.getAdminDashboard(user, range);
    return (
      <div className="space-y-6">
        <DashboardHeader
          currentRange={adminData.dateRange}
          organizationName={user.organizationName}
        />
        <AdminOperationalOverview
          operationalOverview={adminData.operationalOverview}
          statusDistribution={adminData.statusDistribution}
          approvalWorkloadByRole={adminData.approvalWorkloadByRole}
          completionMetrics={adminData.completionMetrics}
          revisionAndRejectionMetrics={adminData.revisionAndRejectionMetrics}
        />
        <ApproverOverview
          pendingApprovals={adminData.pendingApprovals}
          workloadStats={{
            totalDecided: 0,
            approvedCount: 0,
            rejectedCount: 0,
            revisionRequestedCount: 0,
            avgDecisionTimeHours: 0,
          }}
        />
        <RequesterOverview
          summary={adminData.myRequestsSummary}
          recentRequests={adminData.recentRequests}
        />
        <RecentActivityFeed
          activities={adminData.recentActivity}
          title="Log Aktivitas Organisasi"
          description="Jejak audit alur kerja seluruh departemen dalam organisasi"
        />
      </div>
    );
  }

  if (user.role === UserRole.SUPERVISOR || user.role === UserRole.MANAGER) {
    const approverData = await DashboardService.getApproverDashboard(user, range);
    return (
      <div className="space-y-6">
        <DashboardHeader
          currentRange={approverData.dateRange}
          organizationName={user.organizationName}
        />
        <ApproverOverview
          pendingApprovals={approverData.pendingApprovals}
          workloadStats={approverData.workloadStats}
        />
        <RequesterOverview
          summary={approverData.myRequestsSummary}
          recentRequests={approverData.recentRequests}
        />
        <RecentActivityFeed
          activities={approverData.recentActivity}
          title="Aktivitas Alur Kerja Terkini"
          description="Peristiwa persetujuan dan pengajuan pada lingkup Anda"
        />
      </div>
    );
  }

  // Pengaju Standar (Karyawan)
  const requesterData = await DashboardService.getRequesterDashboard(user, range);
  return (
    <div className="space-y-6">
      <DashboardHeader
        currentRange={requesterData.dateRange}
        organizationName={user.organizationName}
      />
      <RequesterOverview
        summary={requesterData.myRequestsSummary}
        recentRequests={requesterData.recentRequests}
      />
      <RecentActivityFeed
        activities={requesterData.recentActivity}
        title="Aktivitas Permintaan Anda"
        description="Riwayat pembaruan status dan peninjauan pada pengajuan Anda"
        showViewAllLink={false}
      />
    </div>
  );
}
