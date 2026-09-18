import React from "react";
import { History, Filter, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SystemActivityPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              System Activity Log
            </h2>
            <Badge variant="neutral">Audit Trail</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable audit record of all significant state transitions, approvals, and system mutations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Actions
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Audit Events</CardTitle>
              <CardDescription className="text-xs">
                Captures REQUEST_CREATED, REQUEST_SUBMITTED, REQUEST_APPROVED, and other domain events
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tamper-Resistant</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <History className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Activity Recorded
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            As users initiate requests and approvers record decisions, immutable activity timeline records will be logged here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
