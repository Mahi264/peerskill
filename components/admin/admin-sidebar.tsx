import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Sliders,
  Tags,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminSidebarProps {
  admin?: {
    email: string;
    displayName: string;
  } | null;
  onLogout?: () => void;
}

export function AdminSidebar({ admin, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
    { name: "Students", href: "/admin/students", icon: Users },
    { name: "Skills", href: "/admin/skills", icon: Tags },
    { name: "Settings", href: "/admin/settings", icon: Sliders },
    { name: "Ownership", href: "/admin/ownership", icon: ShieldAlert },
  ];

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col justify-between border-r border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 sticky top-0 shrink-0">
      <div className="space-y-6">
        {/* Brand & Admin Badge */}
        <div className="px-2 py-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-lg shadow-sm">
              P
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[color:var(--color-text)]">
                PeerSkill
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Admin
              </span>
            </div>
          </div>
          <p className="text-xs text-[color:var(--color-text-muted)] mt-1.5 pl-0.5">
            Platform Administration
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[color:var(--color-primary)] text-white shadow-sm font-semibold"
                    : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)] hover:text-[color:var(--color-text)]",
                )}
              >
                <Icon className={cn("size-4.5", isActive ? "text-white" : "text-inherit")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Admin User Info & Logout */}
      <div className="border-t border-[color:var(--color-border)] pt-4 space-y-3">
        <div className="px-2">
          <p className="text-sm font-medium text-[color:var(--color-text)] truncate">
            {admin?.displayName || "Platform Administrator"}
          </p>
          <p className="text-xs text-[color:var(--color-text-muted)] truncate">
            {admin?.email || "admin@peerskill"}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-[color:var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-[color:var(--color-border)]"
          onClick={onLogout}
        >
          <LogOut className="size-4 mr-2" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
