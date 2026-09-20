import * as React from "react";
import { RequestPriority } from "@prisma/client";
import { Badge } from "./badge";
import { PRIORITY_LABELS } from "@/lib/constants/presentation";

interface PriorityBadgeProps {
  priority: RequestPriority | string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getVariant = (p: string) => {
    switch (p) {
      case "LOW":
        return "neutral" as const;
      case "NORMAL":
        return "default" as const;
      case "HIGH":
        return "warning" as const;
      case "URGENT":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const label = PRIORITY_LABELS[priority as RequestPriority] || priority;
  const variant = getVariant(priority);

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
