import { UserRole } from "@prisma/client";

export type Permission =
  | "request:create"
  | "request:view"
  | "request:approve"
  | "request:manage"
  | "user:view"
  | "user:manage"
  | "department:view"
  | "department:manage"
  | "requestType:view"
  | "requestType:manage"
  | "activity:view"
  | "settings:manage";

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  EMPLOYEE: [
    "request:create",
    "request:view",
    "requestType:view",
    "department:view",
  ],
  SUPERVISOR: [
    "request:create",
    "request:view",
    "request:approve",
    "requestType:view",
    "department:view",
    "user:view",
    "activity:view",
  ],
  MANAGER: [
    "request:create",
    "request:view",
    "request:approve",
    "request:manage",
    "requestType:view",
    "department:view",
    "user:view",
    "activity:view",
  ],
  ADMIN: [
    "request:create",
    "request:view",
    "request:approve",
    "request:manage",
    "user:view",
    "user:manage",
    "department:view",
    "department:manage",
    "requestType:view",
    "requestType:manage",
    "activity:view",
    "settings:manage",
  ],
};

/**
 * Server-side permission check for a given user role.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed ? allowed.includes(permission) : false;
}

/**
 * Throws an authorization error if the role does not have the specified permission.
 */
export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Unauthorized: Role '${role}' lacks required permission '${permission}'`);
  }
}
