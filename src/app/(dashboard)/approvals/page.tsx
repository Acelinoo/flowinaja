import React from "react";
import { CheckSquare, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Approval Queue
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review pending requests requiring your role&apos;s sign-off and decision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Queue
          </Button>
        </div>
      </div>

      {/* Placeholder Container */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Pending Review Items</CardTitle>
              <CardDescription className="text-xs">
                Sequential approval steps determined by RequestType workflow rules
              </CardDescription>
            </div>
            <Badge variant="success">All Caught Up</Badge>
          </div>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <CheckSquare className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Approvals Pending
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            There are no requests awaiting your approval at this time. All sequential step actions will be managed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
