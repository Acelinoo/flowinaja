"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Bell,
  FolderKanban,
  Sliders,
  Building2,
  Users,
  History,
  Settings,
  ShieldCheck,
  ChevronRight,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onNavClick?: () => void;
  className?: string;
}

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroupConfig {
  title?: string;
  items: NavItemConfig[];
}

const NAV_GROUPS: NavGroupConfig[] = [
  {
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "My Requests", href: "/requests", icon: FileText },
      { label: "Approvals", href: "/approvals", icon: CheckSquare, badge: "Pending" },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "All Requests", href: "/management/requests", icon: FolderKanban },
      { label: "Request Types", href: "/management/request-types", icon: Sliders },
      { label: "Departments", href: "/management/departments", icon: Building2 },
      { label: "Users", href: "/management/users", icon: Users },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Activity Log", href: "/system/activity", icon: History },
      { label: "Settings", href: "/system/settings", icon: Settings },
    ],
  },
];

export function Sidebar({ onNavClick, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-64 flex flex-col bg-white border-r border-slate-200 dark:bg-slate-900 dark:border-slate-800 shrink-0 select-none",
        className
      )}
    >
      {/* Brand & Organization */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-slate-100"
          onClick={onNavClick}
        >
          <div className="w-7 h-7 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Workflow className="w-4 h-4" />
          </div>
          <span className="text-base tracking-tight font-semibold">Flowinaja</span>
        </Link>
        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          Core
        </span>
      </div>

      {/* Organization Switcher Context */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Workspace</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">Demo Organization</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {group.title && (
              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isActive ? "text-blue-700 dark:text-blue-400" : "text-slate-400"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Context Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50">
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            AD
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">Admin User</span>
              <span className="text-[9px] font-bold px-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />
                ADMIN
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">admin@flowinaja.local</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
