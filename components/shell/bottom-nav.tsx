import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User } from "lucide-react";

import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/home", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] z-30 px-6 justify-around items-center shadow-[0_-4px_12px_rgba(23,32,29,0.04)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 text-xs font-medium transition-colors py-1 px-4 rounded-lg",
              isActive
                ? "text-[color:var(--color-primary)] font-semibold"
                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
            )}
          >
            <Icon className={cn("size-5", isActive && "stroke-[2.5px]")} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
