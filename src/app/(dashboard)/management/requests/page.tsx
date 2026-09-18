import React from "react";
import { FolderKanban, Filter, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ManagementRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Organization Requests
            </h2>
            <Badge variant="default">Admin / Manager View</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comprehensive oversight across all departments and workflow statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Log
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">All Organizational Submissions</CardTitle>
          <CardDescription className="text-xs">
            Server-side filtered and paginated request master list
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <FolderKanban className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Requests in Organization
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            Requests across all organization departments will appear here for high-level management and auditing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
