"use client";

import React, { useState, useTransition } from "react";
import { Settings, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePreferencesAction } from "@/actions/notification.actions";
import { UserRole } from "@prisma/client";

interface NotificationPreferencesDialogProps {
  userRole: UserRole;
  initialPreferences: {
    approvalPending: boolean;
    requestUpdates: boolean;
    processingUpdates: boolean;
    completionUpdates: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NotificationPreferencesDialog({
  userRole,
  initialPreferences,
  isOpen,
  onClose,
  onSuccess,
}: NotificationPreferencesDialogProps) {
  const isApprover = ([UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.ADMIN] as UserRole[]).includes(userRole);
  const [approvalPending, setApprovalPending] = useState(
    isApprover ? true : initialPreferences.approvalPending
  );
  const [requestUpdates, setRequestUpdates] = useState(initialPreferences.requestUpdates);
  const [processingUpdates, setProcessingUpdates] = useState(initialPreferences.processingUpdates);
  const [completionUpdates, setCompletionUpdates] = useState(initialPreferences.completionUpdates);

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await updatePreferencesAction({
        approvalPending: isApprover ? true : approvalPending,
        requestUpdates,
        processingUpdates,
        completionUpdates,
      });

      if (res.success) {
        setMessage({ text: "Pengaturan notifikasi berhasil disimpan." });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setMessage({ text: res.error || "Gagal menyimpan pengaturan notifikasi", error: true });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Pengaturan Notifikasi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Atur jenis peristiwa yang akan mengirimkan pemberitahuan ke pusat notifikasi Anda.
        </p>

        {message && (
          <div
            className={`p-2.5 rounded-md text-xs mb-4 ${
              message.error
                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Approval Pending */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                Persetujuan Tertunda
                {isApprover && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                    <ShieldAlert className="w-3 h-3" /> Wajib
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {isApprover
                  ? "Wajib untuk peran Anda. Penyetuju harus menerima notifikasi saat ada permintaan yang menunggu keputusan."
                  : "Notifikasi saat ada permintaan yang membutuhkan tindakan persetujuan Anda."}
              </p>
            </div>
            <input
              type="checkbox"
              checked={isApprover ? true : approvalPending}
              disabled={isApprover || isPending}
              onChange={(e) => setApprovalPending(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
            />
          </div>

          {/* Request Updates */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Pembaruan Status Permintaan
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Terima pemberitahuan saat permintaan Anda disetujui, ditolak, atau diminta untuk direvisi.
              </p>
            </div>
            <input
              type="checkbox"
              checked={requestUpdates}
              disabled={isPending}
              onChange={(e) => setRequestUpdates(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Processing Updates */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Pembaruan Pemrosesan
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Terima pemberitahuan saat permintaan yang disetujui mulai diproses secara operasional.
              </p>
            </div>
            <input
              type="checkbox"
              checked={processingUpdates}
              disabled={isPending}
              onChange={(e) => setProcessingUpdates(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Completion Updates */}
          <div className="flex items-start justify-between gap-3 p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Penyelesaian &amp; Pembatalan
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Terima pemberitahuan saat permintaan Anda telah selesai dipenuhi atau dibatalkan.
              </p>
            </div>
            <input
              type="checkbox"
              checked={completionUpdates}
              disabled={isPending}
              onChange={(e) => setCompletionUpdates(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
