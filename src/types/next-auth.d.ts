import { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      organizationId: string;
      organizationName: string;
      departmentId: string | null;
      departmentName: string | null;
      isActive: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    organizationId?: string;
    departmentId?: string | null;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    organizationId?: string;
    organizationName?: string;
    departmentId?: string | null;
    departmentName?: string | null;
    isActive?: boolean;
    avatarUrl?: string | null;
  }
}
