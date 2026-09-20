import React from "react";
import Link from "next/link";
import { History, Shield, Clock, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import {
  ACTIVITY_ACTION_LABELS,
  formatDateIndonesian,
  formatIndonesianActivityDetail,
  formatRoleIndonesian,
} from "@/lib/constants/presentation";

export default async function SystemActivityPage() {
  const user = await requireRole(UserRole.ADMIN);

  const logs = await prisma.activityLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      actor: { select: { name: true, role: true } },
      request: { select: { id: true, title: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Log Aktivitas Sistem
            </h2>
            <Badge variant="neutral">Jejak Audit</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Catatan audit permanen seluruh transisi status, keputusan persetujuan, dan mutasi alur kerja organisasi.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Peristiwa Audit Terkini
              </CardTitle>
              <CardDescription className="text-xs">
                Menampilkan 40 riwayat aktivitas operasional terbaru yang tercatat di database
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tahan Manipulasi</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Belum Ada Aktivitas Tercatat
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Ketika pengguna membuat permintaan dan penyetuju mengambil keputusan, catatan peristiwa audit akan terekam secara otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => {
                const actionLabel = ACTIVITY_ACTION_LABELS[log.action] || log.action.replace(/_/g, " ");
                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {actionLabel}
                        </span>
                        {log.request && (
                          <Link
                            href={`/requests/${log.request.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            {log.request.title}
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {formatIndonesianActivityDetail(log.details)}
                      </p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                        <span>Oleh {log.actor?.name || "Sistem"} ({formatRoleIndonesian(log.actor?.role)})</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateIndonesian(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
