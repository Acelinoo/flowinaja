import React from "react";
import {
  Layers,
  CheckSquare,
  PlayCircle,
  CheckCircle2,
  RotateCcw,
  Ban,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatNumberIndonesian } from "@/lib/constants/presentation";

interface AdminOperationalOverviewProps {
  operationalOverview: {
    totalRequests: number;
    pendingReview: number;
    processing: number;
    completed: number;
    revisionRequired: number;
    rejected: number;
    cancelled: number;
    draft: number;
  };
  statusDistribution: Array<{
    status: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  approvalWorkloadByRole: {
    SUPERVISOR: number;
    MANAGER: number;
    ADMIN: number;
    totalActive: number;
  };
  completionMetrics: {
    completedCount: number;
    rejectedCount: number;
    cancelledCount: number;
    totalFinalized: number;
    completionRate: number;
    avgCompletionDurationHours: number;
  };
  revisionAndRejectionMetrics: {
    revisionEventsCount: number;
    rejectionEventsCount: number;
  };
}

export function AdminOperationalOverview({
  operationalOverview,
  statusDistribution,
  approvalWorkloadByRole,
  completionMetrics,
  revisionAndRejectionMetrics,
}: AdminOperationalOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Top Level Operational Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Permintaan
              </span>
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatNumberIndonesian(operationalOverview.totalRequests)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Akumulasi permintaan seluruh departemen
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Menunggu Persetujuan
              </span>
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatNumberIndonesian(operationalOverview.pendingReview)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Antrean aktif pada alur bertahap
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Sedang Diproses
              </span>
              <div className="p-1.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                <PlayCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatNumberIndonesian(operationalOverview.processing)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Telah disetujui & dalam pemenuhan
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Selesai Difinalisasi
              </span>
              <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatNumberIndonesian(operationalOverview.completed)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Permintaan yang tuntas operasional
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Status Distribution & Role Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Distribusi Status Permintaan</CardTitle>
            <CardDescription className="text-xs">
              Komposisi status seluruh permintaan pada organisasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {statusDistribution.map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {formatNumberIndonesian(item.count)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Approval Workload by Role */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Beban Antrean Persetujuan per Peran</CardTitle>
            <CardDescription className="text-xs">
              Permintaan aktif saat ini yang sedang menunggu tanda tangan per tingkat otorisasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block">
                  Supervisor
                </span>
                <span className="text-2xl font-bold text-amber-900 dark:text-amber-100 tabular-nums">
                  {formatNumberIndonesian(approvalWorkloadByRole.SUPERVISOR)}
                </span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400 block mt-0.5">
                  Tahap 1 / Lapangan
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/60">
                <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 block">
                  Manajer
                </span>
                <span className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                  {formatNumberIndonesian(approvalWorkloadByRole.MANAGER)}
                </span>
                <span className="text-[10px] text-purple-700/80 dark:text-purple-400 block mt-0.5">
                  Tahap 2 / Anggaran
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60">
                <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 block">
                  Admin Sistem
                </span>
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                  {formatNumberIndonesian(approvalWorkloadByRole.ADMIN)}
                </span>
                <span className="text-[10px] text-blue-700/80 dark:text-blue-400 block mt-0.5">
                  Final / Eksekutif
                </span>
              </div>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Total Antrean Persetujuan Berjalan:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatNumberIndonesian(approvalWorkloadByRole.totalActive)} Permintaan
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Efficiency & Quality Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tingkat Keberhasilan
              </span>
              <div className="p-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300 tabular-nums">
              {completionMetrics.completionRate}%
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              {completionMetrics.completedCount} selesai dari {completionMetrics.totalFinalized} permintaan difinalisasi
            </p>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Rerata Durasi Selesai
              </span>
              <div className="p-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {completionMetrics.avgCompletionDurationHours > 0
                ? `${completionMetrics.avgCompletionDurationHours} jam`
                : "-"}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Waktu sejak pengajuan hingga status selesai
            </p>
          </CardContent>
        </Card>

        {/* Revision Metrics */}
        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Siklus Revisi Diminta
              </span>
              <div className="p-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
              {formatNumberIndonesian(revisionAndRejectionMetrics.revisionEventsCount)}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Event permintaan pengembalian spesifikasi
            </p>
          </CardContent>
        </Card>

        {/* Rejection Metrics */}
        <Card className="shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Penolakan Alur Kerja
              </span>
              <div className="p-1 rounded bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                <Ban className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-red-700 dark:text-red-400 tabular-nums">
              {formatNumberIndonesian(revisionAndRejectionMetrics.rejectionEventsCount)}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Permintaan ditolak pada evaluasi tahap
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
