import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { Permission, hasPermission } from "./permissions";
import { hasRoleHierarchy } from "./roles";
import { CurrentUserContext } from "@/types";
import { redirect } from "next/navigation";

/**
 * Resolves current authenticated user context from verified server session.
 * Returns null if not authenticated or inactive.
 */
export async function getCurrentUser(): Promise<CurrentUserContext | null> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email || !session.user.isActive) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name || session.user.email.split("@")[0],
    email: session.user.email,
    role: session.user.role,
    organizationId: session.user.organizationId,
    organizationName: session.user.organizationName,
    departmentId: session.user.departmentId,
    departmentName: session.user.departmentName,
  };
}

/**
 * Asserts user is authenticated and active.
 * Redirects to /login if unauthenticated in page contexts, or throws error.
 */
export async function requireAuthenticatedUser(options?: { redirectToLogin?: boolean }): Promise<CurrentUserContext> {
  const user = await getCurrentUser();

  if (!user) {
    if (options?.redirectToLogin !== false) {
      redirect("/login");
    }
    throw new Error("401 Unauthorized: Authentication required");
  }

  return user;
}

/**
 * Asserts that the authenticated user belongs to target organization.
 * Strictly prevents cross-tenant data leakage (IDOR).
 */
export async function requireOrganizationAccess(targetOrgId?: string): Promise<CurrentUserContext> {
  const user = await requireAuthenticatedUser();

  if (targetOrgId && user.organizationId !== targetOrgId) {
    throw new Error("403 Forbidden: Cross-organization access denied");
  }

  return user;
}

/**
 * Asserts that the authenticated user possesses the specific permission.
 */
export async function requirePermission(permission: Permission): Promise<CurrentUserContext> {
  const user = await requireAuthenticatedUser();

  if (!hasPermission(user.role, permission)) {
    throw new Error(`403 Forbidden: Missing permission '${permission}'`);
  }

  return user;
}

/**
 * Asserts that the authenticated user meets or exceeds the required role.
 */
export async function requireRole(minimumRole: UserRole): Promise<CurrentUserContext> {
  const user = await requireAuthenticatedUser();

  if (!hasRoleHierarchy(user.role, minimumRole)) {
    throw new Error(`403 Forbidden: Role '${minimumRole}' required`);
  }

  return user;
}
