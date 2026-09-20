import React from "react";
import { Building, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export default async function SystemSettingsPage() {
  const user = await requireRole(UserRole.ADMIN);

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: {
      _count: {
        select: {
          users: true,
          departments: true,
          requestTypes: true,
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
              Pengaturan Organisasi
            </h2>
            <Badge variant="destructive">Khusus Admin</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Konfigurasi tenant, parameter isolasi multi-tenant, dan kebijakan tata kelola sistem.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold">Identitas Organisasi (Tenant)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Seluruh data operasional diisolasi secara ketat berdasarkan Organization ID ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nama Organisasi
                </label>
                <input
                  type="text"
                  defaultValue={org?.name || "Organisasi Flowinaja"}
                  disabled
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Slug Tenant
                </label>
                <input
                  type="text"
                  defaultValue={org?.slug || "flowinaja-org"}
                  disabled
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {org?._count.users || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Pengguna</div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {org?._count.departments || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Departemen</div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {org?._count.requestTypes || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Tipe Alur Kerja</div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {org?._count.requests || 0}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Permintaan</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold">Kebijakan Keamanan &amp; Akses</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Aturan penegakan tingkat platform untuk isolasi data dan integritas keputusan alur kerja.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Isolasi Ketat Multi-Tenant
                </span>
                <span className="text-[11px] text-slate-500">
                  Validasi organizationId wajib diterapkan pada seluruh kueri lapisan service dan API.
                </span>
              </div>
              <Badge variant="success">Aktif</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Jejak Keputusan Permanen (Immutable History)
                </span>
                <span className="text-[11px] text-slate-500">
                  Mencegah perubahan atau penimpaan pada rekam keputusan persetujuan yang telah dibuat.
                </span>
              </div>
              <Badge variant="success">Aktif</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Kontrol Akses Berbasis Peran Sisi Server (Server-Side RBAC)
                </span>
                <span className="text-[11px] text-slate-500">
                  Penegakan izin dan validasi hak akses dieksekusi secara ketat di sisi server.
                </span>
              </div>
              <Badge variant="success">Aktif</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
