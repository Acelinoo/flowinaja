"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  PlayCircle,
  Ban,
  Settings,
  ArrowRight,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationType, UserRole } from "@prisma/client";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notification.actions";
import { NotificationPreferencesDialog } from "./notification-preferences-dialog";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
  readAt: Date | string | null;
  requestId: string | null;
  cycle: number | null;
  stepOrder: number | null;
  request?: {
    id: string;
    title: string;
    status: string;
    currentCycle: number;
  } | null;
}

export interface NotificationInboxProps {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  initialTotalCount: number;
  initialPage: number;
  totalPages: number;
  userRole: UserRole;
  preferences: {
    approvalPending: boolean;
    requestUpdates: boolean;
    processingUpdates: boolean;
    completionUpdates: boolean;
  };
}

export function NotificationInbox({
  initialNotifications,
  initialUnreadCount,
  initialTotalCount,
  initialPage,
  totalPages,
  userRole,
  preferences,
}: NotificationInboxProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  };

  const handleItemClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.requestId) {
      router.push(`/requests/${notification.requestId}`);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.isRead;
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.APPROVAL_PENDING:
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case NotificationType.REQUEST_APPROVED:
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case NotificationType.REQUEST_REJECTED:
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case NotificationType.REVISION_REQUESTED:
        return <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case NotificationType.REQUEST_PROCESSING:
        return <PlayCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case NotificationType.REQUEST_COMPLETED:
        return <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case NotificationType.REQUEST_CANCELLED:
        return <Ban className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
  };

  const formatTimestamp = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("id-ID", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Pusat Notifikasi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Peringatan audit dan alur kerja untuk siklus permintaan, persetujuan tertunda, dan pembaruan operasional.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreferencesOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Pengaturan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isPending}
            className="flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
            Tandai Semua Dibaca
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-md w-fit text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  filter === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Semua ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Belum Dibaca ({unreadCount})
              </button>
            </div>

            <Badge variant={unreadCount > 0 ? "default" : "neutral"}>
              {unreadCount} Belum Dibaca
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-center px-4">
              <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {filter === "unread" ? "Tidak Ada Notifikasi Baru" : "Tidak Ada Notifikasi"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {filter === "unread"
                  ? "Semua notifikasi telah dibaca. Seluruh pembaruan terkini telah diterima."
                  : "Ketika terjadi peristiwa pada alur kerja permintaan Anda, notifikasi akan muncul di sini."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleItemClick(notification)}
                  className={`group relative flex items-start justify-between gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${
                    !notification.isRead
                      ? "bg-blue-50/30 dark:bg-blue-950/15"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Icon bubble */}
                    <div className="mt-0.5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        {notification.request && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                            {notification.request.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-0.5">
                        <span>{formatTimestamp(notification.createdAt)}</span>
                        {notification.cycle && (
                          <span>• Siklus {notification.cycle}</span>
                        )}
                        {notification.stepOrder && (
                          <span>• Tahap {notification.stepOrder}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="opacity-80 hover:opacity-100 p-1.5 rounded text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                        title="Tandai sudah dibaca"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {notification.requestId && (
                      <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div>
              Halaman {initialPage} dari {totalPages} (Total {initialTotalCount})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={initialPage <= 1}
                onClick={() => router.push(`/notifications?page=${initialPage - 1}${filter === "unread" ? "&unreadOnly=true" : ""}`)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={initialPage >= totalPages}
                onClick={() => router.push(`/notifications?page=${initialPage + 1}${filter === "unread" ? "&unreadOnly=true" : ""}`)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog
        userRole={userRole}
        initialPreferences={preferences}
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
