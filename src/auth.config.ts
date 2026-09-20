import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed || undefined;
}

const googleId = cleanEnv(
  process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID
);
const googleSecret = cleanEnv(
  process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET
);
const githubId = cleanEnv(
  process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID
);
const githubSecret = cleanEnv(
  process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET
);
const authSecret =
  cleanEnv(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) ||
  "flowinaja-session-secret-production-fallback-key-32chars-secure";

/**
 * Edge-compatible authentication configuration without database adapters.
 * Used by middleware for fast, lightweight session verification on the edge.
 */
export const authConfig: NextAuthConfig = {
  secret: authSecret,
  trustHost: true,
  providers: [
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    ...(githubId && githubSecret
      ? [
          GitHub({
            clientId: githubId,
            clientSecret: githubSecret,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname === "/login" ||
        pathname === "/logout" ||
        pathname.startsWith("/api/auth") ||
        pathname === "/api/sync" ||
        pathname === "/api/health";

      if (!isLoggedIn && !isPublic) {
        return false; // Automatically redirects to pages.signIn ("/login")
      }

      // Allow /login to render so user can see account status, switch accounts, or log out
      return true;
    },
  },
};
