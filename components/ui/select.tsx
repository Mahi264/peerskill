import * as React from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends React.ComponentProps<"select"> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full items-center rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-sm text-[color:var(--color-text)] leading-normal transition-all focus-visible:border-[color:var(--color-primary)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color:var(--color-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          error && "border-[color:var(--color-danger)] focus-visible:border-[color:var(--color-danger)] focus-visible:ring-[color:var(--color-danger)]/15",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";

export { Select };
