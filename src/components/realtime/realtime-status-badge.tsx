"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRealtimeSync } from "./realtime-sync-provider";
import { RefreshCw, Volume2, VolumeX, CheckCircle, Wifi, Clock } from "lucide-react";

export function RealtimeStatusBadge() {
  const { isSyncing, lastSyncedAt, syncNow, soundEnabled, setSoundEnabled } = useRealtimeSync();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Menghubungkan...";
    const secondsAgo = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secondsAgo < 5) return "Baru saja";
    if (secondsAgo < 60) return `${secondsAgo} detik lalu`;
    return `${Math.floor(secondsAgo / 60)} menit lalu`;
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer select-none"
        title="Status Sinkronisasi Real-time"
        aria-label="Status sinkronisasi real-time"
      >
        <span className="relative flex h-2 w-2">
          {isSyncing ? (
            <RefreshCw className="w-2.5 h-2.5 text-blue-600 animate-spin" />
          ) : (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </>
          )}
        </span>
        <span className="hidden md:inline font-medium">
          {isSyncing ? "Menyinkronkan..." : "Realtime Aktif"}
        </span>
      </button>

      {/* Detail Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sinkronisasi Otomatis</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
              Aktif (4s)
            </span>
          </div>

          <div className="py-2.5 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pembaruan:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Tanpa perlu refresh
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Terakhir disinkron:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {formatLastSync(lastSyncedAt)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title={soundEnabled ? "Nonaktifkan audio notifikasi" : "Aktifkan audio notifikasi"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Suara: Nyala</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Suara: Mati</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={async () => {
                await syncNow();
              }}
              className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold transition-colors flex items-center gap-1.5 text-[11px] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Sinkron Sekarang</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
