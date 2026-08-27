import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicProfileSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="max-w-4xl mx-auto space-y-6"
    >
      <span className="sr-only">Loading campus peer profile...</span>

      {/* Back Link Skeleton */}
      <Skeleton className="h-4 w-32 rounded-md" />

      {/* Profile Hero Card Skeleton */}
      <Card className="p-6 sm:p-8 space-y-6 border-[color:var(--color-border)] shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <Skeleton className="size-20 sm:size-24 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-7 w-52 mx-auto sm:mx-0 rounded-md" />
            <Skeleton className="h-4 w-64 mx-auto sm:mx-0" />
            <div className="pt-2 space-y-1.5 max-w-lg mx-auto sm:mx-0">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
          <Skeleton className="h-9 w-36 rounded-lg shrink-0" />
        </div>
      </Card>

      {/* Skills Grid Card Skeleton */}
      <Card className="p-6 space-y-4 border-[color:var(--color-border)] shadow-xs">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/50 flex items-center justify-between"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </Card>

      {/* Contributions & Stats Skeleton */}
      <Card className="p-6 space-y-4 border-[color:var(--color-border)] shadow-xs">
        <Skeleton className="h-5 w-44 rounded-md" />
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-[color:var(--color-surface-muted)]/40 border border-[color:var(--color-border)]/60 space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-12 rounded-md" />
          </div>
          <div className="p-4 rounded-xl bg-[color:var(--color-surface-muted)]/40 border border-[color:var(--color-border)]/60 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-12 rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  );
}
