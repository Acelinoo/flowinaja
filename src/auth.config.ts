import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * Edge-compatible authentication configuration without database adapters.
 * Used by middleware for fast, lightweight session verification on the edge.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth") ||
        pathname === "/api/health";

      if (!isLoggedIn && !isPublic) {
        return false; // Automatically redirects to pages.signIn ("/login")
      }

      if (isLoggedIn && pathname === "/login") {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
};
