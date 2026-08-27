"use client";

import * as React from "react";
import {
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Tag,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { AdminOverviewSkeleton } from "@/components/skeletons/admin-skeletons";

interface StatsType {
  totalStudents: number;
  activeStudents: number;
  pendingStudents: number;
  totalDoubts: number;
  resolvedDoubts: number;
  totalAnswers: number;
  acceptedAnswers: number;
  totalConnections: number;
  totalConversations: number;
  totalPredefinedSkills: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = React.useState<StatsType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;

    async function loadStats() {
      try {
        const res = await fetch("/api/admin/overview");
        if (!res.ok) {
          throw new Error("Failed to load overview data.");
        }
        const json = await res.json();
        if (!ignore && json?.data?.stats) {
          setStats(json.data.stats);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError((err as Error).message || "Failed to load overview.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadStats();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-8">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
            Platform Overview
          </h1>
          <p className="text-sm sm:text-base text-[color:var(--color-text-muted)] mt-1">
            Real-time aggregate platform metrics and operational health indicators for MITS campus.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <AdminOverviewSkeleton />
        ) : stats ? (
          <div className="space-y-8">
            {/* Student Engagement */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-[color:var(--color-text)] flex items-center gap-2">
                <Users className="size-4.5 text-[color:var(--color-primary)]" />
                Student Community Roster
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Total Registered
                    </span>
                    <Users className="size-4 text-[color:var(--color-text-muted)]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.totalStudents}
                    </span>
                    <span className="text-xs text-[color:var(--color-text-muted)]">students</span>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-emerald-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Active Accounts
                    </span>
                    <UserCheck className="size-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.activeStudents}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats.totalStudents > 0
                        ? `${Math.round((stats.activeStudents / stats.totalStudents) * 100)}% active`
                        : "100%"}
                    </span>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Pending Onboarding
                    </span>
                    <UserPlus className="size-4 text-amber-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.pendingStudents}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">in onboarding</span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Academic Knowledge & Q&A */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-[color:var(--color-text)] flex items-center gap-2">
                <HelpCircle className="size-4.5 text-[color:var(--color-primary)]" />
                Academic Problem Solving
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Total Doubts
                    </span>
                    <HelpCircle className="size-4 text-[color:var(--color-text-muted)]" />
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.totalDoubts}
                    </span>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Resolved Doubts
                    </span>
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.resolvedDoubts}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {stats.totalDoubts > 0
                        ? `${Math.round((stats.resolvedDoubts / stats.totalDoubts) * 100)}% resolved`
                        : "0%"}
                    </span>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Total Answers
                    </span>
                    <MessageSquare className="size-4 text-[color:var(--color-text-muted)]" />
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.totalAnswers}
                    </span>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Accepted Answers
                    </span>
                    <Sparkles className="size-4 text-amber-500" />
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.acceptedAnswers}
                    </span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Network Connections & Skills */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-[color:var(--color-text)] flex items-center gap-2">
                <Users className="size-4.5 text-[color:var(--color-primary)]" />
                Network Graph & Taxonomy
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Mutual Connections
                    </span>
                    <Users className="size-4 text-[color:var(--color-primary)]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.totalConnections}
                    </span>
                    <span className="text-xs text-[color:var(--color-text-muted)]">accepted pairs</span>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      1-to-1 Conversations
                    </span>
                    <MessageSquare className="size-4 text-[color:var(--color-primary)]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.totalConversations}
                    </span>
                    <span className="text-xs text-[color:var(--color-text-muted)]">active threads</span>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[color:var(--color-text-muted)] uppercase tracking-wider">
                      Predefined Skills
                    </span>
                    <Tag className="size-4 text-purple-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-[color:var(--color-text)]">
                      {stats.totalPredefinedSkills}
                    </span>
                    <span className="text-xs text-[color:var(--color-text-muted)]">in taxonomy</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : null}
      </div>
  );
}
