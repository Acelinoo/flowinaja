"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  resubmitRevisionAction,
  startProcessingAction,
  completeRequestAction,
  cancelRequestAction,
} from "@/actions/request.actions";
import {
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
  Edit3,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { RequestStatus } from "@prisma/client";

interface RequestLifecycleActionsProps {
  requestId: string;
  status: RequestStatus;
  isOwner: boolean;
  canManage: boolean;
}

export function RequestLifecycleActions({
  requestId,
  status,
  isOwner,
  canManage,
}: RequestLifecycleActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const terminalStates: RequestStatus[] = [
    RequestStatus.COMPLETED,
    RequestStatus.REJECTED,
    RequestStatus.CANCELLED,
  ];
  const isTerminal = terminalStates.includes(status);
  const canCancel = !isTerminal && (isOwner || canManage);

  const triggerSync = () => {
    try {
      window.dispatchEvent(new Event("flowinaja:mutate"));
      const bc = new BroadcastChannel("flowinaja_realtime");
      bc.postMessage("mutate");
      bc.close();
    } catch {}
  };

  const handleResubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await resubmitRevisionAction(requestId);
      if (!res.success) {
        setError(res.error || "Gagal mengajukan ulang permintaan");
      } else {
        triggerSync();
      }
    });
  };

  const handleStartProcessing = () => {
    setError(null);
    startTransition(async () => {
      const res = await startProcessingAction(requestId);
      if (!res.success) {
        setError(res.error || "Gagal memulai pemrosesan permintaan");
      } else {
        triggerSync();
      }
    });
  };

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const res = await completeRequestAction(requestId);
      if (!res.success) {
        setError(res.error || "Gagal menyelesaikan permintaan");
      } else {
        triggerSync();
      }
    });
  };

  const handleConfirmCancel = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelRequestAction(requestId, cancelReason);
      if (!res.success) {
        setError(res.error || "Gagal membatalkan permintaan");
      } else {
        setShowCancelModal(false);
        setCancelReason("");
        triggerSync();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <div className="flex items-center gap-1.5 p-2 rounded text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Revision Required: Owner can Edit or Resubmit */}
        {status === RequestStatus.REVISION_REQUIRED && isOwner && (
          <>
            <Link href={`/requests/${requestId}/edit`}>
              <Button variant="outline" size="sm" className="text-xs">
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Ubah Spesifikasi
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleResubmit}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
              )}
              Ajukan Ulang Permintaan
            </Button>
          </>
        )}

        {/* Approved: Manager/Admin can Start Processing */}
        {status === RequestStatus.APPROVED && canManage && (
          <Button
            variant="primary"
            size="sm"
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleStartProcessing}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1 fill-current" />
            )}
            Mulai Pemrosesan
          </Button>
        )}

        {/* Processing: Manager/Admin can Mark Completed */}
        {status === RequestStatus.PROCESSING && canManage && (
          <Button
            variant="primary"
            size="sm"
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleComplete}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            )}
            Tandai Selesai
          </Button>
        )}

        {/* Cancel Action (Requester or Manager/Admin) on non-terminal requests */}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/40"
            onClick={() => setShowCancelModal(true)}
            disabled={isPending}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Batalkan Permintaan
          </Button>
        )}
      </div>

      {/* Cancellation Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 text-left">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                Konfirmasi Pembatalan Permintaan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Apakah Anda yakin ingin membatalkan permintaan ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Alasan Pembatalan (Opsional)
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tuliskan alasan pembatalan..."
                className="w-full text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={isPending}
              >
                Pertahankan Permintaan
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                onClick={handleConfirmCancel}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                )}
                Konfirmasi Batalkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
