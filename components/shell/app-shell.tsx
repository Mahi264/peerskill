"use client";

import * as React from "react";

import { useStudentAuth } from "@/components/auth/student-auth-context";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";

export interface AppShellProps {
  children: React.ReactNode;
  user?: {
    email: string;
    status: string;
  } | null;
  profile?: {
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  onLogout?: () => void;
  showNav?: boolean;
}

export function AppShell({
  children,
  user: propUser,
  profile: propProfile,
  onLogout: propOnLogout,
  showNav = true,
}: AppShellProps) {
  let authContext: ReturnType<typeof useStudentAuth> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    authContext = useStudentAuth();
  } catch {
    // Graceful fallback if rendered outside StudentAuthProvider in isolated unit tests
    authContext = null;
  }

  const user = propUser !== undefined ? propUser : authContext?.user || null;
  const profile = propProfile !== undefined ? propProfile : authContext?.profile || null;
  const onLogout = propOnLogout !== undefined ? propOnLogout : authContext?.logout;

  if (!showNav) {
    return (
      <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] flex flex-col md:flex-row">
      <AppHeader user={user} profile={profile} />
      <AppSidebar user={user} profile={profile} onLogout={onLogout} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 sm:pb-28 md:pb-8 lg:pb-8 max-w-6xl mx-auto w-full">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
