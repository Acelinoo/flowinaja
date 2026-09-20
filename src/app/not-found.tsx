import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Halaman atau sumber daya internal yang Anda cari tidak tersedia di Flowinaja.
        </p>
        <div>
          <Link href="/">
            <Button size="sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dasbor
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
