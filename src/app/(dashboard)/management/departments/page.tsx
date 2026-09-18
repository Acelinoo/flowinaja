import React from "react";
import { Plus, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SAMPLE_DEPARTMENTS = [
  { name: "Engineering & Technology", code: "ENG", head: "Chief Technology Officer", members: 18 },
  { name: "Operations & Logistics", code: "OPS", head: "Operations Director", members: 24 },
  { name: "Finance & Accounting", code: "FIN", head: "Finance Manager", members: 8 },
  { name: "Human Resources", code: "HR", head: "People Operations Lead", members: 6 },
  { name: "General Affairs", code: "GA", head: "GA Supervisor", members: 12 },
];

export default function ManagementDepartmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Departments
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organizational units used for routing requests and scoping supervisor approval authority.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Add Department
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SAMPLE_DEPARTMENTS.map((dept, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{dept.name}</CardTitle>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {dept.code}
                </span>
              </div>
              <CardDescription className="text-xs">{dept.head}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Users className="w-3.5 h-3.5" />
                <span>{dept.members} Assigned Members</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
