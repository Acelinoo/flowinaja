"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequestFiltersProps {
  requestTypes: Array<{ id: string; name: string }>;
}

export function RequestFilters({ requestTypes }: RequestFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [type, setType] = useState(searchParams.get("type") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "");

  const handleApply = (newValues?: {
    search?: string;
    status?: string;
    type?: string;
    priority?: string;
  }) => {
    const params = new URLSearchParams();

    const s = newValues?.search !== undefined ? newValues.search : search;
    const st = newValues?.status !== undefined ? newValues.status : status;
    const t = newValues?.type !== undefined ? newValues.type : type;
    const p = newValues?.priority !== undefined ? newValues.priority : priority;

    if (s.trim()) params.set("search", s.trim());
    if (st) params.set("status", st);
    if (t) params.set("type", t);
    if (p) params.set("priority", p);

    router.push(`/requests?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setType("");
    setPriority("");
    router.push("/requests");
  };

  const hasActiveFilters = Boolean(
    searchParams.get("search") ||
      searchParams.get("status") ||
      searchParams.get("type") ||
      searchParams.get("priority")
  );

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari berdasarkan judul permintaan..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => handleApply()}
            className="text-xs h-9 px-3 w-full sm:w-auto"
          >
            <Filter className="w-3.5 h-3.5" />
            Terapkan Filter
          </Button>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs h-9 px-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Atur ulang seluruh filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Selects */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              handleApply({ status: e.target.value });
            }}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Semua Status</option>
            <option value="DRAFT">Draf</option>
            <option value="SUBMITTED">Diajukan</option>
            <option value="IN_REVIEW">Menunggu Persetujuan</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
            <option value="REVISION_REQUIRED">Memerlukan Revisi</option>
            <option value="PROCESSING">Sedang Diproses</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
        </div>

        <div>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              handleApply({ type: e.target.value });
            }}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Semua Tipe Permintaan</option>
            {requestTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              handleApply({ priority: e.target.value });
            }}
            className="w-full h-8 px-2.5 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Semua Prioritas</option>
            <option value="LOW">Rendah</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Tinggi</option>
            <option value="URGENT">Mendesak</option>
          </select>
        </div>
      </div>
    </div>
  );
}
