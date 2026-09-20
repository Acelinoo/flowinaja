import React from "react";
import Link from "next/link";
import { History, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY_ACTION_LABELS,
  ROLE_LABELS,
  formatDateIndonesian,
} from "@/lib/constants/presentation";
import { ActivityAction, UserRole } from "@prisma/client";

interface RecentActivityFeedProps {
  title?: string;
  description?: string;
  activities: Array<{
    id: string;
    action: ActivityAction;
    details?: string | null;
    createdAt: Date;
    actor?: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    } | null;
    request?: {
      id: string;
      title: string;
      status: string;
    } | null;
  }>;
  showViewAllLink?: boolean;
}

export function RecentActivityFeed({
  title = "Log Aktivitas Terkini",
  description = "Jejak audit peristiwa alur kerja dan perubahan status penting",
  activities,
  showViewAllLink = true,
}: RecentActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {showViewAllLink && (
          <Link href="/system/activity">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
              <span>Seluruh Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center text-xs text-slate-500">
            <History className="w-6 h-6 text-slate-400 mb-2" />
            <span>Tidak ada aktivitas pada periode ini.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.map((act) => {
              const actionLabel = ACTIVITY_ACTION_LABELS[act.action] || act.action;
              const roleLabel = act.actor?.role ? ROLE_LABELS[act.actor.role] : "";

              return (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-4 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {actionLabel}
                      </span>
                      {act.actor && (
                        <span className="text-[11px] text-slate-500">
                          oleh <strong className="text-slate-700 dark:text-slate-300">{act.actor.name}</strong>{" "}
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {roleLabel}
                          </span>
                        </span>
                      )}
                      {act.request && (
                        <Link
                          href={`/requests/${act.request.id}`}
                          className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:underline truncate max-w-xs"
                        >
                          {act.request.title}
                        </Link>
                      )}
                    </div>
                    {act.details && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        {act.details}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap pt-0.5">
                    {formatDateIndonesian(act.createdAt, { includeTime: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
