"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isForbidden = error.message.includes("403") || error.message.toLowerCase().includes("forbidden");

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-8 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isForbidden ? "Akses Ditolak" : "Kendala Operasional"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isForbidden
              ? "Anda tidak memiliki peran atau izin yang memadai untuk mengakses area manajemen ini."
              : "Terjadi kendala tak terduga saat memproses tindakan ini."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dasbor
            </Button>
          </Link>
          {!isForbidden && (
            <Button size="sm" onClick={() => reset()}>
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Kembali
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
