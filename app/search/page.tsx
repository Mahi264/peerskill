"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Plus,
  Search as SearchIcon,
} from "lucide-react";

import { HeaderSearch } from "@/components/layout/header-search";
import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { AlertBanner } from "@/components/ui/toast";

interface User {
  id: string;
  email: string;
  status: string;
}

interface Profile {
  fullName: string;
  department: string;
  avatarUrl?: string | null;
}

interface SearchDoubt {
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
  acceptedAnswer?: {
    id: string;
    body: string;
    createdAt: string;
  } | null;
  author: {
    id: string;
    email: string;
    fullName: string;
    department: string;
    avatarUrl?: string | null;
  };
  skills: Array<{ id: string; name: string; slug: string }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const filterStatus = searchParams.get("status") || "ALL";
  const filterUrgency = searchParams.get("urgency") || "ALL";
  const filterSkill = searchParams.get("skill") || searchParams.get("skillId") || "";
  const currentPage = Number.parseInt(searchParams.get("page") || "1", 10);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<SearchDoubt[]>([]);
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const updateFilters = React.useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === "" || val === "ALL") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      // Reset to page 1 on filter change if page wasn't explicitly provided
      if (!newParams.page) {
        params.delete("page");
      }
      router.push(`/search?${params.toString()}`);
    },
    [router, searchParams],
  );

  React.useEffect(() => {
    let ignore = false;

    async function runSearch() {
      if (!query.trim()) {
        if (!ignore) {
          setResults([]);
          setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("q", query.trim());
        if (filterStatus !== "ALL") params.set("status", filterStatus);
        if (filterUrgency !== "ALL") params.set("urgency", filterUrgency);
        if (filterSkill) params.set("skillId", filterSkill);
        if (currentPage > 1) params.set("page", currentPage.toString());

        const res = await fetch(`/api/search/knowledge?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load search results.");
        }

        const json = await res.json();
        if (!ignore) {
          setResults(json.data.doubts || []);
          setPagination(
            json.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
          );
        }
      } catch {
        if (!ignore) {
          setError("Unable to search campus knowledge right now. Please try again.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      ignore = true;
    };
  }, [query, filterStatus, filterUrgency, filterSkill, currentPage]);

  function getUrgencyBadge(urgency: SearchDoubt["urgency"]) {
    switch (urgency) {
      case "EXAM_PREP":
        return <Badge variant="danger">Exam Prep</Badge>;
      case "PROJECT_BLOCKED":
        return <Badge variant="warning">Project Blocked</Badge>;
      case "ASSIGNMENT_STUCK":
        return <Badge variant="warning">Assignment Stuck</Badge>;
      default:
        return <Badge variant="outline">Curious</Badge>;
    }
  }

  const suggestedQueries = [
    "Data Structures",
    "React useEffect",
    "DBMS Normalization",
    "Python Recursion",
    "C++ Pointers",
  ];

  return (
    <div className="space-y-6">
      {/* Header Search Input Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
            Campus Knowledge Search
          </h1>

          <Button
            asChild
            size="sm"
            className="bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] text-white shadow-sm"
          >
            <Link href={query ? `/doubts/new?title=${encodeURIComponent(query)}` : "/doubts/new"}>
              <Plus className="size-4 mr-1.5" />
              Ask Doubt
            </Link>
          </Button>
        </div>

        <HeaderSearch initialValue={query} className="max-w-none" />
      </div>

      {/* Filter Row */}
      {query.trim() !== "" && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-sm">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">
              Filters:
            </span>

            {/* Status Filter */}
            <Select
              value={filterStatus}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="h-9 text-xs w-32"
            >
              <option value="ALL">All Status</option>
              <option value="RESOLVED">Resolved Only</option>
              <option value="OPEN">Open Only</option>
            </Select>

            {/* Urgency Filter */}
            <Select
              value={filterUrgency}
              onChange={(e) => updateFilters({ urgency: e.target.value })}
              className="h-9 text-xs w-40"
            >
              <option value="ALL">All Urgency</option>
              <option value="EXAM_PREP">Exam Prep</option>
              <option value="PROJECT_BLOCKED">Project Blocked</option>
              <option value="ASSIGNMENT_STUCK">Assignment Stuck</option>
              <option value="CURIOUS">Curious</option>
            </Select>
          </div>

          <div className="text-xs text-[color:var(--color-text-muted)] font-medium">
            {pagination.total} {pagination.total === 1 ? "result" : "results"} found
          </div>
        </div>
      )}

      {/* Non-blocking Error Banner */}
      {error && (
        <AlertBanner
          variant="error"
          message={error}
        />
      )}

      {/* Initial Empty State (When no search query is entered) */}
      {!query.trim() && (
        <Card className="p-8 sm:p-12 text-center border-[color:var(--color-border)] shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] mb-4">
            <SearchIcon className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-[color:var(--color-text)] mb-2">
            Search campus knowledge
          </h2>
          <p className="text-sm text-[color:var(--color-text-muted)] max-w-md mx-auto mb-6">
            Try a course, error message, concept, or skill to discover existing doubts and accepted peer answers.
          </p>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
              Popular Queries
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
              {suggestedQueries.map((item) => (
                <button
                  key={item}
                  onClick={() => router.push(`/search?q=${encodeURIComponent(item)}`)}
                  className="rounded-full border border-[color:var(--color-border)] bg-white px-3.5 py-1.5 text-xs font-medium text-[color:var(--color-text)] hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] transition-colors shadow-sm cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 space-y-3 animate-pulse border-[color:var(--color-border)]">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* No Results Empty State */}
      {!loading && query.trim() !== "" && results.length === 0 && (
        <Card className="p-8 text-center border-[color:var(--color-border)] shadow-sm space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-2">
            <HelpCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[color:var(--color-text)]">
              No campus doubts found matching &ldquo;{query}&rdquo;
            </h3>
            <p className="text-sm text-[color:var(--color-text-muted)] max-w-md mx-auto">
              Try searching with broader terms or different keywords. If your doubt hasn&apos;t been asked yet, post it now!
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              asChild
              className="bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] text-white shadow-sm"
            >
              <Link href={`/doubts/new?title=${encodeURIComponent(query)}`}>
                <Plus className="size-4 mr-1.5" />
                Ask a Doubt About This
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Knowledge Search Results List */}
      {!loading && query.trim() !== "" && results.length > 0 && (
        <div className="space-y-4">
          {results.map((doubt) => (
            <Card
              key={doubt.id}
              className="border-[color:var(--color-border)] shadow-sm hover:shadow-md transition-shadow rounded-[var(--radius-lg)] overflow-hidden"
            >
              <CardContent className="p-5 space-y-3">
                {/* Status Badges & Skill Tags */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {doubt.status === "RESOLVED" ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        RESOLVED
                      </Badge>
                    ) : (
                      <Badge variant="outline">OPEN</Badge>
                    )}
                    {getUrgencyBadge(doubt.urgency)}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {doubt.skills.map((s) => (
                      <span
                        key={s.id}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <Link
                  href={`/doubts/${doubt.id}`}
                  className="block text-lg font-bold text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors line-clamp-2"
                >
                  {doubt.title}
                </Link>

                {/* Body Snippet */}
                <p className="text-sm text-[color:var(--color-text-muted)] line-clamp-2 leading-relaxed">
                  {doubt.body}
                </p>

                {/* Accepted Answer Highlight Box (Accepted Answer Signal) */}
                {doubt.status === "RESOLVED" && doubt.acceptedAnswer && (
                  <div className="p-3 bg-[color:var(--color-success-bg)]/40 border border-[color:var(--color-success-border)] rounded-md space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-success)]">
                      <CheckCircle2 className="size-3.5" />
                      <span>Accepted Solution:</span>
                    </div>
                    <p className="text-xs text-[color:var(--color-text)] line-clamp-2 italic leading-relaxed">
                      &ldquo;{doubt.acceptedAnswer.body}&rdquo;
                    </p>
                  </div>
                )}

                {/* Card Footer Meta */}
                <div className="flex items-center justify-between pt-2 border-t border-[color:var(--color-border)]/60 text-xs text-[color:var(--color-text-muted)]">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={doubt.author.fullName}
                      department={doubt.author.department}
                      src={doubt.author.avatarUrl}
                      size="sm"
                    />
                    <span className="font-medium text-[color:var(--color-text)]">
                      {doubt.author.fullName}
                    </span>
                    <span>•</span>
                    <span>{doubt.author.department}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3.5" />
                      {doubt.answerCount} {doubt.answerCount === 1 ? "answer" : "answers"}
                    </span>
                    <Link
                      href={`/doubts/${doubt.id}`}
                      className="font-semibold text-[color:var(--color-primary)] hover:underline flex items-center gap-0.5"
                    >
                      View
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => updateFilters({ page: (pagination.page - 1).toString() })}
              >
                <ArrowLeft className="size-4 mr-1" />
                Previous
              </Button>

              <span className="text-xs text-[color:var(--color-text-muted)] font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => updateFilters({ page: (pagination.page + 1).toString() })}
              >
                Next
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);

  React.useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/");
          return;
        }
        const json = await res.json();
        const userData = json?.data?.user;
        const profileData = userData?.profile || json?.data?.profile || null;

        if (userData?.status === "PENDING") {
          router.replace("/onboarding");
          return;
        }

        setUser(userData);
        setProfile(profileData);
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg)] flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-[color:var(--color-text-muted)] text-sm font-medium animate-pulse">
          <div className="size-6 rounded-full border-2 border-[color:var(--color-primary)] border-t-transparent animate-spin" />
          <span>Loading knowledge search...</span>
        </div>
      </main>
    );
  }

  return (
    <AppShell user={user} profile={profile} onLogout={handleLogout}>
      <React.Suspense fallback={<div className="p-4 text-center text-sm">Loading...</div>}>
        <SearchPageContent />
      </React.Suspense>
    </AppShell>
  );
}
