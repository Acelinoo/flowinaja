"use server";

import { redirect } from "next/navigation";

/**
 * Server action that delegates logout directly to the canonical
 * /api/auth/logout HTTP route handler, ensuring comprehensive cookie purging,
 * Clear-Site-Data header emission, and a clean redirect to /login.
 */
export async function logoutAction() {
  redirect("/logout");
}
