import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] transition-all focus-visible:border-[color:var(--color-primary)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color:var(--color-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[color:var(--color-danger)] focus-visible:border-[color:var(--color-danger)] focus-visible:ring-[color:var(--color-danger)]/15",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
