"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  onToggleMobileMenu: () => void;
}

const ROUTE_TITLES: Record<string, { title: string; category?: string }> = {
  "/": { title: "Overview", category: "Core" },
  "/requests": { title: "My Requests", category: "Requests" },
  "/approvals": { title: "Approvals", category: "Workflow" },
  "/notifications": { title: "Notifications", category: "System" },
  "/management/requests": { title: "All Organization Requests", category: "Management" },
  "/management/request-types": { title: "Request Types & Workflows", category: "Management" },
  "/management/departments": { title: "Departments", category: "Management" },
  "/management/users": { title: "Users & Roles", category: "Management" },
  "/system/activity": { title: "System Activity Log", category: "System" },
  "/system/settings": { title: "Organization Settings", category: "System" },
};

export function Topbar({ onToggleMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const currentRoute = ROUTE_TITLES[pathname] ?? {
    title: pathname.replace(/^\//, "").split("/").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" / "),
    category: "App",
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 shrink-0 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Open sidebar"
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
        {/* Security / Env indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Shield className="w-3 h-3 text-emerald-600" />
          <span>RBAC Enforced</span>
        </div>

        {/* Notifications Shortcut */}
        <Link
          href="/notifications"
          className="relative p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          title="View notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
        </Link>

        {/* Primary Action */}
        <Link href="/requests">
          <Button size="sm" className="hidden sm:inline-flex">
            <Plus className="w-3.5 h-3.5" />
            New Request
          </Button>
        </Link>
      </div>
    </header>
  );
}
