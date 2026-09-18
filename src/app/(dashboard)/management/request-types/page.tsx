import React from "react";
import { Plus, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRECONFIGURED_TYPES = [
  {
    name: "Purchase Request",
    code: "REQ-PUR",
    description: "Procurement of office supplies, equipment, software licenses, or asset purchases.",
    steps: ["1. Supervisor", "2. Department Manager", "3. Finance Admin"],
    isActive: true,
  },
  {
    name: "IT Access Request",
    code: "REQ-IT",
    description: "Access privileges to company systems, VPN, servers, and internal tools.",
    steps: ["1. Supervisor", "2. IT Admin"],
    isActive: true,
  },
  {
    name: "Maintenance Request",
    code: "REQ-MNT",
    description: "Facility maintenance, equipment repairs, and workplace infrastructure fixes.",
    steps: ["1. Supervisor", "2. Facility Admin"],
    isActive: true,
  },
  {
    name: "Business Travel Request",
    code: "REQ-TRV",
    description: "Travel authorization, per-diem allowances, accommodation, and conference attendance.",
    steps: ["1. Supervisor", "2. Department Manager", "3. HR / Finance"],
    isActive: true,
  },
  {
    name: "General Request",
    code: "REQ-GEN",
    description: "General administrative requests, inquiries, and internal operational submissions.",
    steps: ["1. Supervisor"],
    isActive: true,
  },
];

export default function ManagementRequestTypesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Request Types & Workflows
            </h2>
            <Badge variant="default">Configurable</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define organization request categories and their sequential multi-step approval pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Add Request Type
          </Button>
        </div>
      </div>

      {/* Grid of Request Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRECONFIGURED_TYPES.map((rt, idx) => (
          <Card key={idx} className="flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{rt.name}</CardTitle>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {rt.code}
                    </span>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {rt.description}
                  </CardDescription>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 mt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Sequential Approval Steps:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {rt.steps.map((step, sIdx) => (
                    <React.Fragment key={sIdx}>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        {step}
                      </span>
                      {sIdx < rt.steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      )}
                    </React.Fragment>
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
