import React from "react";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { ApprovalService } from "@/services/approval.service";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  User,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { UserRole } from "@prisma/client";

interface ApprovalsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const user = await requireAuthenticatedUser();
  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const search = resolvedParams.search || "";

  const result = await ApprovalService.getPendingApprovalsForUser({
    actor: user,
    page,
    limit: 10,
    search,
  });

  const { approvals, totalCount, totalPages, currentPage, limit } = result;

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endIndex = Math.min(currentPage * limit, totalCount);

  const buildPageUrl = (newPage: number) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    p.set("page", newPage.toString());
    return `/approvals?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Kotak Masuk Persetujuan
            </h2>
            <Badge variant="default" className="text-[11px] font-mono">
              {user.role}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar permintaan internal yang membutuhkan persetujuan dari peran Anda untuk melanjutkan alur kerja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={totalCount > 0 ? "warning" : "success"}>
            {totalCount} Perlu Ditinjau
          </Badge>
        </div>
      </div>

      {/* Search Bar */}
      <form method="GET" action="/approvals" className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Cari berdasarkan judul permintaan atau nama pengaju..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <Button type="submit" size="sm" className="text-xs h-9 px-3">
          Cari
        </Button>
        {search && (
          <Link href="/approvals">
            <Button variant="outline" size="sm" className="text-xs h-9 px-3">
              Hapus
            </Button>
          </Link>
        )}
      </form>

      {/* Approvals Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Antrean Peninjauan Aktif
              </CardTitle>
              <CardDescription className="text-xs">
                Hanya permintaan yang sedang menunggu keputusan peran {user.role} pada tahap alur kerja saat ini yang ditampilkan.
              </CardDescription>
            </div>
            {totalCount > 0 && (
              <Badge variant="neutral">
                Halaman {currentPage} dari {totalPages}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {approvals.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {user.role === UserRole.EMPLOYEE
                  ? "Tidak Ada Tanggung Jawab Persetujuan"
                  : search
                  ? "Tidak Ada Permintaan yang Cocok"
                  : "Semua Peninjauan Selesai"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {user.role === UserRole.EMPLOYEE
                  ? "Akun karyawan tidak memiliki wewenang persetujuan pada alur kerja operasional. Saat Anda mengajukan permintaan, peninjau akan memprosesnya di sini."
                  : search
                  ? "Tidak ada persetujuan tertunda yang cocok dengan kriteria pencarian Anda. Silakan atur ulang filter pencarian."
                  : "Saat ini tidak ada permintaan yang menunggu tindakan persetujuan dari Anda. Semua tahapan alur kerja telah diselesaikan."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-medium">
                    <th className="py-3 px-4">Referensi</th>
                    <th className="py-3 px-4">Judul Permintaan</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Pengaju</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4">Tahap Saat Ini</th>
                    <th className="py-3 px-4">Menunggu Sejak</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {approvals.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        #{item.request.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/requests/${item.request.id}`}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
                        >
                          {item.request.title}
                        </Link>
                        {item.request.department && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {item.request.department.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium">{item.request.requestType.name}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.request.requester.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={item.request.priority} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded text-[11px] border border-blue-200 dark:border-blue-900/50">
                          Tahap {item.stepOrder}: {item.approvalStep?.title || item.stepOrder}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(item.createdAt).toLocaleDateString("id-ID", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link href={`/requests/${item.request.id}`}>
                          <Button size="sm" className="text-xs h-7 px-2.5">
                            <Eye className="w-3 h-3" />
                            Tinjau &amp; Putuskan
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Menampilkan <span className="font-medium text-slate-800 dark:text-slate-200">{startIndex}</span> sampai{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">{endIndex}</span> dari{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">{totalCount}</span> permintaan menunggu
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className={`p-1.5 rounded-md border border-slate-200 dark:border-slate-800 ${
                    currentPage <= 1
                      ? "pointer-events-none opacity-40 text-slate-300 dark:text-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                  aria-disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Link>
                <span className="px-2 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Link
                  href={buildPageUrl(currentPage + 1)}
                  className={`p-1.5 rounded-md border border-slate-200 dark:border-slate-800 ${
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-40 text-slate-300 dark:text-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                  aria-disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
