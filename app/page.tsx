"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    async function checkExistingSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          const user = json?.data?.user;
          if (user?.status === "PENDING") {
            router.replace("/onboarding");
            return;
          }
          if (user?.status === "ACTIVE") {
            router.replace("/home");
            return;
          }
        }
      } catch {
        // Ignore network error on public landing
      } finally {
        setCheckingAuth(false);
      }
    }

    checkExistingSession();
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Verifying campus access...</span>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] flex flex-col">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)] text-white font-bold text-xl shadow-sm">
            P
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[color:var(--color-text)]">
              PeerSkill
            </span>
            <span className="hidden sm:inline-block ml-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--color-primary)]">
              Your Campus Network
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">
              Sign up
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 lg:py-20 flex flex-col gap-16">
        <section className="grid gap-12 lg:grid-cols-[1.3fr_0.9fr] items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3.5 py-1 text-xs font-semibold text-[color:var(--color-primary)] shadow-sm">
              <ShieldCheck className="size-4 text-[color:var(--color-success)]" />
              Verified Single-College Skill Graph
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[color:var(--color-text)] leading-[1.1]">
                Find the skill next door.
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed text-[color:var(--color-text-muted)] max-w-2xl">
                Your campus, searchable. Ask peers, build skills, and get unstuck on coursework
                without feeling awkward.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button asChild size="lg">
                <Link href="/register">
                  Get Started with College Email
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Already registered? Log in</Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs font-medium text-[color:var(--color-text-muted)] border-t border-[color:var(--color-border)]/60">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[color:var(--color-success)]" />
                College Email Verification
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[color:var(--color-success)]" />
                Skill-Specific Reputation
              </span>
            </div>
          </div>

          {/* Signature Skill Node Visual Preview Card */}
          <Card className="p-8 space-y-6 bg-gradient-to-b from-white to-[color:var(--color-surface-muted)]/50 border-[color:var(--color-border)] relative overflow-hidden">
            <div className="absolute -top-12 -right-12 size-36 rounded-full bg-[color:var(--color-accent)]/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                Skill Match Preview
              </span>
              <span className="rounded-full bg-[color:var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[color:var(--color-primary)]">
                Campus Active
              </span>
            </div>

            {/* Simulated Skill Nodes */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-white p-3.5 shadow-sm">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--color-primary)] text-white font-bold text-xs">
                  AM
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">
                    Aarav Mehta
                  </p>
                  <p className="text-xs text-[color:var(--color-text-muted)]">
                    Computer Science • 3rd Year
                  </p>
                </div>
                <span className="rounded-md border border-[color:var(--color-skill-blue)]/20 bg-[color:var(--color-skill-blue)]/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--color-skill-blue)]">
                  React Mentor
                </span>
              </div>

              {/* Node Connector Line */}
              <div className="flex justify-center my-1">
                <div className="h-6 w-0.5 border-l-2 border-dashed border-[color:var(--color-primary)]/40" />
              </div>

              <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[color:var(--color-text-muted)]">
                  <span className="font-semibold text-[color:var(--color-primary)]">
                    Assignment Stuck
                  </span>
                  <span>Urgent</span>
                </div>
                <p className="text-sm font-medium text-[color:var(--color-text)] leading-snug">
                  &quot;How do I optimize re-renders in nested React component state?&quot;
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* 3 Pillar Feature Cards */}
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="hover:-translate-y-0.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mb-4">
              <Users className="size-5" />
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-2">
              Find Peers by Skill
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">
              Index your skills and find classmates who know the exact tools, languages, and concepts you are working on.
            </p>
          </Card>

          <Card className="hover:-translate-y-0.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mb-4">
              <Sparkles className="size-5" />
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-2">
              Coursework Answers
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">
              Get answers tailored to your college courses, lab assignments, and professor expectations.
            </p>
          </Card>

          <Card className="hover:-translate-y-0.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mb-4">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-2">
              Skill Reputation
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">
              Earn visible skill-specific reputation points whenever your answers are accepted by peers.
            </p>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[color:var(--color-border)] py-8 text-center text-xs text-[color:var(--color-text-muted)]">
        <p>PeerSkill • Verified Single-College Skill Graph</p>
      </footer>
    </div>
  );
}
