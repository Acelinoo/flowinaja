import React from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_TIERS = [
  {
    role: "EMPLOYEE",
    label: "Employee",
    variant: "neutral" as const,
    summary: "Standard requester. Can draft, submit, and track personal requests.",
    permissions: ["request:create", "request:view", "requestType:view", "department:view"],
  },
  {
    role: "SUPERVISOR",
    label: "Supervisor",
    variant: "default" as const,
    summary: "First-tier reviewer. Can approve, reject, or request revisions on department submissions.",
    permissions: ["request:create", "request:view", "request:approve", "department:view", "activity:view"],
  },
  {
    role: "MANAGER",
    label: "Manager",
    variant: "warning" as const,
    summary: "Department head. Manages department requests, budget sign-offs, and escalation approvals.",
    permissions: ["request:create", "request:view", "request:approve", "request:manage", "user:view"],
  },
  {
    role: "ADMIN",
    label: "System Admin",
    variant: "destructive" as const,
    summary: "Organization administrator. Full system governance, workflow configuration, and user control.",
    permissions: ["* Full Server-Side Access"],
  },
];

export default function ManagementUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Users & Roles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-tier Role-Based Access Control (RBAC) enforced server-side.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Invite User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ROLE_TIERS.map((tier, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">{tier.label}</CardTitle>
                </div>
                <Badge variant={tier.variant}>{tier.role}</Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                {tier.summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Assigned Permissions:
                </span>
                <div className="flex flex-wrap gap-1">
                  {tier.permissions.map((p, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
