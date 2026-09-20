import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      const normalizedEmail = user.email.toLowerCase();

      // Check if user already exists in PostgreSQL
      const dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { organization: true },
      });

      if (dbUser) {
        // Enforce user status: Inactive users are rejected
        if (!dbUser.isActive) {
          return false;
        }

        // Link OAuth account if not previously stored
        if (account) {
          const existingAccount = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          if (!existingAccount) {
            await prisma.account.create({
              data: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: typeof account.session_state === "string" ? account.session_state : null,
              },
            });
          }
        }

        // Populate avatarUrl if not set
        if (!dbUser.avatarUrl && user.image) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { avatarUrl: user.image },
          });
        }

        return true;
      }

      // User does not exist: Provision new user
      // Deterministic onboarding:
      // First user across the entire system becomes ADMIN; subsequent users become EMPLOYEE
      const totalUsers = await prisma.user.count();

      // Find or create default organization
      let defaultOrg = await prisma.organization.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!defaultOrg) {
        defaultOrg = await prisma.organization.create({
          data: {
            name: "Demo Organization",
            slug: "demo-org",
          },
        });
      }

      const assignedRole: UserRole = totalUsers === 0 ? UserRole.ADMIN : UserRole.EMPLOYEE;

      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: user.name || normalizedEmail.split("@")[0],
          avatarUrl: user.image,
          role: assignedRole,
          organizationId: defaultOrg.id,
          isActive: true,
          emailVerified: new Date(),
        },
      });

      // Link OAuth account record
      if (account) {
        await prisma.account.create({
          data: {
            userId: newUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: typeof account.session_state === "string" ? account.session_state : null,
          },
        });
      }

      return true;
    },

    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
          include: { organization: true, department: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
          token.organizationName = dbUser.organization.name;
          token.departmentId = dbUser.departmentId;
          token.departmentName = dbUser.department?.name ?? null;
          token.isActive = dbUser.isActive;
          token.avatarUrl = dbUser.avatarUrl;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.role = (token.role as UserRole) || UserRole.EMPLOYEE;
        session.user.organizationId = (token.organizationId as string) || "";
        session.user.organizationName = (token.organizationName as string) || "Organization";
        session.user.departmentId = (token.departmentId as string) || null;
        session.user.departmentName = (token.departmentName as string) || null;
        session.user.isActive = token.isActive !== false;
        if (token.avatarUrl) {
          session.user.image = token.avatarUrl as string;
        }
      }
      return session;
    },
  },
});
