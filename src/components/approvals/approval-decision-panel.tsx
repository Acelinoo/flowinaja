"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { decideApprovalAction } from "@/actions/approval.actions";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

interface ApprovalDecisionPanelProps {
  requestId: string;
  approvalId: string;
  stepOrder: number;
  stepTitle: string;
  roleRequired: string;
}

export function ApprovalDecisionPanel({
  requestId,
  approvalId,
  stepOrder,
  stepTitle,
  roleRequired,
}: ApprovalDecisionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<
    "APPROVE" | "REJECT" | "REQUEST_REVISION" | null
  >(null);

  const handleDecision = (decision: "APPROVE" | "REJECT" | "REQUEST_REVISION") => {
    setError(null);

    // Validate reason requirement for destructive actions
    if ((decision === "REJECT" || decision === "REQUEST_REVISION") && comment.trim().length < 5) {
      setError("Mohon berikan alasan (minimal 5 karakter) pada kolom catatan di atas.");
      return;
    }

    const formData = new FormData();
    formData.append("requestId", requestId);
    formData.append("approvalId", approvalId);
    formData.append("decision", decision);
    formData.append("comment", comment.trim());

    startTransition(async () => {
      const res = await decideApprovalAction(null, formData);
      if (!res.success) {
        setError(res.error || "Gagal mencatat keputusan persetujuan");
        setConfirmingAction(null);
      } else {
        setConfirmingAction(null);
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tindakan Persetujuan Diperlukan
            </CardTitle>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 font-medium">
            Tahap {stepOrder}: {roleRequired}
          </span>
        </div>
        <CardDescription className="text-xs text-slate-600 dark:text-slate-300">
          Anda memiliki hak untuk memberikan keputusan pada <strong>{stepTitle}</strong>. Rekam keputusan Anda di bawah ini.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Keputusan gagal:</span> {error}
            </div>
          </div>
        )}

        {/* Comment / Reason Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            Catatan Keputusan / Justifikasi
            <span className="font-normal text-slate-400 text-[11px]">
              (Opsional untuk persetujuan; wajib untuk penolakan &amp; permintaan revisi)
            </span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isPending}
            placeholder="Tambahkan catatan relevan, kode otorisasi anggaran, atau umpan balik bagi pengaju..."
            className="w-full p-2.5 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Confirmation Modal / Panel for Destructive Decisions */}
        {confirmingAction && (
          <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-xs space-y-2">
            <div className="font-semibold text-amber-900 dark:text-amber-200">
              Konfirmasi {confirmingAction === "REJECT" ? "Penolakan Permintaan" : "Permintaan Revisi"}
            </div>
            <p className="text-amber-800 dark:text-amber-300 text-[11px]">
              {confirmingAction === "REJECT"
                ? "Tindakan ini akan menghentikan alur kerja dan menandai permintaan sebagai DITOLAK. Tindakan ini tidak dapat dibatalkan."
                : "Tindakan ini akan menjeda alur kerja persetujuan dan mengembalikan permintaan kepada pengaju untuk direvisi."}
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirmingAction(null)}
                className="text-xs h-7 px-2.5"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant={confirmingAction === "REJECT" ? "destructive" : "primary"}
                size="sm"
                disabled={isPending}
                onClick={() => handleDecision(confirmingAction)}
                className="text-xs h-7 px-3"
              >
                {isPending
                  ? "Memproses..."
                  : confirmingAction === "REJECT"
                  ? "Konfirmasi Penolakan"
                  : "Konfirmasi Minta Revisi"}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!confirmingAction && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                if (comment.trim().length < 5) {
                  setError("Mohon berikan alasan (minimal 5 karakter) untuk meminta revisi.");
                  return;
                }
                setConfirmingAction("REQUEST_REVISION");
              }}
              className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950/40"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              Minta Revisi
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                if (comment.trim().length < 5) {
                  setError("Mohon berikan alasan (minimal 5 karakter) untuk menolak permintaan ini.");
                  return;
                }
                setConfirmingAction("REJECT");
              }}
              className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/40"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Tolak Permintaan
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => handleDecision("APPROVE")}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isPending ? "Memproses..." : "Setujui Permintaan"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
