import * as React from "react";
import { RequestStatus, ApprovalStatus } from "@prisma/client";
import { Badge } from "./badge";

interface StatusBadgeProps {
  status: RequestStatus | ApprovalStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getVariantAndLabel = (s: string) => {
    switch (s) {
      case "DRAFT":
        return { variant: "neutral" as const, label: "Draft" };
      case "SUBMITTED":
        return { variant: "default" as const, label: "Submitted" };
      case "IN_REVIEW":
        return { variant: "warning" as const, label: "In Review" };
      case "APPROVED":
        return { variant: "success" as const, label: "Approved" };
      case "REJECTED":
        return { variant: "destructive" as const, label: "Rejected" };
      case "REVISION_REQUIRED":
      case "REVISION_REQUESTED":
        return { variant: "warning" as const, label: "Revision Required" };
      case "PROCESSING":
        return { variant: "default" as const, label: "Processing" };
      case "COMPLETED":
        return { variant: "success" as const, label: "Completed" };
      case "CANCELLED":
        return { variant: "neutral" as const, label: "Cancelled" };
      case "PENDING":
        return { variant: "neutral" as const, label: "Pending" };
      default:
        return { variant: "outline" as const, label: s };
    }
  };

  const { variant, label } = getVariantAndLabel(status);

  return (
    <Badge variant={variant} className={className}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {label}
    </Badge>
  );
}
