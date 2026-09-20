import React from "react";
import { ArrowRight, Workflow } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/constants/presentation";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function ManagementRequestTypesPage() {
  const user = await requireRole(UserRole.ADMIN);

  const requestTypes = await prisma.requestType.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    include: {
      approvalSteps: {
        orderBy: { stepOrder: "asc" },
      },
      _count: {
        select: { requests: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tipe Permintaan &amp; Alur Kerja
            </h2>
            <Badge variant="default">Terkonfigurasi</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kategori alur kerja operasional dan tahapan persetujuan berurutan yang aktif dalam organisasi.
          </p>
        </div>
      </div>

      {/* Grid of Request Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requestTypes.map((rt) => (
          <Card key={rt.id} className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{rt.name}</CardTitle>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {rt.code || "UMUM"}
                    </span>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {rt.description || "Alur kerja standar organisasi."}
                  </CardDescription>
                </div>
                <Badge variant={rt.isActive ? "success" : "neutral"}>
                  {rt.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Tahapan Persetujuan Berurutan:
                </span>
                {rt.approvalSteps.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada tahapan persetujuan yang dikonfigurasi.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {rt.approvalSteps.map((step, sIdx) => (
                      <React.Fragment key={step.id}>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {step.stepOrder}. {step.title} ({ROLE_LABELS[step.roleRequired] || step.roleRequired})
                        </span>
                        {sIdx < rt.approvalSteps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Workflow className="w-3 h-3" />
                  {rt.approvalSteps.length} Tahap Evaluasi
                </span>
                <span>{rt._count.requests} Total Permintaan Terkait</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
