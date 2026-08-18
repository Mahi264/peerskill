import * as React from "react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";

export interface AppHeaderProps {
  user?: {
    email: string;
    status: string;
  } | null;
  profile?: {
    fullName: string;
    department: string;
    avatarUrl?: string | null;
  } | null;
}

export function AppHeader({ user, profile }: AppHeaderProps) {
  const displayName = profile?.fullName || user?.email?.split("@")[0] || "Student";
  const department = profile?.department || null;

  return (
    <header className="flex md:hidden h-14 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 sticky top-0 z-30">
      <Link href="/home" className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-[color:var(--color-primary)] text-white font-bold text-sm">
          P
        </div>
        <span className="text-base font-bold tracking-tight text-[color:var(--color-text)]">
          PeerSkill
        </span>
      </Link>

      <Link href="/profile">
        <Avatar name={displayName} department={department} src={profile?.avatarUrl} size="sm" />
      </Link>
    </header>
  );
}
