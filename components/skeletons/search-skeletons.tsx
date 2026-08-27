import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KnowledgeSearchSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-4"
    >
      <span className="sr-only">Searching campus doubts...</span>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-6 space-y-4 border-[color:var(--color-border)] shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-5 w-4/5 rounded-md" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--color-border)]/40">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PeerSearchSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <span className="sr-only">Searching campus peers...</span>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5 space-y-4 border-[color:var(--color-border)] shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          </div>

          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--color-border)]/40">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}
