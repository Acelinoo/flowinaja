import React from "react";
import { Building2, Users, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function ManagementDepartmentsPage() {
  const user = await requireRole(UserRole.ADMIN);

  const departments = await prisma.department.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          requests: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Departemen &amp; Unit Kerja
            </h2>
            <Badge variant="default">Struktur Organisasi</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unit operasional yang digunakan untuk penugasan pengguna dan pembagian wewenang persetujuan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">{dept.name}</CardTitle>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {dept.code}
                </span>
              </div>
              <CardDescription className="text-xs mt-1">
                Kode Identifikasi Departemen: {dept.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{dept._count.users} Anggota Terdaftar</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{dept._count.requests} Permintaan</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
