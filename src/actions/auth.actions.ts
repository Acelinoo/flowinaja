"use server";

import { signOut } from "@/auth";
import { cookies } from "next/headers";

/**
 * Server action to securely sign out the current user session,
 * explicitly delete all authentication and session cookies,
 * and redirect cleanly to the login page.
 */
const COOKIE_BASE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Host-authjs.csrf-token",
  "authjs.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
  "__Secure-authjs.pkce.code_verifier",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.state",
  "authjs.state",
];

export async function logoutAction() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const namesToClear = new Set<string>();

  // Add all base cookie names and their chunk variations (.0 to .9)
  for (const base of COOKIE_BASE_NAMES) {
    namesToClear.add(base);
    for (let i = 0; i <= 9; i++) {
      namesToClear.add(`${base}.${i}`);
    }
  }

  // Include any existing cookie that looks like auth/session
  for (const c of allCookies) {
    if (
      c.name.includes("authjs") ||
      c.name.includes("next-auth") ||
      c.name.includes("session") ||
      c.name.includes("csrf") ||
      c.name.includes("callback") ||
      c.name.includes("token")
    ) {
      namesToClear.add(c.name);
    }
  }

  for (const name of namesToClear) {
    cookieStore.delete(name);
    const isSecure = name.startsWith("__Secure-") || name.startsWith("__Host-") || process.env.NODE_ENV === "production";
    cookieStore.set(name, "", {
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
    });
  }

  await signOut({ redirectTo: "/login" });
}
