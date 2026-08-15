import Link from "next/link";
import {
  ArrowRight,
  Database,
  LayoutPanelLeft,
  ShieldCheck,
  TestTube2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFoundationAreas } from "@/lib/foundation";

const iconMap = {
  app: LayoutPanelLeft,
  data: Database,
  safety: ShieldCheck,
  quality: TestTube2,
} as const;

export default function Home() {
  const foundationAreas = getFoundationAreas();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(246,183,60,0.18),_transparent_24%),linear-gradient(180deg,_var(--color-bg)_0%,_#ffffff_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-8 lg:px-10">
        <section className="grid gap-10 rounded-[28px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 p-8 shadow-[0_24px_60px_rgba(23,32,29,0.08)] lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-3 py-1 text-sm font-medium text-[color:var(--color-primary)]">
              <span className="h-2 w-2 rounded-full bg-[color:var(--color-success)]" />
              Phase 0 only
            </div>
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                PeerSkill
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-5xl">
                Engineering foundation for a calm, local-first campus help app.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[color:var(--color-text-muted)] sm:text-lg">
                This starter establishes the documented Phase 0 baseline: a single Next.js
                application, Tailwind and shadcn/ui foundations, Prisma with SQLite, typed
                environment loading, reusable structure, and basic verification tooling.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/api/health">
                  Open health route
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
                  Next.js docs
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/70">
            <CardHeader>
              <CardTitle>Phase 0 checklist</CardTitle>
              <CardDescription>
                Foundation only. No authentication, profiles, doubts, messaging, or reputation
                flows are implemented yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[color:var(--color-text-muted)]">
              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3">
                <span>App Router structure</span>
                <span className="font-medium text-[color:var(--color-primary)]">Ready</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3">
                <span>Prisma + SQLite</span>
                <span className="font-medium text-[color:var(--color-primary)]">Ready</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3">
                <span>Testing foundation</span>
                <span className="font-medium text-[color:var(--color-primary)]">Ready</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3">
                <span>Error handling</span>
                <span className="font-medium text-[color:var(--color-primary)]">Ready</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          {foundationAreas.map((area) => {
            const Icon = iconMap[area.icon];

            return (
              <Card key={area.title} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[color:var(--color-surface-muted)] text-[color:var(--color-primary)]">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <CardTitle>{area.title}</CardTitle>
                      <CardDescription>{area.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-[color:var(--color-text-muted)]">
                    {area.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}
