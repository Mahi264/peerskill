import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export function Skeleton({
  className,
  shimmer = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-[var(--radius-sm)] bg-[color:var(--color-surface-muted)]",
        shimmer && "skeleton-shimmer",
        className,
      )}
      {...props}
    />
  );
}
