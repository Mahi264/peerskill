import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminOverviewSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-8"
    >
      <span className="sr-only">Loading platform overview metrics...</span>

      {/* Student Community Roster Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4.5 rounded-md" />
          <Skeleton className="h-5 w-48 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-5 space-y-3 border-[color:var(--color-border)] shadow-xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="size-4 rounded-md" />
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Academic Problem Solving Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4.5 rounded-md" />
          <Skeleton className="h-5 w-52 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="p-5 space-y-3 border-[color:var(--color-border)] shadow-xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="size-4 rounded-md" />
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Peer Connectivity & Skills Taxonomy Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4.5 rounded-md" />
          <Skeleton className="h-5 w-56 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-5 space-y-3 border-[color:var(--color-border)] shadow-xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="size-4 rounded-md" />
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-3.5 w-14" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminStudentsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-3"
    >
      <span className="sr-only">Loading student roster...</span>
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[color:var(--color-border)] shadow-xs"
        >
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4.5 w-36 rounded-md" />
                <Skeleton className="h-5 w-18 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-56" />
            </div>
          </div>

          {/* Right: Registration Date */}
          <Skeleton className="h-3.5 w-32 shrink-0" />
        </Card>
      ))}
    </div>
  );
}

export function AdminSkillsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <span className="sr-only">Loading predefined skills taxonomy...</span>
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="p-4 flex flex-col justify-between gap-4 border-[color:var(--color-border)] shadow-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="size-7 rounded-md shrink-0" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[color:var(--color-border)]/40">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function AdminSettingsSkeleton() {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="p-6 space-y-5 border-[color:var(--color-border)] shadow-xs"
    >
      <span className="sr-only">Loading platform settings...</span>

      {/* Field 1 */}
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-3 w-72" />
      </div>

      {/* Field 2 */}
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-3 w-80" />
      </div>

      {/* Field 3 */}
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-3 w-64" />
      </div>

      {/* Feature Flag Switch */}
      <div className="pt-2 border-t border-[color:var(--color-border)] flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>

      {/* Action Button */}
      <div className="pt-3 flex justify-end">
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </Card>
  );
}

export function AdminOwnershipSkeleton() {
  return (
    <Card
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="p-6 space-y-4 border-[color:var(--color-border)] shadow-xs"
    >
      <span className="sr-only">Loading platform owner information...</span>

      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-44" />
        <Skeleton className="h-6 w-36 rounded-full" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-1">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-3.5 w-32 shrink-0" />
      </div>
    </Card>
  );
}
