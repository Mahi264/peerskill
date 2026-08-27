import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DoubtDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="max-w-4xl mx-auto space-y-6"
    >
      <span className="sr-only">Loading doubt discussion and answers...</span>

      {/* Back Link Skeleton */}
      <Skeleton className="h-4 w-32 rounded-md" />

      {/* Main Doubt Card Skeleton */}
      <Card className="p-6 sm:p-8 space-y-6 border-[color:var(--color-border)] shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[color:var(--color-border)]/60 pb-5">
          <div className="flex items-center gap-3.5">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        {/* Title & Body */}
        <div className="space-y-3">
          <Skeleton className="h-7 w-4/5 rounded-md" />
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* Skill tags */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[color:var(--color-border)]/40">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </Card>

      {/* Answers Section Header Skeleton */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>

      {/* Answer Cards Skeletons */}
      <div className="space-y-4">
        {[1, 2].map((n) => (
          <Card key={n} className="p-6 space-y-4 border-[color:var(--color-border)] shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-3 w-16" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
