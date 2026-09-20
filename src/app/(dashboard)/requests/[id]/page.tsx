import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { RequestService } from "@/services/request.service";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitDraftButton } from "@/components/requests/submit-draft-button";
import { ApprovalDecisionPanel } from "@/components/approvals/approval-decision-panel";
import { RequestLifecycleActions } from "@/components/requests/request-lifecycle-actions";
import { hasPermission } from "@/lib/auth/permissions";
import {
  ArrowLeft,
  Edit3,
  Calendar,
  User,
  Building2,
  Workflow,
  History,
  Info,
  Clock,
  ShoppingBag,
  KeyRound,
  Wrench,
  Plane,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Play,
} from "lucide-react";
import { UserRole } from "@prisma/client";
import {
  ACTIVITY_ACTION_LABELS,
  formatIndonesianActivityDetail,
  formatRoleIndonesian,
} from "@/lib/constants/presentation";

interface RequestDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  const request = await RequestService.getRequestById(user.organizationId, id);

  if (!request) {
    notFound();
  }

  // IDOR check: Employees can only view their own requests
  if (user.role === UserRole.EMPLOYEE && request.requesterId !== user.id) {
    notFound();
  }

  const isOwner = request.requesterId === user.id;
  const isDraft = request.status === "DRAFT";
  const canManage = hasPermission(user.role, "request:manage");
  const typeCode = (request.requestType.code || "").toUpperCase();
  const metadata = (request.metadata as Record<string, unknown>) || {};

  // Active pending approval for CURRENT cycle & Approver eligibility
  const activePendingApproval = request.approvals.find(
    (a) =>
      a.status === "PENDING" &&
      a.stepOrder === request.currentStepOrder &&
      a.cycle === request.currentCycle
  );

  const isEligibleApprover = Boolean(
    request.status === "IN_REVIEW" &&
      activePendingApproval &&
      activePendingApproval.approvalStep?.roleRequired === user.role &&
      user.organizationId === request.organizationId
  );

  const latestRevisionApproval = [...request.approvals]
    .reverse()
    .find((a) => a.status === "REVISION_REQUESTED");

  const getTypeIcon = (code: string) => {
    switch (code) {
      case "REQ-PUR":
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case "REQ-IT":
        return <KeyRound className="w-4 h-4 text-indigo-600" />;
      case "REQ-MNT":
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case "REQ-TRV":
        return <Plane className="w-4 h-4 text-blue-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Permintaan Saya
        </Link>

        <div className="flex items-center gap-2">
          {isOwner && isDraft && (
            <>
              <Link href={`/requests/${request.id}/edit`}>
                <Button variant="outline" size="sm" className="text-xs">
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Ubah Draf
                </Button>
              </Link>
              <SubmitDraftButton requestId={request.id} />
            </>
          )}

          <RequestLifecycleActions
            requestId={request.id}
            status={request.status}
            isOwner={isOwner}
            canManage={canManage}
          />
        </div>
      </div>

      {/* Main Request Header Banner */}
      <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-slate-500 dark:text-slate-400">
            #{request.id.slice(-8).toUpperCase()}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
            {getTypeIcon(typeCode)}
            {request.requestType.name}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <PriorityBadge priority={request.priority} />
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <StatusBadge status={request.status} />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {request.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Diajukan oleh <strong className="font-medium text-slate-800 dark:text-slate-200">{request.requester.name}</strong>
            </span>
          </div>
          {request.department && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{request.department.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Dibuat {new Date(request.createdAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Lifecycle Status Notice */}
      {request.status === "IN_REVIEW" && (
        <div className="p-3.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Alur Persetujuan Berjalan (Siklus #{request.currentCycle}):</span> Permintaan ini sedang menunggu persetujuan Tahap {request.currentStepOrder}
            {activePendingApproval?.approvalStep && ` (${activePendingApproval.approvalStep.title} — ${activePendingApproval.approvalStep.roleRequired})`}.
          </div>
        </div>
      )}

      {request.status === "APPROVED" && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-200 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Permintaan Disetujui:</span> Seluruh tahapan persetujuan telah disetujui. Permintaan siap diproses oleh tim operasional.
          </div>
        </div>
      )}

      {request.status === "PROCESSING" && (
        <div className="p-3.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-200 text-xs flex items-start gap-2.5">
          <Play className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5 fill-current" />
          <div>
            <span className="font-semibold">Sedang Diproses:</span> Permintaan telah disetujui sepenuhnya dan saat ini sedang dalam proses pemenuhan operasional.
          </div>
        </div>
      )}

      {request.status === "COMPLETED" && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-200 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Permintaan Selesai:</span> Seluruh pemenuhan operasional telah selesai dilaksanakan dan diarsipkan.
          </div>
        </div>
      )}

      {request.status === "REJECTED" && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-200 text-xs flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Permintaan Ditolak:</span> Permintaan ini ditolak selama proses peninjauan persetujuan dan alur kerja ditutup.
          </div>
        </div>
      )}

      {request.status === "CANCELLED" && (
        <div className="p-3.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300 text-xs flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Permintaan Dibatalkan:</span> Permintaan ini telah dibatalkan dan statusnya ditutup secara permanen.
          </div>
        </div>
      )}

      {request.status === "REVISION_REQUIRED" && (
        <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200 text-xs space-y-2">
          <div className="flex items-start gap-2.5">
            <RotateCcw className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Perlu Revisi (Siklus #{request.currentCycle}):</span> Penyetuju meminta penyesuaian spesifikasi sebelum alur dapat dilanjutkan.
            </div>
          </div>
          {latestRevisionApproval?.comment && (
            <div className="ml-6 p-2 rounded bg-amber-100/60 dark:bg-amber-900/30 border border-amber-300/50 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-100">
              <strong>Catatan Revisi dari {latestRevisionApproval.approver?.name || "Penyetuju"} ({latestRevisionApproval.approver?.role || "Penyetuju"}):</strong> &ldquo;{latestRevisionApproval.comment}&rdquo;
            </div>
          )}
        </div>
      )}

      {request.status === "DRAFT" && (
        <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Status Draf:</span> Permintaan ini tersimpan sebagai draf dan belum diajukan ke alur persetujuan. Klik <strong>Ajukan Permintaan</strong> jika rincian sudah lengkap.
          </div>
        </div>
      )}

      {/* Interactive Approval Decision Panel for Eligible Approvers */}
      {isEligibleApprover && activePendingApproval && (
        <ApprovalDecisionPanel
          requestId={request.id}
          approvalId={activePendingApproval.id}
          stepOrder={activePendingApproval.stepOrder}
          stepTitle={activePendingApproval.approvalStep?.title || `Tahap ${activePendingApproval.stepOrder}`}
          roleRequired={activePendingApproval.approvalStep?.roleRequired || user.role}
        />
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Request Details & Structured Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Description Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Deskripsi Permintaan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {request.description || "Tidak ada deskripsi tambahan yang disertakan."}
              </p>
            </CardContent>
          </Card>

          {/* Type-Specific Structured Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {getTypeIcon(typeCode)}
                <CardTitle className="text-sm font-semibold">
                  Spesifikasi {request.requestType.name}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Atribut terstruktur terverifikasi untuk alur {request.requestType.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {typeCode === "REQ-PUR" && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Barang / Aset</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.item || "—")}
                    </dd>
                  </div>
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Jumlah Unit</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.quantity ?? "—")} unit
                    </dd>
                  </div>
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Estimasi Total Biaya</dt>
                    <dd className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 text-xs sm:text-sm">
                      Rp {Number(metadata.estimatedCost || 0).toLocaleString("id-ID")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Justifikasi Kebutuhan</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-1.5 text-xs whitespace-pre-wrap leading-relaxed">
                      {String(metadata.justification || "—")}
                    </dd>
                  </div>
                </dl>
              )}

              {typeCode === "REQ-IT" && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Sistem / Aplikasi Target</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.system || "—")}
                    </dd>
                  </div>
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Tingkat Akses</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.accessLevel || "—")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Justifikasi Kebutuhan Akses</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-1.5 text-xs whitespace-pre-wrap leading-relaxed">
                      {String(metadata.justification || "—")}
                    </dd>
                  </div>
                </dl>
              )}

              {typeCode === "REQ-MNT" && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Lokasi / Ruangan</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.location || "—")}
                    </dd>
                  </div>
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Tingkat Urgensi</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {metadata.urgency === "LOW"
                        ? "Rendah (Perbaikan Minor)"
                        : metadata.urgency === "MEDIUM"
                        ? "Sedang (Fasilitas Standar)"
                        : metadata.urgency === "HIGH"
                        ? "Tinggi (Operasional Terganggu)"
                        : metadata.urgency === "CRITICAL"
                        ? "Kritis (Darurat / Berbahaya)"
                        : String(metadata.urgency || "—")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Ringkasan Kendala</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.issue || "—")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Deskripsi Detail Masalah</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-1.5 text-xs whitespace-pre-wrap leading-relaxed">
                      {String(metadata.issueDetails || "—")}
                    </dd>
                  </div>
                </dl>
              )}

              {typeCode === "REQ-TRV" && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2 p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Kota / Lokasi Tujuan</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.destination || "—")}
                    </dd>
                  </div>
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Tanggal Keberangkatan</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.travelDate || "—")}
                    </dd>
                  </div>
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Tanggal Kepulangan</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.returnDate || "—")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Maksud Perjalanan &amp; Target Hasil</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-1.5 text-xs whitespace-pre-wrap leading-relaxed">
                      {String(metadata.purpose || "—")}
                    </dd>
                  </div>
                </dl>
              )}

              {typeCode === "REQ-GEN" && (
                <dl className="grid grid-cols-1 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Kategori</dt>
                    <dd className="font-bold text-slate-900 dark:text-slate-100 mt-1 text-xs sm:text-sm">
                      {String(metadata.category || "Umum")}
                    </dd>
                  </div>
                  <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    <dt className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Detail Operasional</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-1.5 text-xs whitespace-pre-wrap leading-relaxed">
                      {String(metadata.details || "—")}
                    </dd>
                  </div>
                </dl>
              )}

              {!["REQ-PUR", "REQ-IT", "REQ-MNT", "REQ-TRV", "REQ-GEN"].includes(typeCode) && (
                <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-lg border border-slate-200 dark:border-slate-700/80 font-mono text-[11px]">
                  <pre className="overflow-x-auto">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Audit Timeline & Sequential Workflow Steps */}
        <div className="space-y-6">
          {/* Sequential Workflow Routing Steps with Multi-Cycle Live Database Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-blue-600" />
                  Jalur Alur Persetujuan
                </CardTitle>
                <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Siklus #{request.currentCycle}
                </span>
              </div>
              <CardDescription className="text-xs">
                Tahapan persetujuan berurutan yang dikonfigurasi untuk tipe permintaan ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CURRENT APPROVAL CYCLE */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Siklus Persetujuan Saat Ini ({request.currentCycle === 1 ? "Putaran 1" : `Putaran ${request.currentCycle}`})
                </h4>
                <ol className="relative border-l border-slate-200 dark:border-slate-800 ml-2 space-y-4 text-xs">
                  {request.requestType.approvalSteps.map((step) => {
                    const approval = request.approvals.find(
                      (a) => a.cycle === request.currentCycle && a.stepOrder === step.stepOrder
                    );
                    const isCurrent =
                      request.status === "IN_REVIEW" && step.stepOrder === request.currentStepOrder;
                    const isApproved = approval?.status === "APPROVED";
                    const isRejected = approval?.status === "REJECTED";
                    const isRevision = approval?.status === "REVISION_REQUESTED";
                    const isPending = approval?.status === "PENDING";

                    return (
                      <li key={`current-${step.id}`} className="ml-4">
                        {isApproved && (
                          <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-emerald-600 flex items-center justify-center text-white" />
                        )}
                        {isRejected && (
                          <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-rose-600 flex items-center justify-center text-white" />
                        )}
                        {isRevision && (
                          <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center text-white" />
                        )}
                        {isCurrent && isPending && (
                          <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 bg-blue-600 animate-pulse" />
                        )}
                        {!approval && (
                          <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950" />
                        )}

                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`font-semibold ${
                              isApproved
                                ? "text-emerald-700 dark:text-emerald-400"
                                : isRejected
                                ? "text-rose-700 dark:text-rose-400"
                                : isRevision
                                ? "text-amber-700 dark:text-amber-400"
                                : isCurrent
                                ? "text-blue-700 dark:text-blue-400 font-bold"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            Tahap {step.stepOrder}: {step.title}
                          </span>
                          {isApproved && (
                            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              Disetujui
                            </span>
                          )}
                          {isRejected && (
                            <span className="text-[10px] font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                              Ditolak
                            </span>
                          )}
                          {isRevision && (
                            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Perlu Revisi
                            </span>
                          )}
                          {isCurrent && isPending && (
                            <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              Tahap Aktif
                            </span>
                          )}
                          {!approval && (
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Belum Dimulai
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Wajib: <span className="font-mono font-medium">{formatRoleIndonesian(step.roleRequired)}</span>
                          {step.isFinal && " • Penyetuju Akhir"}
                        </div>

                        {approval?.approver && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                            Diputuskan oleh: <strong>{approval.approver.name}</strong> ({formatRoleIndonesian(approval.approver.role)})
                            {approval.decidedAt && (
                              <span className="text-[10px] text-slate-400 ml-1">
                                pada {new Date(approval.decidedAt).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        )}

                        {approval?.comment && (
                          <div className="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 italic">
                            &ldquo;{approval.comment}&rdquo;
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* HISTORICAL APPROVAL CYCLES (IF ANY) */}
              {request.currentCycle > 1 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Riwayat Siklus Persetujuan
                  </h4>
                  {Array.from({ length: request.currentCycle - 1 }, (_, i) => request.currentCycle - 1 - i).map((cycleNum) => {
                    const cycleApprovals = request.approvals.filter((a) => a.cycle === cycleNum);
                    if (cycleApprovals.length === 0) return null;

                    return (
                      <div
                        key={`history-cycle-${cycleNum}`}
                        className="p-3 rounded-md bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                      >
                        <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Siklus Persetujuan #{cycleNum}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            Siklus Diarsipkan
                          </span>
                        </div>
                        <div className="space-y-2 pt-1">
                          {cycleApprovals.map((ha) => (
                            <div
                              key={ha.id}
                              className="pl-2 border-l-2 border-slate-300 dark:border-slate-700 space-y-0.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  Tahap {ha.stepOrder}: {ha.approvalStep?.title || `Tahap ${ha.stepOrder}`}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1 rounded ${
                                    ha.status === "APPROVED"
                                      ? "text-emerald-700 bg-emerald-100/60 dark:text-emerald-300"
                                      : ha.status === "REVISION_REQUESTED"
                                      ? "text-amber-700 bg-amber-100/60 dark:text-amber-300"
                                      : "text-rose-700 bg-rose-100/60 dark:text-rose-300"
                                  }`}
                                >
                                  {ha.status === "APPROVED" ? "Disetujui" : ha.status === "REVISION_REQUESTED" ? "Perlu Revisi" : "Ditolak"}
                                </span>
                              </div>
                              {ha.approver && (
                                <div className="text-[10px] text-slate-500">
                                  Diputuskan oleh {ha.approver.name} ({formatRoleIndonesian(ha.approver.role)})
                                  {ha.decidedAt && ` pada ${new Date(ha.decidedAt).toLocaleDateString("id-ID")}`}
                                </div>
                              )}
                              {ha.comment && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                  &ldquo;{ha.comment}&rdquo;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity & Audit Trail */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Jejak Audit Aktivitas
              </CardTitle>
              <CardDescription className="text-xs">
                Catatan peristiwa tidak dapat diubah untuk alur permintaan ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {request.activityLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Belum ada catatan aktivitas.</p>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-slate-800 ml-2 space-y-4 text-xs">
                  {request.activityLogs.map((log) => (
                    <div key={log.id} className="ml-4">
                      <div className="absolute -left-1 mt-1 w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ACTIVITY_ACTION_LABELS[log.action] || log.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {formatIndonesianActivityDetail(log.details)}
                      </p>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Oleh {log.actor?.name || "Sistem"} ({formatRoleIndonesian(log.actor?.role)})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
