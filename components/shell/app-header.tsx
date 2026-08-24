import * as React from "react";
import Link from "next/link";
import { MessageSquare, Search, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";

export interface AppHeaderProps {
  user?: {
    email: string;
    status: string;
  } | null;
  profile?: {
    fullName: string;
    avatarUrl?: string | null;
  } | null;
}

export function AppHeader({ user, profile }: AppHeaderProps) {
  const displayName = profile?.fullName || user?.email?.split("@")[0] || "Student";

  return (
    <header className="flex md:hidden h-14 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 sticky top-0 z-30 gap-3">
      <Link href="/home" className="flex items-center gap-2 shrink-0">
        <div className="flex size-7 items-center justify-center rounded-lg bg-[color:var(--color-primary)] text-white font-bold text-sm">
          P
        </div>
        <span className="text-base font-bold tracking-tight text-[color:var(--color-text)]">
          PeerSkill
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/search"
          className="flex size-9 items-center justify-center rounded-lg text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)] transition-colors"
          aria-label="Open search"
        >
          <Search className="size-5" />
        </Link>

        <Link
          href="/connections"
          className="flex size-9 items-center justify-center rounded-lg text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)] transition-colors"
          aria-label="Connections"
        >
          <Users className="size-5" />
        </Link>

        <Link
          href="/messages"
          className="flex size-9 items-center justify-center rounded-lg text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)] transition-colors"
          aria-label="Messages"
        >
          <MessageSquare className="size-5" />
        </Link>

        <Link href="/profile">
          <Avatar name={displayName} src={profile?.avatarUrl} size="sm" />
        </Link>
      </div>
    </header>
  );
}
