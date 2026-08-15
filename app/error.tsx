"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg)] px-6">
      <div className="w-full max-w-lg rounded-[28px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 shadow-[0_24px_60px_rgba(23,32,29,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-danger)]">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[color:var(--color-text)]">
          The foundation hit an unexpected error.
        </h1>
        <p className="mt-4 text-base leading-7 text-[color:var(--color-text-muted)]">
          This is the Phase 0 error boundary. Once feature work starts, route-level recovery can
          build on this same pattern.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
