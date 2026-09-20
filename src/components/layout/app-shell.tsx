"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CurrentUserContext } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  user: CurrentUserContext;
}

export function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
