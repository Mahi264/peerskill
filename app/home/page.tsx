"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, HelpCircle, MessageSquare, Plus, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormattedContent } from "@/components/ui/formatted-content";
import { AlertBanner } from "@/components/ui/toast";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

interface UserSkill {
  id: string;
  name: string;
  slug: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";
}

interface Profile {
  fullName: string;
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
    branch?: string | null;
    section?: string | null;
    graduationYear?: number | null;
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
          router.replace("/");
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
      <div className="space-y-6">
        {errorMsg && <AlertBanner variant="error" message={errorMsg} />}

        {/* Top Action & Greeting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--color-border)]/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
              Campus Doubts
            </h1>
            <p className="text-sm text-[color:var(--color-text-muted)] mt-0.5">
              Welcome back, <span className="font-semibold text-[color:var(--color-text)]">{displayName}</span>
            </p>
          </div>

          <Button asChild size="lg" className="h-11 px-5 shadow-sm">
            <Link href="/doubts/new">
              <Plus className="size-4 mr-1.5" />
              Ask a Doubt
            </Link>
          </Button>
        </div>

        {/* Feed-First 2-Column Layout (Feed dominates 70% left, Sidebar 30% right) */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] items-start">
          {/* Main Feed Section (Primary Hero Component) */}
          <section className="space-y-5">
            {/* Feed Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3.5 shadow-sm">
              {/* Status Pills */}
              <div className="flex items-center gap-1">
                {["ALL", "OPEN", "RESOLVED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-tactile active:scale-95 cursor-pointer select-none ${
                      filterStatus === status
                        ? "bg-[color:var(--color-primary)] text-white shadow-xs"
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
                    <span>Skill:</span>
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

            {/* Feed Cards Stream */}
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
                  <Card
                    key={d.id}
                    className="p-5 sm:p-6 space-y-3.5 shadow-sm"
                  >
                    {/* Card Header Info */}
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

                    {/* Title & Rendered Preview Body */}
                    <div className="space-y-2">
                      <h2 className="text-lg sm:text-xl font-bold text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors">
                        <Link href={`/doubts/${d.id}`}>{d.title}</Link>
                      </h2>

                      {d.body.length > 240 || d.body.split("\n").length > 4 ? (
                        <div className="space-y-1">
                          <div className="relative max-h-36 overflow-hidden">
                            <FormattedContent content={d.body} className="text-sm" />
                            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[color:var(--color-surface)] to-transparent pointer-events-none" />
                          </div>
                          <Link
                            href={`/doubts/${d.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-primary)] hover:underline pt-0.5 cursor-pointer"
                          >
                            <span>Read more</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </div>
                      ) : (
                        <FormattedContent content={d.body} className="text-sm" />
                      )}
                    </div>

                    {/* Author & Actions Footer Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[color:var(--color-border)]/60">
                      <Link
                        href={`/users/${d.authorId || d.author.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 hover:underline group cursor-pointer"
                      >
                        <Avatar name={d.author.fullName} src={d.author.avatarUrl} size="sm" />
                        <span className="text-xs font-semibold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)]">
                          {d.author.fullName}
                        </span>
                        <span className="text-xs text-[color:var(--color-text-muted)]">
                          • {formatPublicPeerAcademicSubtitle(d.author)}
                        </span>
                      </Link>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          {d.skills.map((s) => (
                            <Badge key={s.id} variant="skill" className="text-[10px] py-0.5 px-2">
                              {s.name}
                            </Badge>
                          ))}
                        </div>

                        <Link
                          href={`/doubts/${d.id}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-colors"
                        >
                          <MessageSquare className="size-3.5" />
                          <span>{d.answerCount} {d.answerCount === 1 ? "answer" : "answers"}</span>
                        </Link>

                        {/* Direct Answer Navigation to /doubts/[id] */}
                        {d.status !== "CLOSED" && (
                          <Button asChild variant="default" size="sm" className="text-xs font-semibold h-8">
                            <Link href={`/doubts/${d.id}`}>Answer</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Secondary Sidebar (Compact 30% desktop column / stacked on mobile) */}
          <aside className="space-y-6">
            {/* Compact Profile & Availability Widget */}
            <Card className="p-5 space-y-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[color:var(--color-border)]/60 pb-3.5">
                <Avatar name={displayName} src={profile?.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[color:var(--color-text)] truncate">
                    {displayName}
                  </h3>
                  <p className="text-xs text-[color:var(--color-text-muted)] truncate">
                    {formatPublicPeerAcademicSubtitle(profile || {})}
                  </p>
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[color:var(--color-text)]">
                    Available to Help
                  </p>
                  <p className="text-[10px] text-[color:var(--color-text-muted)]">
                    {profile?.helpAvailable ? "Mentoring active" : "Marked unavailable"}
                  </p>
                </div>
                <Switch
                  checked={profile?.helpAvailable ?? true}
                  onCheckedChange={handleToggleAvailability}
                  disabled={togglingAvailability}
                />
              </div>

              {/* Declared Skills Summary */}
              <div className="space-y-2 pt-2 border-t border-[color:var(--color-border)]/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                    Declared Skills ({skills.length})
                  </span>
                  <Link href="/profile" className="text-xs font-medium text-[color:var(--color-primary)] hover:underline">
                    Edit
                  </Link>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {skills.length === 0 ? (
                    <span className="text-xs text-[color:var(--color-text-muted)]">No skills set.</span>
                  ) : (
                    skills.map((s) => (
                      <Badge key={s.id || s.name} variant="skill" className="text-[10px] py-0.5 px-2">
                        {s.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </Card>

            {/* Quick Ask CTA Module Card */}
            <Card className="bg-gradient-to-br from-[color:var(--color-primary)]/5 via-white to-white border-[color:var(--color-primary)]/20 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--color-primary)] text-white">
                  <HelpCircle className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-[color:var(--color-text)]">Need Help?</h3>
              </div>
              <p className="text-xs text-[color:var(--color-text-muted)] leading-relaxed">
                Post your course or assignment doubt to find verified peers in your college.
              </p>
              <Button asChild className="w-full text-xs font-semibold h-9">
                <Link href="/doubts/new">
                  Ask a Doubt
                  <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
