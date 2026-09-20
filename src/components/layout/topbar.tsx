"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrentUserContext } from "@/types";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ROLE_LABELS } from "@/lib/constants/presentation";

interface TopbarProps {
  user: CurrentUserContext;
  onToggleMobileMenu: () => void;
}

const ROUTE_TITLES: Record<string, { title: string; category?: string }> = {
  "/": { title: "Dasbor", category: "Utama" },
  "/requests": { title: "Permintaan Saya", category: "Permintaan" },
  "/requests/new": { title: "Buat Permintaan Baru", category: "Permintaan" },
  "/approvals": { title: "Persetujuan", category: "Alur Kerja" },
  "/notifications": { title: "Pusat Notifikasi", category: "Sistem" },
  "/management/requests": { title: "Semua Permintaan Organisasi", category: "Manajemen" },
  "/management/request-types": { title: "Tipe Permintaan & Alur Kerja", category: "Manajemen" },
  "/management/departments": { title: "Departemen", category: "Manajemen" },
  "/management/users": { title: "Pengguna & Peran", category: "Manajemen" },
  "/system/activity": { title: "Log Aktivitas Sistem", category: "Sistem" },
  "/system/settings": { title: "Pengaturan Organisasi", category: "Sistem" },
};

export function Topbar({ user, onToggleMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const currentRoute = ROUTE_TITLES[pathname] ?? {
    title: pathname.replace(/^\//, "").split("/").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / "),
    category: "Aplikasi",
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 shrink-0 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Breadcrumb & Title */}
        <div className="flex items-center gap-2">
          {currentRoute.category && (
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              {currentRoute.category} /
            </span>
          )}
          <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {currentRoute.title}
          </h1>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Authenticated User Identity Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {user.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium uppercase">
            {ROLE_LABELS[user.role] || user.role}
          </span>
        </div>

        {/* Notifications Shortcut */}
        <NotificationBell />

        {/* Primary Action */}
        <Link href="/requests/new">
          <Button size="sm" className="hidden sm:inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Permintaan</span>
          </Button>
        </Link>

        {/* Sign Out Action */}
        <form
          action="/api/auth/signout"
          method="POST"
          className="inline-flex"
        >
          <button
            type="submit"
            className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
            title="Keluar"
            aria-label="Keluar dari akun"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
