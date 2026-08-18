"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, HelpCircle, Layers, MessageSquare, Plus, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
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

interface Doubt {
  id: string;
  authorId: string;
  title: string;
  body: string;
  urgency: "CURIOUS" | "ASSIGNMENT_STUCK" | "PROJECT_BLOCKED" | "EXAM_PREP";
  status: "OPEN" | "RESOLVED" | "CLOSED";
  answerCount: number;
  acceptedAnswerId?: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    fullName: string;
    department: string;
    avatarUrl?: string | null;
  };
  skills: Array<{ id: string; name: string; slug: string }>;
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [skills, setSkills] = React.useState<UserSkill[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [togglingAvailability, setTogglingAvailability] = React.useState(false);

  // Doubts Feed State
  const [doubts, setDoubts] = React.useState<Doubt[]>([]);
  const [loadingDoubts, setLoadingDoubts] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<string>("ALL");
  const [filterUrgency, setFilterUrgency] = React.useState<string>("ALL");
  const [filterSkill, setFilterSkill] = React.useState<string>("ALL");

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

  // Load Doubts Feed
  React.useEffect(() => {
    let ignore = false;

    async function loadDoubts() {
      if (!user || user.status !== "ACTIVE") return;
      try {
        const params = new URLSearchParams();
        if (filterStatus !== "ALL") params.set("status", filterStatus);
        if (filterUrgency !== "ALL") params.set("urgency", filterUrgency);
        if (filterSkill !== "ALL") params.set("skill", filterSkill);

        const res = await fetch(`/api/doubts?${params.toString()}`);
        if (res.ok && !ignore) {
          const json = await res.json();
          setDoubts(json?.data?.doubts || []);
        }
      } catch {
        // Keep existing feed state on error
      } finally {
        if (!ignore) {
          setLoadingDoubts(false);
        }
      }
    }

    loadDoubts();

    return () => {
      ignore = true;
    };
  }, [user, filterStatus, filterUrgency, filterSkill]);

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

    setProfile((prev) => (prev ? { ...prev, helpAvailable: checked } : null));

    try {
      const res = await fetch("/api/profiles/me/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpAvailable: checked }),
      });

      if (!res.ok) {
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

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "ASSIGNMENT_STUCK":
        return <Badge variant="warning">Assignment Stuck</Badge>;
      case "PROJECT_BLOCKED":
        return <Badge variant="danger">Project Blocked</Badge>;
      case "EXAM_PREP":
        return <Badge variant="accent">Exam Prep</Badge>;
      case "CURIOUS":
      default:
        return <Badge variant="primary">Just Curious</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

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
            <Button asChild size="lg">
              <Link href="/doubts/new">
                <Plus className="size-4 mr-1.5" />
                Ask a Doubt
              </Link>
            </Button>
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

              <Button asChild className="w-full h-11 text-base font-semibold">
                <Link href="/doubts/new">
                  <span className="flex items-center gap-2">
                    Ask a Doubt
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Live Campus Doubts Feed (Phase 2) */}
        <section className="space-y-6 pt-4 border-t border-[color:var(--color-border)]/60">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-[color:var(--color-primary)]" />
              <h2 className="text-xl font-bold tracking-tight text-[color:var(--color-text)]">
                Campus Doubts Feed
              </h2>
            </div>

            <Button asChild size="sm">
              <Link href="/doubts/new">
                <Plus className="size-4 mr-1" />
                Ask a Doubt
              </Link>
            </Button>
          </div>

          {/* Feed Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-sm">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5">
              {["ALL", "OPEN", "RESOLVED"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === status
                      ? "bg-[color:var(--color-primary)] text-white shadow-sm"
                      : "bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                  }`}
                >
                  {status === "ALL" ? "All Doubts" : status}
                </button>
              ))}
            </div>

            {/* Urgency and Skill Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
                <span>Urgency:</span>
                <Select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  className="h-8 text-xs font-medium w-36"
                >
                  <option value="ALL">All Urgencies</option>
                  <option value="CURIOUS">Just Curious</option>
                  <option value="ASSIGNMENT_STUCK">Assignment Stuck</option>
                  <option value="PROJECT_BLOCKED">Project Blocked</option>
                  <option value="EXAM_PREP">Exam Prep</option>
                </Select>
              </div>

              {skills.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
                  <span>Skill Tag:</span>
                  <Select
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value)}
                    className="h-8 text-xs font-medium w-36"
                  >
                    <option value="ALL">All Skills</option>
                    {skills.map((s) => (
                      <option key={s.id || s.slug} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Feed Content */}
          {loadingDoubts ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="p-6 space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </Card>
              ))}
            </div>
          ) : doubts.length === 0 ? (
            <Card className="p-8 text-center space-y-3 bg-[color:var(--color-surface-muted)]/30 border-dashed">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white border border-[color:var(--color-border)] text-[color:var(--color-text-muted)]">
                <MessageSquare className="size-6" />
              </div>
              <h3 className="text-base font-semibold text-[color:var(--color-text)]">
                No Doubts Found
              </h3>
              <p className="text-sm text-[color:var(--color-text-muted)] max-w-md mx-auto">
                {filterStatus !== "ALL" || filterUrgency !== "ALL" || filterSkill !== "ALL"
                  ? "No campus doubts match your selected filters. Try adjusting your filters."
                  : "No open doubts have been posted yet. Be the first to ask!"}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/doubts/new">Ask a Doubt Now</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {doubts.map((d) => (
                <Card key={d.id} className="p-6 space-y-4 hover:border-[color:var(--color-primary)]/40 transition-all shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {d.status === "RESOLVED" ? (
                        <Badge variant="success" className="text-[10px] py-0.5 px-2 flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          RESOLVED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0.5 px-2">
                          OPEN
                        </Badge>
                      )}
                      {getUrgencyBadge(d.urgency)}
                    </div>

                    <span className="text-xs text-[color:var(--color-text-muted)]">
                      {formatDate(d.createdAt)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors">
                      <Link href={`/doubts/${d.id}`}>{d.title}</Link>
                    </h3>
                    <p className="text-sm text-[color:var(--color-text-muted)] line-clamp-2 leading-relaxed">
                      {d.body}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[color:var(--color-border)]/60">
                    <div className="flex items-center gap-2">
                      <Avatar name={d.author.fullName} department={d.author.department} src={d.author.avatarUrl} size="sm" />
                      <span className="text-xs font-semibold text-[color:var(--color-text)]">
                        {d.author.fullName}
                      </span>
                      <span className="text-xs text-[color:var(--color-text-muted)]">
                        • {d.author.department || "Student"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {d.skills.map((s) => (
                          <Badge key={s.id} variant="skill" className="text-[10px] py-0.5 px-2">
                            {s.name}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 text-xs font-medium text-[color:var(--color-text-muted)]">
                        <MessageSquare className="size-3.5" />
                        <span>{d.answerCount} answers</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
