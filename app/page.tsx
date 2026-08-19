"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, Network, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertBanner } from "@/components/ui/toast";

function SignInContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  let errorMsg: string | null = null;
  if (errorCode === "INVALID_COLLEGE_DOMAIN") {
    errorMsg = "Only official MITS Gwalior student accounts using @mitsgwl.ac.in are allowed.";
  } else if (errorCode === "INVALID_NONCE") {
    errorMsg = "Authentication security validation failed. Please try signing in again.";
  } else if (errorCode) {
    errorMsg = "Authentication failed. Please try signing in with your MITS Google account again.";
  }

  return (
    <Card className="w-full max-w-[420px] bg-white border-[color:var(--color-border)] shadow-[var(--shadow-md)] rounded-[var(--radius-lg)]">
      <CardHeader className="text-center space-y-1.5 pb-2">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mb-1">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-[#17201D]">
          Sign in to PeerSkill
        </CardTitle>
        <CardDescription className="text-sm text-[color:var(--color-text-muted)]">
          Sign up with your official MITS student Google account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

        <div className="space-y-4">
          <a
            href="/api/auth/google"
            className="w-full h-12 px-4 rounded-[var(--radius-md)] bg-white hover:bg-[color:var(--color-surface-muted)] text-[#17201D] font-semibold text-base border border-[#DCE3DF] shadow-sm flex items-center justify-center gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 no-underline cursor-pointer"
            role="link"
          >
            <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-[#17201D] font-semibold">Sign in with Google</span>
          </a>

          <p className="text-center text-xs text-[color:var(--color-text-muted)]">
            Use your <strong className="font-semibold text-[color:var(--color-text)]">@mitsgwl.ac.in</strong> Google account.
          </p>
        </div>

        <div className="pt-2 text-center text-xs text-[color:var(--color-text-muted)] border-t border-[color:var(--color-border)]/60">
          Only official MITS Gwalior student accounts are permitted.
        </div>
      </CardContent>
    </Card>
  );
}

export default function RootSignInPage() {
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
        // Ignore network error on sign-in landing
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
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] flex flex-col justify-between">
      {/* Top Institutional Header */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-6 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[color:var(--color-primary)] text-white font-bold text-lg shadow-sm">
            P
          </div>
          <span className="text-xl font-bold tracking-tight text-[color:var(--color-text)]">
            PeerSkill
          </span>
        </Link>

        <span className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--color-primary)] shadow-sm">
          MITS Gwalior Network
        </span>
      </header>

      {/* Main Minimal Two-Column Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 sm:py-12 flex items-center">
        <div className="w-full grid gap-12 lg:grid-cols-12 items-center">
          {/* Left Column: Intro & Institutional Capabilities */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-white px-3.5 py-1 text-xs font-semibold text-[color:var(--color-primary)] shadow-sm">
                <ShieldCheck className="size-4 text-[color:var(--color-success)]" />
                Single-College Skill & Doubt Network
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[color:var(--color-text)] leading-[1.15]">
                Your campus, <span className="text-[color:var(--color-primary)]">searchable.</span>
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-[color:var(--color-text-muted)] max-w-xl">
                PeerSkill is the private skill-sharing and doubt-solving network for MITS students.
                Ask peers, exchange course expertise, and reuse verified solutions across departments.
              </p>
            </div>

            {/* 3 Concise Value Items */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mt-0.5">
                  <HelpCircle className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[color:var(--color-text)]">
                    1. Ask campus doubts
                  </h2>
                  <p className="text-xs text-[color:var(--color-text-muted)] leading-normal">
                    Get unstuck on coursework, lab assignments, and exam preparation from classmates.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mt-0.5">
                  <Users className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[color:var(--color-text)]">
                    2. Find peers by skill
                  </h2>
                  <p className="text-xs text-[color:var(--color-text-muted)] leading-normal">
                    Index your skills and connect with peers who excel in specific languages and tools.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mt-0.5">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[color:var(--color-text)]">
                    3. Reuse solved campus knowledge
                  </h2>
                  <p className="text-xs text-[color:var(--color-text-muted)] leading-normal">
                    Access accepted peer answers backed by skill-specific reputation points.
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle Skill Node Motif */}
            <div className="hidden sm:flex items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text-muted)] shadow-sm">
                <Network className="size-3.5 text-[color:var(--color-primary)]" />
                <span>Verified Peer Skill Graph</span>
              </div>
              <div className="h-px w-12 bg-[color:var(--color-border)]" />
              <span className="text-xs text-[color:var(--color-text-muted)]">
                Restricted to @mitsgwl.ac.in
              </span>
            </div>
          </div>

          {/* Right Column: Institutional Sign-In Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <React.Suspense fallback={<div className="text-center p-4 text-sm">Loading...</div>}>
              <SignInContent />
            </React.Suspense>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[color:var(--color-border)]/70 py-6 text-center text-xs text-[color:var(--color-text-muted)]">
        <p>PeerSkill • Institutional Skill & Doubt Network for MITS Gwalior</p>
      </footer>
    </div>
  );
}
