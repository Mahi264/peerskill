import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg)] px-6">
      <div className="w-full max-w-lg rounded-[28px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 shadow-[0_24px_60px_rgba(23,32,29,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
          Not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[color:var(--color-text)]">
          That route does not exist yet.
        </h1>
        <p className="mt-4 text-base leading-7 text-[color:var(--color-text-muted)]">
          PeerSkill is still in Phase 0, so only the engineering foundation is available right now.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </main>
  );
}
