import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { findValidAdminSession } from "@/lib/admin";
import { findValidSession, SESSION_COOKIE_NAME } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    redirect("/?error=UNAUTHENTICATED");
  }

  // Block student from accessing admin routes and redirect to /home
  const studentSession = await findValidSession(rawToken);
  if (studentSession && studentSession.user) {
    redirect("/home");
  }

  const adminSession = await findValidAdminSession(rawToken);
  if (!adminSession || !adminSession.adminAccount) {
    redirect("/?error=UNAUTHORIZED_ACCOUNT");
  }

  const initialAdmin = {
    id: adminSession.adminAccount.id,
    email: adminSession.adminAccount.email,
    displayName: adminSession.adminAccount.displayName,
  };

  return <AdminShell initialAdmin={initialAdmin}>{children}</AdminShell>;
}
