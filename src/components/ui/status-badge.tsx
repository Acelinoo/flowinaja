import * as React from "react";
import { RequestStatus, ApprovalStatus } from "@prisma/client";
import { Badge } from "./badge";
import { STATUS_LABELS } from "@/lib/constants/presentation";

interface StatusBadgeProps {
  status: RequestStatus | ApprovalStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariant = (s: string) => {
    switch (s) {
      case "DRAFT":
        return "neutral" as const;
      case "SUBMITTED":
        return "default" as const;
      case "IN_REVIEW":
        return "warning" as const;
      case "APPROVED":
        return "success" as const;
      case "REJECTED":
        return "destructive" as const;
      case "REVISION_REQUIRED":
      case "REVISION_REQUESTED":
        return "warning" as const;
      case "PROCESSING":
        return "default" as const;
      case "COMPLETED":
        return "success" as const;
      case "CANCELLED":
        return "neutral" as const;
      case "PENDING":
        return "neutral" as const;
      default:
        return "outline" as const;
    }
  };

  const label = STATUS_LABELS[status] || status;
  const variant = getVariant(status);

  return (
    <Badge variant={variant} className={className}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {label}
    </Badge>
  );
}
