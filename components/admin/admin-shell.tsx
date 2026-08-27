"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  Sliders,
  Tags,
  Users,
  X,
} from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { clearAdminCache } from "@/lib/admin-data-cache";
import { cn } from "@/lib/utils";

export interface AdminShellProps {
  children?: React.ReactNode;
  initialAdmin?: {
    id: string;
    email: string;
    displayName: string;
  } | null;
}

export function AdminShell({ children, initialAdmin }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [admin, setAdmin] = React.useState<{
    id: string;
    email: string;
    displayName: string;
  } | null>(initialAdmin || null);
  const [loading, setLoading] = React.useState(!initialAdmin);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialAdmin) return;

    let ignore = false;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/?error=UNAUTHENTICATED");
          return;
        }

        const json = await res.json();
        if (json?.data?.principalType === "STUDENT") {
          // Students cannot access admin routes
          router.replace("/home");
          return;
        }

        if (json?.data?.principalType === "ADMIN" && json?.data?.admin) {
          if (!ignore) {
            setAdmin(json.data.admin);
            setLoading(false);
          }
        } else {
          router.replace("/?error=UNAUTHENTICATED");
        }
      } catch {
        router.replace("/?error=AUTH_ERROR");
      }
    }

    checkAuth();

    return () => {
      ignore = true;
    };
  }, [initialAdmin, router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearAdminCache();
      router.push("/");
    }
  }

  const navItems = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
    { name: "Students", href: "/admin/students", icon: Users },
    { name: "Skills", href: "/admin/skills", icon: Tags },
    { name: "Settings", href: "/admin/settings", icon: Sliders },
    { name: "Ownership", href: "/admin/ownership", icon: ShieldAlert },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-[color:var(--color-primary)] border-t-transparent" />
          <p className="text-sm font-medium text-[color:var(--color-text-muted)]">
            Authenticating platform administrator...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="flex md:hidden h-14 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-sm">
            P
          </div>
          <span className="text-base font-bold tracking-tight text-[color:var(--color-text)]">
            PeerSkill
          </span>
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Admin
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)]"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 space-y-3 z-30">
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
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[color:var(--color-primary)] text-white font-semibold"
                      : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-muted)]",
                  )}
                >
                  <Icon className="size-4.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[color:var(--color-border)] pt-3 flex items-center justify-between">
            <span className="text-xs text-[color:var(--color-text-muted)] truncate">
              {admin?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 border-[color:var(--color-border)]"
            >
              <LogOut className="size-3.5 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <AdminSidebar admin={admin} onLogout={handleLogout} />

      {/* Main Administrative Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
