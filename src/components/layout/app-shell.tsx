"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CurrentUserContext } from "@/types";

import { RealtimeSyncProvider } from "@/components/realtime/realtime-sync-provider";

interface AppShellProps {
  children: React.ReactNode;
  user: CurrentUserContext;
}

export function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RealtimeSyncProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col shrink-0">
          <Sidebar user={user} className="h-full" />
        </div>

        {/* Mobile Drawer Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            user={user}
            onNavClick={() => setMobileOpen(false)}
            className="h-full shadow-xl"
          />
        </div>

        {/* Main Content Viewport */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar user={user} onToggleMobileMenu={() => setMobileOpen(!mobileOpen)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
            <div className="max-w-6xl mx-auto w-full flex-1">
              {children}
            </div>

            {/* Platform Footer with Logo & Attribution */}
            <footer className="mt-12 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500 select-none pb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded overflow-hidden bg-white border border-slate-200/80 dark:border-slate-800 shrink-0">
                  <Image src="/logo.png" alt="Flowinaja" width={20} height={20} className="w-full h-full object-contain p-0.5" />
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Flowinaja</span>
                <span>&bull;</span>
                <span>Platform Permintaan &amp; Persetujuan Internal</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span>Dibuat oleh</span>
                <a
                  href="https://acelino.my.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>acelino.my.id</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </footer>
          </main>
        </div>

        {/* Floating Subtle Watermark Badge */}
        <aside aria-label="Kredit Pengembang">
          <a
            href="https://acelino.my.id"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-3 right-4 z-40 hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all opacity-80 hover:opacity-100 group"
            title="Dibuat oleh acelino.my.id"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
            <span>Dibuat oleh</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">
              acelino.my.id
            </span>
          </a>
        </aside>
      </div>
    </RealtimeSyncProvider>
  );
}
