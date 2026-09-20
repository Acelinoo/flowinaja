import React from "react";
import { ShieldCheck, UserCheck, Mail, Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

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
    label: "Supervisor",
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

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      department: true,
    },
  });

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
            Daftar pengguna terdaftar dan tingkatan kontrol akses berbasis peran (RBAC) sisi server.
          </p>
        </div>
      </div>

      {/* Users List Table */}
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
            Anggota organisasi yang memiliki akses ke sistem alur kerja Flowinaja.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4">Nama Lengkap</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Tanggal Bergabung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {u.department ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{u.department.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Lintas Departemen</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Tiers Explanation */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Tingkatan Peran &amp; Hak Akses Server-Side (RBAC)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLE_TIERS.map((tier, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold">{tier.label}</CardTitle>
                  </div>
                  <Badge variant={tier.variant}>{tier.role}</Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  {tier.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Hak Izin Diberikan:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tier.permissions.map((p, pIdx) => (
                      <span
                        key={pIdx}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
