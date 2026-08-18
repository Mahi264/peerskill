import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AlertBannerProps extends React.ComponentProps<"div"> {
  variant?: "error" | "success" | "info";
  title?: string;
  message: string;
}

export function AlertBanner({
  variant = "error",
  title,
  message,
  className,
  ...props
}: AlertBannerProps) {
  const Icon = variant === "error" ? AlertCircle : variant === "success" ? CheckCircle2 : Info;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-sm)] p-3.5 text-sm font-medium transition-all animate-in fade-in slide-in-from-top-1 duration-180",
        variant === "error" &&
          "border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]",
        variant === "success" &&
          "border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]",
        variant === "info" &&
          "border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]",
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className="leading-5">{message}</p>
      </div>
    </div>
  );
}
