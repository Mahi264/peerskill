import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] transition-all focus-visible:border-[color:var(--color-primary)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[color:var(--color-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          error && "border-[color:var(--color-danger)] focus-visible:border-[color:var(--color-danger)] focus-visible:ring-[color:var(--color-danger)]/15",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
