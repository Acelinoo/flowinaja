"use server";

import { signOut } from "@/auth";
import { cookies } from "next/headers";

/**
 * Server action to securely sign out the current user session,
 * explicitly delete all authentication and session cookies,
 * and redirect cleanly to the login page.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  for (const c of allCookies) {
    if (
      c.name.includes("authjs") ||
      c.name.includes("next-auth") ||
      c.name.includes("session") ||
      c.name.includes("csrf")
    ) {
      cookieStore.delete(c.name);
      cookieStore.set(c.name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    }
  }

  await signOut({ redirectTo: "/login" });
}
