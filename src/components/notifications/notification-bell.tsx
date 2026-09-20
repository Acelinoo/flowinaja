"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useRealtimeSync } from "@/components/realtime/realtime-sync-provider";

interface NotificationBellProps {
  initialCount?: number;
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const { unreadCount: realtimeUnreadCount } = useRealtimeSync();
  const [unreadCount, setUnreadCount] = useState<number>(initialCount);

  // Sync with real-time sync provider
  useEffect(() => {
    setUnreadCount(realtimeUnreadCount);
  }, [realtimeUnreadCount]);

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
