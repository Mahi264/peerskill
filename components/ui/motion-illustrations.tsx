import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 1. Accepted Answer Checkmark SVG (Approved Whimsical Delight Moment #1)
 * Plays a smooth single-draw checkmark path animation inside a subtle green success seal.
 */
export function AcceptedCheckmarkSVG({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 text-[color:var(--color-success)] shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        className="stroke-[color:var(--color-success)]/20 fill-[color:var(--color-success)]/10"
        strokeWidth="1.5"
      />
      <path
        d="M7.5 12.25L10.5 15.25L16.5 8.75"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-checkmark"
      />
    </svg>
  );
}

/**
 * 2. Onboarding Campus Node Connection SVG (Approved Whimsical Delight Moment #2)
 * Demonstrates the student's profile node connecting to the campus skill graph.
 */
export function OnboardingNodeConnectionSVG({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-full max-w-[280px] h-20 mx-auto overflow-visible", className)}
      viewBox="0 0 280 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background connector track */}
      <path
        d="M 40 40 C 100 10, 180 70, 240 40"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* Animated active connection beam */}
      <path
        d="M 40 40 C 100 10, 180 70, 240 40"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="animate-path-draw"
      />

      {/* Node 1: Student Identity */}
      <circle
        cx="40"
        cy="40"
        r="16"
        fill="var(--color-surface)"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      <circle cx="40" cy="40" r="6" fill="var(--color-primary)" className="animate-node-pulse" />

      {/* Node 2: Campus Network */}
      <circle
        cx="240"
        cy="40"
        r="16"
        fill="var(--color-surface)"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />
      <circle cx="240" cy="40" r="6" fill="var(--color-accent)" className="animate-node-pulse" />
    </svg>
  );
}

/**
 * 3. Search Radar Empty State SVG (Approved Whimsical Delight Moment #3)
 * Minimalist campus network radar displaying active search across departments.
 */
export function SearchRadarEmptyStateSVG({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-20 mx-auto text-[color:var(--color-primary)]", className)}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer grid circles */}
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" strokeOpacity="0.12" />
      <circle cx="40" cy="40" r="24" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.2" />
      <circle
        cx="40"
        cy="40"
        r="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        className="animate-node-pulse"
      />

      {/* Grid crosshairs */}
      <line x1="4" y1="40" x2="76" y2="40" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
      <line x1="40" y1="4" x2="40" y2="76" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />

      {/* Center focal beacon */}
      <circle cx="40" cy="40" r="5" fill="currentColor" />
      <circle cx="40" cy="40" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
    </svg>
  );
}
