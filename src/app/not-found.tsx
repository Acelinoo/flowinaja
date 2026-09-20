import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 select-none">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white mx-auto flex items-center justify-center shadow-xs p-1">
          <Image
            src="/logo.png"
            alt="Flowinaja Logo"
            width={56}
            height={56}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Halaman atau sumber daya internal yang Anda cari tidak tersedia di Flowinaja.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button size="sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dasbor
            </Button>
          </Link>
        </div>
        <div className="pt-6 text-center text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
          <span>Flowinaja &bull; Dibuat oleh</span>
          <a
            href="https://acelino.my.id"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>acelino.my.id</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
