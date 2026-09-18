import React from "react";
import Link from "next/link";
import {
  FileText,
  CheckSquare,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  Database,
  Sliders,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OverviewPage() {
  const metrics = [
    { label: "My Active Requests", value: "0", subtext: "No active drafts or submissions", icon: FileText },
    { label: "Pending Approvals", value: "0", subtext: "Awaiting your review", icon: CheckSquare },
    { label: "In Review Across Org", value: "0", subtext: "Currently in review workflow", icon: Clock },
    { label: "Completed This Month", value: "0", subtext: "Processed and finalized", icon: CheckCircle2 },
  ];

  const sections = [
    {
      title: "Core Workflows",
      description: "Manage individual submissions and approval pipelines",
      links: [
        { label: "My Requests", href: "/requests", count: "0 Active" },
        { label: "Pending Approvals", href: "/approvals", count: "0 Queue" },
        { label: "Notifications", href: "/notifications", count: "0 Unread" },
      ],
    },
    {
      title: "Organization Management",
      description: "Configure request types, departments, and user roles",
      links: [
        { label: "All Requests", href: "/management/requests", count: "Org-wide" },
        { label: "Request Types", href: "/management/request-types", count: "5 Configured" },
        { label: "Departments", href: "/management/departments", count: "Structure" },
        { label: "User Access", href: "/management/users", count: "RBAC" },
      ],
    },
    {
      title: "System & Governance",
      description: "Traceability, immutable activity logging, and policy control",
      links: [
        { label: "Activity Log", href: "/system/activity", count: "Audit trail" },
        { label: "Organization Settings", href: "/system/settings", count: "Multi-tenant" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Platform Status Banner */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Flowinaja Platform Architecture
              </h2>
              <Badge variant="success">Phase 0 Baseline</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Internal Request & Approval Platform built for lightweight, production-oriented operations.
              Multi-tenant scoping, PostgreSQL Prisma models, and server-side RBAC authorization are initialized.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/requests">
              <Button size="sm">
                Create Request
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </span>
                  <div className="p-1.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                    {metric.value}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 truncate">
                  {metric.subtext}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modules Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sections.map((section, idx) => (
          <Card key={idx} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
              <CardDescription className="text-xs">{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 pt-0">
              {section.links.map((link, linkIdx) => (
                <Link
                  key={linkIdx}
                  href={link.href}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-slate-100 dark:border-slate-800/80 dark:hover:bg-slate-800/50 transition-colors text-xs"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {link.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {link.count}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Technical Architecture Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Database & Architectural Foundation</CardTitle>
              <CardDescription className="text-xs">
                Verified schema entities and service boundaries
              </CardDescription>
            </div>
            <Badge variant="neutral">Prisma 6.19 PostgreSQL</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
            <div className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Organization</span>
              </div>
              <p className="text-[11px] text-slate-500">Multi-tenant scope</p>
            </div>
            <div className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Department</span>
              </div>
              <p className="text-[11px] text-slate-500">Unit hierarchy</p>
            </div>
            <div className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>User & RBAC</span>
              </div>
              <p className="text-[11px] text-slate-500">4 Role levels</p>
            </div>
            <div className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>RequestType</span>
              </div>
              <p className="text-[11px] text-slate-500">Configurable steps</p>
            </div>
            <div className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Approval</span>
              </div>
              <p className="text-[11px] text-slate-500">Immutable history</p>
            </div>
            <div className="p-2.5 rounded border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>ActivityLog</span>
              </div>
              <p className="text-[11px] text-slate-500">Audit trail</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
