import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-tactile active:scale-[0.98] active:translate-y-[0.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--color-primary)] !text-white text-white hover:bg-[color:var(--color-primary-hover)] [&_*]:!text-white shadow-xs",
        outline:
          "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] hover:border-[color:var(--color-primary)]/40 shadow-xs",
        ghost:
          "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]",
        danger:
          "bg-[color:var(--color-danger)] !text-white text-white hover:bg-[color:var(--color-danger)]/90 [&_*]:!text-white shadow-xs",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base font-semibold",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
