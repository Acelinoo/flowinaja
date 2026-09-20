import React from "react";
import Link from "next/link";
import { Plus, FileText, ChevronLeft, ChevronRight, Eye, Edit3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { RequestFilters } from "@/components/requests/request-filters";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { RequestService } from "@/services/request.service";
import { RequestStatus, RequestPriority } from "@prisma/client";

interface MyRequestsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    priority?: string;
    page?: string;
  }>;
}

export default async function MyRequestsPage({ searchParams }: MyRequestsPageProps) {
  const user = await requireAuthenticatedUser();
  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || "1", 10) || 1;
  const search = resolvedParams.search || "";
  const status = resolvedParams.status as RequestStatus | undefined;
  const requestTypeId = resolvedParams.type || undefined;
  const priority = resolvedParams.priority as RequestPriority | undefined;

  const [requestTypes, result] = await Promise.all([
    RequestService.getRequestTypes(user.organizationId),
    RequestService.listMyRequests({
      organizationId: user.organizationId,
      requesterId: user.id,
      search,
      status: status && Object.values(RequestStatus).includes(status) ? status : undefined,
      requestTypeId,
      priority: priority && Object.values(RequestPriority).includes(priority) ? priority : undefined,
      page,
      limit: 10,
    }),
  ]);

  const { requests, totalCount, totalPages, currentPage, limit } = result;

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endIndex = Math.min(currentPage * limit, totalCount);

  // Helper to build pagination URLs preserving active query filters
  const buildPageUrl = (newPage: number) => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    if (requestTypeId) p.set("type", requestTypeId);
    if (priority) p.set("priority", priority);
    p.set("page", newPage.toString());
    return `/requests?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Permintaan Saya
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Buat, lacak, dan kelola seluruh permintaan alur kerja operasional pribadi Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/requests/new">
            <Button size="sm" className="text-xs">
              <Plus className="w-3.5 h-3.5" />
              Buat Permintaan
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <RequestFilters
        requestTypes={requestTypes.map((t) => ({ id: t.id, name: t.name }))}
      />

      {/* Requests Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Riwayat Permintaan</CardTitle>
              <CardDescription className="text-xs">
                Total {totalCount} permintaan tercatat dalam organisasi
              </CardDescription>
            </div>
            <Badge variant="neutral">
              Halaman {currentPage} dari {totalPages}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tidak Ada Permintaan Ditemukan
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                {search || status || requestTypeId || priority
                  ? "Tidak ada permintaan yang sesuai dengan kriteria filter yang dipilih. Silakan ubah atau hapus filter pencarian."
                  : "Anda belum mengajukan permintaan operasional apa pun. Mulai dengan membuat draf permintaan pertama Anda."}
              </p>
              {!search && !status && !requestTypeId && !priority && (
                <Link href="/requests/new">
                  <Button size="sm" className="text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Buat Permintaan Pertama Anda
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-medium">
                    <th className="py-3 px-4">Referensi</th>
                    <th className="py-3 px-4">Judul Permintaan</th>
                    <th className="py-3 px-4">Tipe</th>
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
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {req.department.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium">{req.requestType.name}</span>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/requests/${req.id}`}
                            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                            title="Lihat Detail Permintaan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {req.status === "DRAFT" && (
                            <Link
                              href={`/requests/${req.id}/edit`}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                              title="Ubah Draf Permintaan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
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
                <span className="font-medium text-slate-800 dark:text-slate-200">{totalCount}</span> data
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
