import React from "react";
import Link from "next/link";
import {
  CheckSquare,
  AlertCircle,
  ArrowRight,
  ThumbsUp,
  RotateCcw,
  Ban,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { formatNumberIndonesian } from "@/lib/constants/presentation";

interface ApproverOverviewProps {
  pendingApprovals: {
    totalCount: number;
    actionableItems: Array<{
      id: string;
      stepOrder: number;
      cycle: number;
      approvalStep?: { title: string } | null;
      request: {
        id: string;
        title: string;
        priority: string;
        requester: { name: string; email: string };
        department?: { name: string } | null;
        requestType: { name: string };
      };
    }>;
  };
  workloadStats: {
    totalDecided: number;
    approvedCount: number;
    rejectedCount: number;
    revisionRequestedCount: number;
    avgDecisionTimeHours: number;
  };
}

export function ApproverOverview({ pendingApprovals, workloadStats }: ApproverOverviewProps) {
  const hasPending = pendingApprovals.totalCount > 0;

  return (
    <div className="space-y-6">
      {/* Pending Queue Alert Banner */}
      {hasPending ? (
        <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-600 text-white shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-950 dark:text-blue-100">
                Antrean Persetujuan Menunggu Tindakan Anda
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Terdapat{" "}
                <span className="font-bold underline">
                  {pendingApprovals.totalCount} permintaan
                </span>{" "}
                yang secara sah berada pada tahap peninjauan peran Anda saat ini.
              </p>
            </div>
          </div>
          <Link href="/approvals">
            <Button size="sm" className="shrink-0 flex items-center gap-1.5">
              <span>Buka Antrean</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 text-xs text-slate-500">
          <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Tidak ada persetujuan tertunda yang memerlukan tindakan Anda saat ini. Seluruh alur kerja dalam kondisi termutakhir.</span>
        </div>
      )}

      {/* Actionable Approvals List */}
      {hasPending && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Daftar Permintaan Menunggu Tanda Tangan</CardTitle>
              <CardDescription className="text-xs">
                Verifikasi dokumen spesifikasi dan berikan keputusan alur kerja
              </CardDescription>
            </div>
            <Link href="/approvals">
              <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                <span>Selengkapnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Judul Permintaan</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Pengaju</th>
                    <th className="py-2.5 px-3">Tahap Persetujuan</th>
                    <th className="py-2.5 px-3">Prioritas</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingApprovals.actionableItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        <Link
                          href={`/requests/${item.request.id}`}
                          className="hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {item.request.title}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {item.request.requestType.name}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {item.request.requester.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.request.department?.name || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">Tahap {item.stepOrder}</span>
                        {item.approvalStep && (
                          <span className="text-slate-400"> ({item.approvalStep.title})</span>
                        )}
                        {item.cycle > 1 && (
                          <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            [Siklus #{item.cycle}]
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <PriorityBadge priority={item.request.priority} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/requests/${item.request.id}`}>
                          <Button variant="primary" size="sm" className="h-7 px-2.5 text-xs">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Tinjau
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workload Performance Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Statistik Keputusan Persetujuan Anda</CardTitle>
          <CardDescription className="text-xs">
            Riwayat keputusan yang telah Anda ambil dalam rentang waktu terpilih
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 mb-1">Total Keputusan</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatNumberIndonesian(workloadStats.totalDecided)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" /> Disetujui
              </div>
              <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 tabular-nums">
                {formatNumberIndonesian(workloadStats.approvedCount)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
              <div className="text-[11px] text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Revisi Diminta
              </div>
              <div className="text-xl font-bold text-amber-800 dark:text-amber-200 tabular-nums">
                {formatNumberIndonesian(workloadStats.revisionRequestedCount)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900">
              <div className="text-[11px] text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                <Ban className="w-3 h-3" /> Ditolak
              </div>
              <div className="text-xl font-bold text-red-800 dark:text-red-200 tabular-nums">
                {formatNumberIndonesian(workloadStats.rejectedCount)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Rerata Durasi
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {workloadStats.avgDecisionTimeHours > 0 ? `${workloadStats.avgDecisionTimeHours} jam` : "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
