import { UserRole } from "@prisma/client";

export { UserRole };

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  EMPLOYEE: {
    label: "Employee",
    description: "Can create and track personal requests",
  },
  SUPERVISOR: {
    label: "Supervisor",
    description: "Can review, approve, and recommend revisions for department requests",
  },
  MANAGER: {
    label: "Manager",
    description: "Can approve escalated requests and manage department oversight",
  },
  ADMIN: {
    label: "System Admin",
    description: "Full organizational configuration, user, and system management",
  },
};

/**
 * Returns whether a given role meets or exceeds the required target role in hierarchy.
 */
export function hasRoleHierarchy(userRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    EMPLOYEE: 1,
    SUPERVISOR: 2,
    MANAGER: 3,
    ADMIN: 4,
  };

  return hierarchy[userRole] >= hierarchy[targetRole];
}
