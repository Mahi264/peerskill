import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function InboxListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-3"
    >
      <span className="sr-only">Loading conversations inbox...</span>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 sm:p-5 border-[color:var(--color-border)] shadow-xs flex items-start gap-4">
          <Skeleton className="size-11 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3.5 w-3/4 pt-1" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ConversationDetailSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]"
    >
      <span className="sr-only">Loading conversation messages...</span>

      {/* Conversation Header Skeleton */}
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 rounded-t-[var(--radius-md)]">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="space-y-1.5 min-w-0">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full shrink-0" />
      </div>

      {/* Message Thread Area Skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[color:var(--color-bg)] border-x border-[color:var(--color-border)]/60">
        {/* Incoming Bubble */}
        <div className="flex flex-col items-start space-y-1">
          <Skeleton className="w-64 h-12 rounded-2xl rounded-bl-xs border border-[color:var(--color-border)]" />
          <Skeleton className="h-2.5 w-12 ml-1" />
        </div>

        {/* Outgoing Bubble */}
        <div className="flex flex-col items-end space-y-1">
          <Skeleton className="w-56 h-10 rounded-2xl rounded-br-xs bg-[color:var(--color-primary)]/15" />
          <Skeleton className="h-2.5 w-12 mr-1" />
        </div>

        {/* Incoming Bubble */}
        <div className="flex flex-col items-start space-y-1">
          <Skeleton className="w-72 h-16 rounded-2xl rounded-bl-xs border border-[color:var(--color-border)]" />
          <Skeleton className="h-2.5 w-12 ml-1" />
        </div>

        {/* Outgoing Bubble */}
        <div className="flex flex-col items-end space-y-1">
          <Skeleton className="w-48 h-10 rounded-2xl rounded-br-xs bg-[color:var(--color-primary)]/15" />
          <Skeleton className="h-2.5 w-12 mr-1" />
        </div>
      </div>

      {/* Message Composer Skeleton */}
      <div className="p-3 bg-[color:var(--color-bg)] border-x border-b border-[color:var(--color-border)]/60 rounded-b-[var(--radius-md)]">
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5 space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="border-t border-[color:var(--color-border)]/40 pt-2.5 flex items-center justify-between">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
