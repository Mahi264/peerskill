import * as React from "react";

import { normalizeMitsDisplayName } from "@/lib/mits-email";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.ComponentProps<"div"> {
  name: string;
  department?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Computes canonical initials from a student's full name.
 * Automatically normalizes any institutional roll prefix first.
 * Examples:
 * - "MOHIT SHARMA" -> "MS"
 * - "BTCS24O1080 MOHIT SHARMA" -> "MS"
 * - "MAHI GUPTA" -> "MG"
 * - "MITI DUBEY" -> "MD"
 * - "Mohit" -> "MO"
 */
export function getAvatarInitials(name: string): string {
  if (!name) return "PS";
  const normalized = normalizeMitsDisplayName(name).trim();
  if (!normalized) return "PS";

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PS";

  if (parts.length === 1) {
    const single = parts[0];
    return single.length >= 2 ? single.substring(0, 2).toUpperCase() : single.toUpperCase();
  }

  const firstInitial = parts[0][0];
  const lastInitial = parts[parts.length - 1][0];
  return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Validates if an avatar URL is a valid PeerSkill custom profile photo.
 * Google Workspace generated character/default avatars (e.g. googleusercontent.com)
 * are excluded per product specification to prevent inconsistent 'B' icons.
 */
export function isValidCustomAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (!clean) return false;

  // Exclude Google Workspace generated character / default avatar URLs
  if (clean.includes("googleusercontent.com") || clean.includes("google.com")) {
    return false;
  }

  return true;
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
  const initials = getAvatarInitials(name);
  const ringColor = getDepartmentRingColor(department);
  const hasCustomPhoto = isValidCustomAvatarUrl(src);

  if (hasCustomPhoto) {
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
        <img src={src!} alt={name} className="size-full object-cover" />
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
