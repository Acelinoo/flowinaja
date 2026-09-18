import React from "react";
import { FileText, Plus, Filter, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MyRequestsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            My Requests
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, track, and manage all your personal internal workflow requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            New Request
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or reference ID..."
            disabled
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-75"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Status
          </Button>
        </div>
      </div>

      {/* Empty State / Placeholder Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Request History</CardTitle>
              <CardDescription className="text-xs">
                Real database-backed records will populate here upon submission
              </CardDescription>
            </div>
            <Badge variant="neutral">0 Records</Badge>
          </div>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Requests Created Yet
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            You haven&apos;t submitted any internal requests. When request workflows are launched in Phase 1, you can track their step-by-step progress here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
