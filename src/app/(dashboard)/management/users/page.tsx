import React from "react";
import { ShieldCheck, UserCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { UserManagementTable } from "@/components/management/user-management-table";

const ROLE_TIERS = [
  {
    role: "EMPLOYEE",
    label: "Karyawan (Employee)",
    variant: "neutral" as const,
    summary: "Pengaju standar. Dapat membuat, menyimpan draf, mengajukan, dan melacak status permintaan pribadi.",
    permissions: ["request:create", "request:view", "requestType:view", "department:view"],
  },
  {
    role: "SUPERVISOR",
    label: "Supervisor (Penyelia)",
    variant: "default" as const,
    summary: "Penyetuju tingkat pertama. Meninjau, menyetujui, menolak, atau meminta revisi pengajuan tingkat departemen.",
    permissions: ["request:create", "request:view", "request:approve", "department:view", "activity:view"],
  },
  {
    role: "MANAGER",
    label: "Manajer (Manager)",
    variant: "warning" as const,
    summary: "Kepala divisi operasional. Mengelola anggaran, eskalasi persetujuan, dan pemrosesan pemenuhan permintaan.",
    permissions: ["request:create", "request:view", "request:approve", "request:manage", "user:view"],
  },
  {
    role: "ADMIN",
    label: "Administrator Sistem (Admin)",
    variant: "destructive" as const,
    summary: "Administrator organisasi. Tata kelola penuh, audit sistem, konfigurasi alur kerja, dan visibilitas lintas organisasi.",
    permissions: ["* Akses Penuh Sisi Server"],
  },
];

export default async function ManagementUsersPage() {
  const user = await requireRole(UserRole.ADMIN);

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
      },
    }),
    prisma.department.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Pengguna &amp; Hak Akses
            </h2>
            <Badge variant="destructive">Tata Kelola RBAC</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar pengguna terdaftar dan tingkatan kontrol akses berbasis peran (RBAC) sisi server. Ubah peran atau departemen secara langsung.
          </p>
        </div>
      </div>

      {/* Users List Interactive Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold">Pengguna Terdaftar</CardTitle>
            </div>
            <Badge variant="neutral">{users.length} Total Akun</Badge>
          </div>
          <CardDescription className="text-xs">
            Anggota organisasi yang memiliki akses ke sistem alur kerja Flowinaja. Anda dapat mengubah jabatan / peran dan departemen pengguna secara langsung.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable
            initialUsers={users}
            departments={departments}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>

      {/* Role Tiers Explanation */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Tingkatan Peran &amp; Hak Akses Server-Side (RBAC)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLE_TIERS.map((tier) => (
            <Card key={tier.role} className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {tier.label}
                  </CardTitle>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                    {tier.role}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {tier.summary}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                    Hak Izin Diberikan:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tier.permissions.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
