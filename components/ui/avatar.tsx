import * as React from "react";

import { cn } from "@/lib/utils";

export interface AvatarProps extends React.ComponentProps<"div"> {
  name: string;
  department?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

function getInitials(name: string): string {
  if (!name) return "PS";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDepartmentRingColor(department?: string | null): string {
  if (!department) return "border-[color:var(--color-primary)]";
  const deptLower = department.toLowerCase();
  if (deptLower.includes("computer") || deptLower.includes("cs") || deptLower.includes("it")) {
    return "border-[color:var(--color-primary)]"; // Deep Teal
  }
  if (deptLower.includes("electric") || deptLower.includes("ee") || deptLower.includes("ece")) {
    return "border-[color:var(--color-skill-blue)]"; // Blue
  }
  if (deptLower.includes("mechanic") || deptLower.includes("me")) {
    return "border-[color:var(--color-accent)]"; // Amber
  }
  if (deptLower.includes("civil") || deptLower.includes("ce")) {
    return "border-[color:var(--color-skill-green)]"; // Green
  }
  return "border-[color:var(--color-primary)]";
}

const sizeClasses = {
  sm: "size-8 text-xs border-2",
  md: "size-10 text-sm border-2",
  lg: "size-14 text-base border-3",
  xl: "size-20 text-xl border-4",
};

export function Avatar({ name, department, src, size = "md", className, ...props }: AvatarProps) {
  const initials = getInitials(name);
  const ringColor = getDepartmentRingColor(department);

  if (src) {
    return (
      <div
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden border bg-[color:var(--color-surface-muted)]",
          ringColor,
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="size-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] font-semibold text-[color:var(--color-primary)] shadow-sm",
        ringColor,
        sizeClasses[size],
        className,
      )}
      aria-label={name}
      {...props}
    >
      <span>{initials}</span>
    </div>
  );
}
