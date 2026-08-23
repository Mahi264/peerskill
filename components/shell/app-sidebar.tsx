import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Search, User } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AppSidebarProps {
  user?: {
    email: string;
    status: string;
  } | null;
  profile?: {
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  onLogout?: () => void;
}

export function AppSidebar({ user, profile, onLogout }: AppSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/home", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const displayName = profile?.fullName || user?.email?.split("@")[0] || "Student";

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col justify-between border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 sticky top-0 shrink-0">
      <div className="space-y-6">
        {/* Brand Logo & Wordmark */}
        <Link href="/home" className="flex items-center gap-2.5 px-2 py-1">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[color:var(--color-primary)] text-white font-bold text-lg shadow-sm">
            P
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-[color:var(--color-text)]">
              PeerSkill
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-primary)]">
              Campus Graph
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[color:var(--color-primary)] text-white shadow-sm"
                    : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Identity Pill & Logout */}
      <div className="space-y-3 pt-4 border-t border-[color:var(--color-border)]">
        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar name={displayName} src={profile?.avatarUrl} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[color:var(--color-text)] truncate">
              {displayName}
            </p>
            <p className="text-xs text-[color:var(--color-text-muted)] truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>

        {onLogout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-[color:var(--color-text-muted)] hover:text-[color:var(--color-danger)]"
          >
            <LogOut className="size-4" />
            <span>Log out</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
