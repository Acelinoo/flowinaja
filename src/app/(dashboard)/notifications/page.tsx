import React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Notifications
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Database-backed alerts for request status changes, approvals, and revision requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
            Mark All as Read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Notification Inbox</CardTitle>
              <CardDescription className="text-xs">
                In-app alerts (database-backed without heavy WebSocket infrastructure)
              </CardDescription>
            </div>
            <Badge variant="neutral">0 Unread</Badge>
          </div>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Bell className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Notifications
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            You&apos;re all caught up. When actions occur on your requests or assignments, notifications will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
