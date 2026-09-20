"use server";

import { signOut } from "@/auth";

/**
 * Server action to securely sign out the current user session
 * and redirect to the login page.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
