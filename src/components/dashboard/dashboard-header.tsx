"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Calendar, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  currentRange: string;
  organizationName: string;
}

const DATE_RANGE_OPTIONS = [
  { value: "ALL", label: "Semua Periode" },
  { value: "TODAY", label: "Hari Ini" },
  { value: "7D", label: "7 Hari Terakhir" },
  { value: "30D", label: "30 Hari Terakhir" },
  { value: "THIS_MONTH", label: "Bulan Ini" },
  { value: "LAST_MONTH", label: "Bulan Lalu" },
];

export function DashboardHeader({ currentRange, organizationName }: DashboardHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleRangeChange = (newRange: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newRange === "ALL") {
      params.delete("range");
    } else {
      params.set("range", newRange);
    }

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dasbor Operasional
          </h1>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            {organizationName}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Pemantauan terpadu alur kerja persetujuan, metrik operasional, dan log aktivitas real-time.
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1 text-xs shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={currentRange}
            disabled={isPending}
            onChange={(e) => handleRangeChange(e.target.value)}
            className="bg-transparent border-none text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
            aria-label="Pilih Rentang Waktu"
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
          {isPending && <RotateCcw className="w-3 h-3 text-slate-400 animate-spin" />}
        </div>

        {/* Action Button */}
        <Link href="/requests/new">
          <Button size="sm" className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Permintaan</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
