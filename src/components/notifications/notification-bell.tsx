"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  initialCount?: number;
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState<number>(initialCount);

  useEffect(() => {
    let isMounted = true;

    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch {
        // Silently ignore network failures for notification poll
      }
    }

    // Initial fetch on mount
    fetchUnreadCount();

    // Periodic poll every 30s
    const interval = setInterval(fetchUnreadCount, 30000);

    // Also refresh on window focus
    const onFocus = () => fetchUnreadCount();
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative p-1.5 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
      title={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Pusat Notifikasi"}
      aria-label={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Pusat Notifikasi"}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
