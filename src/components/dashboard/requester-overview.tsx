import React from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  RotateCcw,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { formatDateIndonesian, formatNumberIndonesian } from "@/lib/constants/presentation";

interface RequesterOverviewProps {
  summary: {
    total: number;
    draft: number;
    inReview: number;
    revisionRequired: number;
    processing: number;
    completed: number;
    rejected: number;
    cancelled: number;
  };
  recentRequests: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: Date;
    requestType: { id: string; name: string; code: string | null };
    department: { id: string; name: string; code: string | null } | null;
  }>;
}

export function RequesterOverview({ summary, recentRequests }: RequesterOverviewProps) {
  const cards = [
    {
      title: "Total Permintaan",
      value: summary.total,
      description: "Seluruh draf dan pengajuan",
      icon: FileText,
      color: "text-slate-700 dark:text-slate-200",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      title: "Menunggu Persetujuan",
      value: summary.inReview,
      description: "Dalam antrean verifikasi alur",
      icon: Clock,
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/60",
    },
    {
      title: "Memerlukan Revisi",
      value: summary.revisionRequired,
      description: "Perlu perbaikan spesifikasi",
      icon: RotateCcw,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/60",
    },
    {
      title: "Sedang Diproses",
      value: summary.processing,
      description: "Disetujui & sedang dipenuhi",
      icon: PlayCircle,
      color: "text-purple-700 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/60",
    },
    {
      title: "Selesai",
      value: summary.completed,
      description: "Telah tuntas dan difinalisasi",
      icon: CheckCircle2,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
    },
    {
      title: "Ditolak & Dibatalkan",
      value: summary.rejected + summary.cancelled,
      description: `${summary.rejected} ditolak, ${summary.cancelled} dibatalkan`,
      icon: XCircle,
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/60",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="shadow-2xs">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {c.title}
                  </span>
                  <div className={`p-1 rounded ${c.bg} ${c.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatNumberIndonesian(c.value)}
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                  {c.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Requests Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">Permintaan Terakhir Anda</CardTitle>
            <CardDescription className="text-xs">
              5 pengajuan terbaru yang membutuhkan pemantauan berkala
            </CardDescription>
          </div>
          <Link href="/requests">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
              <span>Semua Permintaan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentRequests.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Belum ada permintaan yang diajukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Judul Permintaan</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Departemen</th>
                    <th className="py-2.5 px-3">Prioritas</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Tanggal Dibuat</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        <Link
                          href={`/requests/${req.id}`}
                          className="hover:underline hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {req.title}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {req.requestType.name}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {req.department?.name || "-"}
                      </td>
                      <td className="py-3 px-3">
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {formatDateIndonesian(req.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/requests/${req.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
