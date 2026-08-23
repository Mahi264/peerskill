"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Sparkles,
  User as UserIcon,
} from "lucide-react";

import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

interface ViewerSession {
  id: string;
  email: string;
  status: string;
  role: string;
}

interface ViewerProfile {
  fullName: string;
  avatarUrl?: string | null;
}

interface PeerProfileData {
  id: string;
  status: string;
  createdAt: string;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    branch: string | null;
    section: string | null;
    graduationYear: number | null;
    bio: string | null;
    helpAvailable: boolean;
    helpStatus: string | null;
  };
  skills: Array<{
    id: string;
    name: string;
    slug: string;
    level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MENTOR";
  }>;
  stats: {
    doubtsCount: number;
    answersCount: number;
  };
}

const LEVEL_VARIANT_MAP: Record<
  string,
  "default" | "outline" | "success" | "warning" | "danger" | "primary" | "accent" | "skill"
> = {
  MENTOR: "success",
  ADVANCED: "skill",
  INTERMEDIATE: "accent",
  BEGINNER: "outline",
};

export default function CampusPeerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [viewer, setViewer] = React.useState<ViewerSession | null>(null);
  const [viewerProfile, setViewerProfile] = React.useState<ViewerProfile | null>(null);
  const [peer, setPeer] = React.useState<PeerProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        // 1. Verify current viewer session
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.replace("/");
          return;
        }

        const meJson = await meRes.json();
        const u = meJson?.data?.user;
        const p = u?.profile || meJson?.data?.profile || null;

        if (u?.status === "PENDING") {
          router.replace("/onboarding");
          return;
        }

        if (!ignore) {
          setViewer(u);
          setViewerProfile(p);
        }

        // 2. Fetch peer profile
        const peerRes = await fetch(`/api/users/${userId}`);
        if (!peerRes.ok) {
          if (peerRes.status === 404) {
            setError("Student profile not found or unavailable.");
          } else {
            setError("Failed to load campus peer profile.");
          }
          return;
        }

        const peerJson = await peerRes.json();
        if (!ignore) {
          setPeer(peerJson.data.user);
        }
      } catch {
        if (!ignore) {
          setError("Network error while loading campus peer profile.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [userId, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading campus peer profile...</span>
        </div>
      </main>
    );
  }

  if (error || !peer) {
    return (
      <AppShell user={viewer} profile={viewerProfile}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home Feed
          </Link>

          <Card className="p-8 text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
              <UserIcon className="size-6" />
            </div>
            <h1 className="text-xl font-bold text-[color:var(--color-text)]">
              Student Profile Not Found
            </h1>
            <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed max-w-md mx-auto">
              This student profile does not exist, is not active on campus, or is no longer accessible.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/home">
                <Button variant="outline">Go to Home Feed</Button>
              </Link>
              <Link href="/search?tab=peers">
                <Button>Search Campus Peers</Button>
              </Link>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  const isSelf = viewer?.id === peer.id;
  const { profile, skills, stats } = peer;

  return (
    <AppShell user={viewer} profile={viewerProfile}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          {isSelf && (
            <Link href="/profile">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="size-3.5" />
                Edit Profile & Settings
              </Button>
            </Link>
          )}
        </div>

        {/* Self Viewing Notice */}
        {isSelf && (
          <div className="rounded-xl border border-[color:var(--color-primary)]/20 bg-[color:var(--color-surface-muted)]/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-primary)] text-white text-xs font-bold">
                You
              </div>
              <p className="text-xs sm:text-sm text-[color:var(--color-text)]">
                This is how your campus peer profile appears to other MITS students.
              </p>
            </div>
            <Link href="/profile" className="shrink-0">
              <Button size="sm" variant="outline" className="text-xs h-8">
                Manage Privacy & Skills
              </Button>
            </Link>
          </div>
        )}

        {/* Identity & Academic Header Card */}
        <Card className="p-6 sm:p-8 bg-gradient-to-r from-white via-white to-[color:var(--color-surface-muted)]/40 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar
              name={profile.fullName}
              src={profile.avatarUrl}
              size="xl"
            />

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
                  {profile.fullName}
                </h1>
                <Badge
                  variant={profile.helpAvailable ? "success" : "outline"}
                  className="text-xs px-2.5 py-0.5"
                >
                  {profile.helpAvailable ? "Available to help" : "Unavailable"}
                </Badge>
              </div>

              <p className="text-sm font-medium text-[color:var(--color-text-muted)]">
                {formatPublicPeerAcademicSubtitle(profile)}
              </p>

              {profile.bio && (
                <p className="text-sm text-[color:var(--color-text)] leading-relaxed italic pt-1 max-w-2xl">
                  &quot;{profile.bio}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Help Status Banner */}
          {profile.helpStatus && (
            <div className="rounded-lg border border-[color:var(--color-primary)]/20 bg-[color:var(--color-surface-muted)]/30 px-4 py-2.5 flex items-center gap-2.5 text-xs text-[color:var(--color-text)]">
              <span className="font-semibold text-[color:var(--color-primary)] uppercase tracking-wider text-[10px]">
                Availability Note:
              </span>
              <span>{profile.helpStatus}</span>
            </div>
          )}
        </Card>

        {/* 2-Column Details: Skills & Campus Activity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Skills List (2 cols on md) */}
          <div className="md:col-span-2 space-y-4">
            <Card className="p-6 space-y-4 shadow-sm">
              <CardHeader className="p-0 pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold text-[color:var(--color-text)]">
                  Campus Skills & Proficiencies
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {skills.length} {skills.length === 1 ? "skill" : "skills"}
                </Badge>
              </CardHeader>

              {skills.length === 0 ? (
                <p className="text-xs text-[color:var(--color-text-muted)] py-2">
                  No skills listed yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[color:var(--color-border)] bg-white shadow-xs"
                    >
                      <span className="text-sm font-semibold text-[color:var(--color-text)]">
                        {skill.name}
                      </span>
                      <Badge
                        variant={LEVEL_VARIANT_MAP[skill.level] || "outline"}
                        className="text-[11px] font-medium uppercase tracking-wider"
                      >
                        {skill.level.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Campus Activity (1 col on md) */}
          <div className="space-y-4">
            <Card className="p-6 space-y-4 shadow-sm">
              <CardHeader className="p-0 pb-1">
                <CardTitle className="text-lg font-bold text-[color:var(--color-text)]">
                  Campus Contributions
                </CardTitle>
              </CardHeader>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/30">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                      <HelpCircle className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--color-text-muted)]">Doubts Asked</p>
                      <p className="text-lg font-bold text-[color:var(--color-text)]">
                        {stats.doubtsCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/30">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]">
                      <MessageSquare className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs text-[color:var(--color-text-muted)]">
                        Answers Contributed
                      </p>
                      <p className="text-lg font-bold text-[color:var(--color-text)]">
                        {stats.answersCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
