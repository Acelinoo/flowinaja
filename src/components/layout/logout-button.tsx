"use client";

import React, { useState } from "react";
import { LogOut, AlertTriangle, X } from "lucide-react";

export function LogoutButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors cursor-pointer"
        title="Keluar dari Akun"
        aria-label="Keluar dari akun"
      >
        <LogOut className="w-4 h-4" />
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Konfirmasi Keluar Akun
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Akhiri sesi operasional aktif saat ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
                aria-label="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              Apakah Anda yakin ingin keluar dari akun Anda? Seluruh token sesi akan dihapus dan Anda dapat memilih akun Google yang berbeda saat masuk kembali.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <a
                href="/logout"
                className="px-4 py-2 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer no-underline"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ya, Keluar Akun</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
