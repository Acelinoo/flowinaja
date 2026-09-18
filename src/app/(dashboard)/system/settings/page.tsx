import React from "react";
import { Building, Lock, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Organization Settings
            </h2>
            <Badge variant="destructive">Admin Only</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tenant configuration, multi-tenant parameters, and platform governance.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold">Tenant Identification</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Every data record is strictly scoped to this Organization ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Organization Name</label>
                <input
                  type="text"
                  defaultValue="Demo Organization"
                  disabled
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tenant Slug</label>
                <input
                  type="text"
                  defaultValue="demo-org"
                  disabled
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-semibold">Security & Access Policies</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Platform-level enforcement rules for approvals and data isolation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Strict Multi-Tenant Scoping
                </span>
                <span className="text-[11px] text-slate-500">
                  Enforce organizationId validation in all service layer queries.
                </span>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Immutable Approval History
                </span>
                <span className="text-[11px] text-slate-500">
                  Disallow updates or overwrites to existing approval records.
                </span>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button size="sm" disabled>
              <Save className="w-3.5 h-3.5" />
              Save Configuration
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
