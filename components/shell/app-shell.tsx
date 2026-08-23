import * as React from "react";

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
  user,
  profile,
  onLogout,
  showNav = true,
}: AppShellProps) {
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
