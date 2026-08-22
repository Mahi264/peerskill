import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-tactile focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[color:var(--color-surface-muted)] text-[color:var(--color-text)]",
        primary:
          "border border-transparent bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] font-semibold",
        success:
          "border border-transparent bg-[color:var(--color-success)]/10 text-[color:var(--color-success)] font-semibold",
        warning:
          "border border-transparent bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)] font-semibold",
        danger:
          "border border-transparent bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)] font-semibold",
        outline:
          "border border-[color:var(--color-border)] text-[color:var(--color-text-muted)]",
        skill:
          "border border-[color:var(--color-skill-blue)]/20 bg-[color:var(--color-skill-blue)]/10 text-[color:var(--color-skill-blue)] font-medium",
        accent:
          "border border-[color:var(--color-accent)]/30 bg-[color:var(--color-accent)]/15 text-[color:var(--color-text)] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
