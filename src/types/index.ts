import { UserRole, RequestStatus, ApprovalStatus, ActivityAction } from "@prisma/client";
import { Permission } from "@/lib/auth/permissions";

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  badge?: string | number;
  permission?: Permission;
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface CurrentUserContext {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  departmentId?: string | null;
  departmentName?: string | null;
}

export interface RequestSummaryDTO {
  id: string;
  title: string;
  requestTypeName: string;
  requesterName: string;
  departmentName?: string | null;
  status: RequestStatus;
  currentStepOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalSummaryDTO {
  id: string;
  requestId: string;
  requestTitle: string;
  requesterName: string;
  stepOrder: number;
  stepTitle: string;
  status: ApprovalStatus;
  createdAt: Date;
}

export interface ActivitySummaryDTO {
  id: string;
  action: ActivityAction;
  actorName: string;
  requestTitle?: string | null;
  details?: string | null;
  createdAt: Date;
}
