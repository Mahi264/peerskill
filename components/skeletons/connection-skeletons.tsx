import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ConnectionsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <span className="sr-only">Loading campus connections...</span>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5 flex flex-col justify-between gap-4 border-[color:var(--color-border)] shadow-xs">
          <div className="flex items-start gap-3.5">
            <Skeleton className="size-12 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
              <div className="flex items-center gap-1.5 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[color:var(--color-border)]/40">
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}
