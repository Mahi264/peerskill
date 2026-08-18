"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, HelpCircle, Layers, MessageSquare, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/components/ui/toast";

interface UserSkill {
  id: string;
  name: string;
  slug: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";
}

interface Profile {
  fullName: string;
  department: string;
  branch?: string | null;
  graduationYear?: number | null;
  section?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  helpAvailable: boolean;
  helpStatus?: string | null;
  contactVisibility: string;
  chatRequestVisibility: string;
}

interface User {
  id: string;
  email: string;
  status: string;
  role: string;
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [skills, setSkills] = React.useState<UserSkill[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [togglingAvailability, setTogglingAvailability] = React.useState(false);

  // Load session & user data
  React.useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const json = await res.json();
        const u = json?.data?.user;

        if (u?.status === "PENDING") {
          router.replace("/onboarding");
          return;
        }

        setUser(u);
        setProfile(u?.profile || null);
        setSkills(u?.userSkills || []);
      } catch {
        setErrorMsg("Failed to load campus dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
    }
  };

  const handleToggleAvailability = async (checked: boolean) => {
    if (!profile) return;

    setTogglingAvailability(true);
    const prevAvailable = profile.helpAvailable;

    // Optimistic UI update
    setProfile((prev) => (prev ? { ...prev, helpAvailable: checked } : null));

    try {
      const res = await fetch("/api/profiles/me/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpAvailable: checked }),
      });

      if (!res.ok) {
        // Revert on error
        setProfile((prev) => (prev ? { ...prev, helpAvailable: prevAvailable } : null));
      }
    } catch {
      setProfile((prev) => (prev ? { ...prev, helpAvailable: prevAvailable } : null));
    } finally {
      setTogglingAvailability(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading campus dashboard...</span>
        </div>
      </main>
    );
  }

  if (user?.status === "SUSPENDED") {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6 text-[color:var(--color-text)]">
        <Card className="max-w-md w-full border-[color:var(--color-danger)]/30 p-8 text-center space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-[color:var(--color-danger)]">Account Suspended</h1>
          <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">
            Your account has been suspended by campus moderation. You cannot access PeerSkill until your account is reinstated.
          </p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Log Out
          </Button>
        </Card>
      </main>
    );
  }

  const displayName = profile?.fullName || user?.email.split("@")[0] || "Student";

  return (
    <AppShell user={user} profile={profile} onLogout={handleLogout}>
      <div className="space-y-8">
        {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

        {/* Greeting Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--color-border)]/60 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[color:var(--color-text)]">
                Welcome back, {displayName}
              </h1>
              <Badge variant="success" className="text-xs">
                ACTIVE
              </Badge>
            </div>
            <p className="text-sm text-[color:var(--color-text-muted)]">
              {profile?.department || "Campus Member"}{" "}
              {profile?.graduationYear ? `• Class of ${profile.graduationYear}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/profile">Edit Profile</Link>
            </Button>
          </div>
        </div>

        {/* 2-Column Grid: Profile Summary & Focus CTA */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Identity & Availability Summary Card */}
          <Card className="space-y-6">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2 border-b border-[color:var(--color-border)]/60">
              <div className="flex items-center gap-3">
                <Avatar name={displayName} department={profile?.department} src={profile?.avatarUrl} size="lg" />
                <div>
                  <CardTitle className="text-lg">{displayName}</CardTitle>
                  <CardDescription>
                    {profile?.department || "Department Not Set"}
                  </CardDescription>
                </div>
              </div>

              <Badge variant="primary" className="text-xs">
                Verified Member
              </Badge>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* Bio */}
              {profile?.bio && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)] mb-1">
                    Bio
                  </p>
                  <p className="text-sm text-[color:var(--color-text)] leading-relaxed italic">
                    &quot;{profile.bio}&quot;
                  </p>
                </div>
              )}

              {/* Declared Skills List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                    Indexed Skills ({skills.length})
                  </span>
                  <Link href="/profile" className="text-xs font-medium text-[color:var(--color-primary)] hover:underline">
                    Manage
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skills.length === 0 ? (
                    <span className="text-xs text-[color:var(--color-text-muted)]">
                      No skills indexed yet.
                    </span>
                  ) : (
                    skills.map((s) => (
                      <Badge key={s.id || s.name} variant="skill" className="text-xs py-1 px-3">
                        <span>{s.name}</span>
                        <span className="ml-1 text-[10px] uppercase font-bold opacity-75">
                          • {s.level}
                        </span>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Help Availability Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/50 p-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[color:var(--color-text)]">
                    Available to Help Peers
                  </p>
                  <p className="text-xs text-[color:var(--color-text-muted)]">
                    {profile?.helpAvailable
                      ? "You appear in peer mentor suggestions."
                      : "You are currently marked as unavailable."}
                  </p>
                  {profile?.helpStatus && (
                    <p className="text-xs font-medium text-[color:var(--color-primary)] mt-1">
                      Status: &quot;{profile.helpStatus}&quot;
                    </p>
                  )}
                </div>
                <Switch
                  checked={profile?.helpAvailable ?? true}
                  onCheckedChange={handleToggleAvailability}
                  disabled={togglingAvailability}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ask a Doubt Module Card */}
          <Card className="bg-gradient-to-br from-[color:var(--color-primary)]/5 via-white to-white border-[color:var(--color-primary)]/20 shadow-sm space-y-4">
            <CardHeader className="pb-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)] text-white mb-2">
                <HelpCircle className="size-5" />
              </div>
              <CardTitle className="text-xl">Stuck on Coursework?</CardTitle>
              <CardDescription>
                Ask a doubt to find peers in your college who understand your courses and assignments.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3.5 space-y-2 text-xs text-[color:var(--color-text-muted)]">
                <div className="flex items-center gap-1.5 text-[color:var(--color-primary)] font-semibold">
                  <ShieldCheck className="size-4" />
                  Campus-Only Network
                </div>
                <p>
                  Doubts are visible only to verified students in your institution.
                </p>
              </div>

              <Button className="w-full h-11 text-base font-semibold">
                <span className="flex items-center gap-2">
                  Ask a Doubt
                  <ArrowRight className="size-4" />
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Incoming Loop Surfaces (Phase 2 Containers) */}
        <section className="space-y-4 pt-4 border-t border-[color:var(--color-border)]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-[color:var(--color-primary)]" />
              <h2 className="text-xl font-bold tracking-tight text-[color:var(--color-text)]">
                Campus Doubts Feed
              </h2>
            </div>
            <Badge variant="outline">Phase 2 Container</Badge>
          </div>

          <Card className="p-8 text-center space-y-3 bg-[color:var(--color-surface-muted)]/30 border-dashed">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white border border-[color:var(--color-border)] text-[color:var(--color-text-muted)]">
              <MessageSquare className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-[color:var(--color-text)]">
              No Open Doubts Yet
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] max-w-md mx-auto">
              Your profile is verified and active! The Q&A doubt loop functionality will unlock in Phase 2.
            </p>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
