import React from "react";
import Link from "next/link";
import { FolderKanban, Search, ChevronLeft, ChevronRight, Eye, Building2, User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { UserRole, Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

interface ManagementRequestsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function ManagementRequestsPage({ searchParams }: ManagementRequestsPageProps) {
  const user = await requireRole(UserRole.ADMIN);
  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const search = (resolvedParams.search || "").trim();
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: Prisma.RequestWhereInput = {
    organizationId: user.organizationId,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { requester: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [requests, totalCount] = await Promise.all([
    prisma.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        requester: { select: { name: true, email: true, role: true } },
        requestType: { select: { name: true, code: true } },
        department: { select: { name: true, code: true } },
      },
    }),
    prisma.request.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIndex = totalCount === 0 ? 0 : skip + 1;
  const endIndex = Math.min(skip + limit, totalCount);

  const buildPageUrl = (newPage: number) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    p.set("page", newPage.toString());
    return `/management/requests?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Semua Permintaan Organisasi
            </h2>
            <Badge variant="destructive">Khusus Admin</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pengawasan komprehensif seluruh permintaan operasional lintas departemen dalam organisasi.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form method="GET" action="/management/requests" className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Cari judul permintaan atau nama pengaju..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <Button type="submit" size="sm" className="text-xs h-9 px-3">
          Cari
        </Button>
        {search && (
          <Link href="/management/requests">
            <Button variant="outline" size="sm" className="text-xs h-9 px-3">
              Hapus
            </Button>
          </Link>
        )}
      </form>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-600" />
                Daftar Seluruh Permintaan
              </CardTitle>
              <CardDescription className="text-xs">
                Total {totalCount} permintaan tercatat di seluruh departemen
              </CardDescription>
            </div>
            {totalCount > 0 && (
              <Badge variant="neutral">
                Halaman {page} dari {totalPages}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tidak Ada Permintaan Ditemukan
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {search
                  ? "Tidak ada data permintaan yang sesuai dengan kriteria pencarian."
                  : "Belum ada permintaan yang diajukan oleh pengguna dalam organisasi ini."}
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
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tanggal Pengajuan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        #{req.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/requests/${req.id}`}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
                        >
                          {req.title}
                        </Link>
                        {req.department && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {req.department.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium">{req.requestType.name}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.requester.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(req.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link href={`/requests/${req.id}`}>
                          <Button size="sm" className="text-xs h-7 px-2.5">
                            <Eye className="w-3 h-3" />
                            Lihat Detail
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
                <span className="font-medium text-slate-800 dark:text-slate-200">{totalCount}</span> permintaan
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={buildPageUrl(page - 1)}
                  className={`p-1.5 rounded-md border border-slate-200 dark:border-slate-800 ${
                    page <= 1
                      ? "pointer-events-none opacity-40 text-slate-300 dark:text-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                  aria-disabled={page <= 1}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Link>
                <span className="px-2 font-medium">
                  {page} / {totalPages}
                </span>
                <Link
                  href={buildPageUrl(page + 1)}
                  className={`p-1.5 rounded-md border border-slate-200 dark:border-slate-800 ${
                    page >= totalPages
                      ? "pointer-events-none opacity-40 text-slate-300 dark:text-slate-700"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                  aria-disabled={page >= totalPages}
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
