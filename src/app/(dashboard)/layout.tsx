import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthenticatedUser();

  return <AppShell user={user}>{children}</AppShell>;
}
