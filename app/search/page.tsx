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
  Users,
} from "lucide-react";

import { HeaderSearch } from "@/components/layout/header-search";
import { AppShell } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/components/ui/toast";
import { SearchRadarEmptyStateSVG } from "@/components/ui/motion-illustrations";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Business Administration",
  "Mathematics & Computing",
  "Physics",
  "Other",
];

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

interface SearchPeer {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  department: string;
  branch: string | null;
  graduationYear: number | null;
  bio: string | null;
  helpAvailable: boolean;
  helpStatus: string | null;
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") === "peers" ? "peers" : "doubts";
  const query = searchParams.get("q") || "";

  // Doubts filters
  const filterStatus = searchParams.get("status") || "ALL";
  const filterUrgency = searchParams.get("urgency") || "ALL";
  const filterSkill = searchParams.get("skill") || searchParams.get("skillId") || "";

  // Peers filters
  const filterDept = searchParams.get("department") || "ALL";
  const filterAvailable = searchParams.get("available") === "true";
  const filterLevel = searchParams.get("level") || "ALL";

  const currentPage = Number.parseInt(searchParams.get("page") || "1", 10);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Doubts state
  const [doubtResults, setDoubtResults] = React.useState<SearchDoubt[]>([]);
  const [doubtPagination, setDoubtPagination] = React.useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Peers state
  const [peerResults, setPeerResults] = React.useState<SearchPeer[]>([]);
  const [peerPagination, setPeerPagination] = React.useState<Pagination>({
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

  const handleTabChange = (tab: "doubts" | "peers") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  };

  // Run Search Effect
  React.useEffect(() => {
    let ignore = false;

    async function runSearch() {
      if (!query.trim() && currentTab === "doubts") {
        if (!ignore) {
          setDoubtResults([]);
          setDoubtPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (currentTab === "doubts") {
          const params = new URLSearchParams();
          params.set("q", query.trim());
          if (filterStatus !== "ALL") params.set("status", filterStatus);
          if (filterUrgency !== "ALL") params.set("urgency", filterUrgency);
          if (filterSkill) params.set("skillId", filterSkill);
          if (currentPage > 1) params.set("page", currentPage.toString());

          const res = await fetch(`/api/search/knowledge?${params.toString()}`);
          if (!res.ok) {
            throw new Error("Failed to load knowledge search results.");
          }

          const json = await res.json();
          if (!ignore) {
            setDoubtResults(json.data.doubts || []);
            setDoubtPagination(
              json.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
            );
          }
        } else {
          // Peers search
          const params = new URLSearchParams();
          if (query.trim()) params.set("q", query.trim());
          if (filterDept !== "ALL") params.set("department", filterDept);
          if (filterAvailable) params.set("available", "true");
          if (filterLevel !== "ALL") params.set("level", filterLevel);
          if (filterSkill) params.set("skill", filterSkill);
          if (currentPage > 1) params.set("page", currentPage.toString());

          const res = await fetch(`/api/search/peers?${params.toString()}`);
          if (!res.ok) {
            throw new Error("Failed to load campus peers.");
          }

          const json = await res.json();
          if (!ignore) {
            setPeerResults(json.data.peers || []);
            setPeerPagination(
              json.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
            );
          }
        }
      } catch {
        if (!ignore) {
          setError(
            currentTab === "doubts"
              ? "Unable to search campus knowledge right now. Please try again."
              : "Unable to search campus peers right now. Please try again.",
          );
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
  }, [
    currentTab,
    query,
    filterStatus,
    filterUrgency,
    filterSkill,
    filterDept,
    filterAvailable,
    filterLevel,
    currentPage,
  ]);

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

  const suggestedPeerSkills = [
    "React",
    "C++",
    "Python",
    "Machine Learning",
    "Node.js",
    "SQL",
  ];

  return (
    <div className="space-y-6">
      {/* Header Search Input Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
            Campus Discovery
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

        {/* Mode / Tabs Switcher */}
        <div className="flex items-center gap-2 border-b border-[color:var(--color-border)] pb-2">
          <button
            type="button"
            onClick={() => handleTabChange("doubts")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-tactile active:scale-[0.98] cursor-pointer select-none ${
              currentTab === "doubts"
                ? "bg-[color:var(--color-primary)] text-white shadow-xs"
                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]"
            }`}
          >
            <HelpCircle className="size-4" />
            <span>Campus Doubts &amp; Solutions</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("peers")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-tactile active:scale-[0.98] cursor-pointer select-none ${
              currentTab === "peers"
                ? "bg-[color:var(--color-primary)] text-white shadow-xs"
                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)]"
            }`}
          >
            <Users className="size-4" />
            <span>Campus Peers &amp; Skills</span>
          </button>
        </div>
      </div>

      {/* Non-blocking Error Banner */}
      {error && <AlertBanner variant="error" message={error} />}

      {/* TAB 1: KNOWLEDGE SEARCH (DOUBTS) */}
      {currentTab === "doubts" && (
        <div className="space-y-6">
          {/* Doubts Filter Row */}
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
                {doubtPagination.total} {doubtPagination.total === 1 ? "result" : "results"} found
              </div>
            </div>
          )}

          {/* Initial Empty State for Doubts */}
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
                      onClick={() => router.push(`/search?tab=doubts&q=${encodeURIComponent(item)}`)}
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

          {/* No Results State */}
          {!loading && query.trim() !== "" && doubtResults.length === 0 && (
            <Card className="p-8 text-center border-[color:var(--color-border)] shadow-sm space-y-4 animate-in fade-in duration-200">
              <SearchRadarEmptyStateSVG className="mb-2" />
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

          {/* Doubt Results List */}
          {!loading && query.trim() !== "" && doubtResults.length > 0 && (
            <div className="space-y-4">
              {doubtResults.map((doubt) => (
                <Card
                  key={doubt.id}
                  className="border-[color:var(--color-border)] shadow-sm rounded-[var(--radius-lg)] overflow-hidden"
                >
                  <CardContent className="p-5 space-y-3">
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

                    <Link
                      href={`/doubts/${doubt.id}`}
                      className="block text-lg font-bold text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors line-clamp-2"
                    >
                      {doubt.title}
                    </Link>

                    <p className="text-sm text-[color:var(--color-text-muted)] line-clamp-2 leading-relaxed">
                      {doubt.body}
                    </p>

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

                    {/* Card Footer Meta with Clickable Author Link */}
                    <div className="flex items-center justify-between pt-2 border-t border-[color:var(--color-border)]/60 text-xs text-[color:var(--color-text-muted)]">
                      <Link
                        href={`/users/${doubt.author.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 hover:underline group"
                      >
                        <Avatar
                          name={doubt.author.fullName}
                          department={doubt.author.department}
                          src={doubt.author.avatarUrl}
                          size="sm"
                        />
                        <span className="font-medium text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)]">
                          {doubt.author.fullName}
                        </span>
                        <span>•</span>
                        <span>{doubt.author.department}</span>
                      </Link>

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

              {/* Doubts Pagination */}
              {doubtPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={doubtPagination.page <= 1}
                    onClick={() => updateFilters({ page: (doubtPagination.page - 1).toString() })}
                  >
                    <ArrowLeft className="size-4 mr-1" />
                    Previous
                  </Button>

                  <span className="text-xs text-[color:var(--color-text-muted)] font-medium">
                    Page {doubtPagination.page} of {doubtPagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={doubtPagination.page >= doubtPagination.totalPages}
                    onClick={() => updateFilters({ page: (doubtPagination.page + 1).toString() })}
                  >
                    Next
                    <ArrowRight className="size-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PEER DISCOVERY */}
      {currentTab === "peers" && (
        <div className="space-y-6">
          {/* Peer Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">
                Peer Filters:
              </span>

              {/* Department Filter */}
              <Select
                value={filterDept}
                onChange={(e) => updateFilters({ department: e.target.value })}
                className="h-9 text-xs w-44"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>

              {/* Minimum Proficiency Level */}
              <Select
                value={filterLevel}
                onChange={(e) => updateFilters({ level: e.target.value })}
                className="h-9 text-xs w-36"
              >
                <option value="ALL">All Levels</option>
                <option value="BEGINNER">Beginner+</option>
                <option value="INTERMEDIATE">Intermediate+</option>
                <option value="ADVANCED">Advanced+</option>
                <option value="MENTOR">Mentor Only</option>
              </Select>

              {/* Available To Help Toggle */}
              <div className="flex items-center gap-2 pl-1">
                <Switch
                  checked={filterAvailable}
                  onCheckedChange={(checked) =>
                    updateFilters({ available: checked ? "true" : null })
                  }
                />
                <span className="text-xs font-medium text-[color:var(--color-text)]">
                  Available Only
                </span>
              </div>
            </div>

            <div className="text-xs text-[color:var(--color-text-muted)] font-medium">
              {peerPagination.total} {peerPagination.total === 1 ? "peer" : "peers"} found
            </div>
          </div>

          {/* Quick Skill Tags Filter Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[color:var(--color-text-muted)]">
              Popular Skills:
            </span>
            {suggestedPeerSkills.map((sk) => {
              const isSelected = filterSkill.toLowerCase() === sk.toLowerCase();
              return (
                <button
                  key={sk}
                  type="button"
                  onClick={() => updateFilters({ skill: isSelected ? null : sk })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[color:var(--color-primary)] text-white border-[color:var(--color-primary)] font-semibold"
                      : "bg-white text-[color:var(--color-text)] border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]"
                  }`}
                >
                  {sk}
                </button>
              );
            })}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5 space-y-3 animate-pulse border-[color:var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gray-200" />
                    <div className="space-y-1 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </Card>
              ))}
            </div>
          )}

          {/* No Peers State */}
          {!loading && peerResults.length === 0 && (
            <Card className="p-8 text-center border-[color:var(--color-border)] shadow-sm space-y-4 animate-in fade-in duration-200">
              <SearchRadarEmptyStateSVG className="mb-2" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[color:var(--color-text)]">
                  No campus peers found
                </h3>
                <p className="text-sm text-[color:var(--color-text-muted)] max-w-md mx-auto">
                  Try broadening your search terms, selecting &ldquo;All Departments&rdquo;, or resetting your filters.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push("/search?tab=peers")
                  }
                >
                  Reset Peer Filters
                </Button>
              </div>
            </Card>
          )}

          {/* Peer Result Cards Grid */}
          {!loading && peerResults.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {peerResults.map((p) => (
                  <Link key={p.id} href={`/users/${p.id}`} className="block group">
                    <Card className="p-5 border-[color:var(--color-border)] shadow-sm rounded-[var(--radius-lg)] bg-white h-full flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Peer Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={p.fullName}
                              department={p.department}
                              src={p.avatarUrl}
                              size="md"
                            />
                            <div>
                              <h3 className="text-base font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors">
                                {p.fullName}
                              </h3>
                              <p className="text-xs text-[color:var(--color-text-muted)]">
                                {p.department}
                                {p.branch ? ` • ${p.branch}` : ""}
                                {p.graduationYear ? ` • Class of ${p.graduationYear}` : ""}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant={p.helpAvailable ? "success" : "outline"}
                            className="text-[10px] px-2 py-0.5 shrink-0"
                          >
                            {p.helpAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </div>

                        {/* Bio preview if present */}
                        {p.bio && (
                          <p className="text-xs text-[color:var(--color-text-muted)] line-clamp-2 italic">
                            &ldquo;{p.bio}&rdquo;
                          </p>
                        )}

                        {/* Skills Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {p.skills.slice(0, 4).map((sk) => (
                            <span
                              key={sk.id}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text)] border border-[color:var(--color-border)] flex items-center gap-1"
                            >
                              <span>{sk.name}</span>
                              <span className="text-[9px] font-bold text-[color:var(--color-primary)] uppercase">
                                {sk.level.slice(0, 3)}
                              </span>
                            </span>
                          ))}
                          {p.skills.length > 4 && (
                            <span className="text-[10px] text-[color:var(--color-text-muted)] self-center font-medium">
                              +{p.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Stats & CTA */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[color:var(--color-border)]/60 text-xs text-[color:var(--color-text-muted)]">
                        <span>
                          {p.stats.answersCount} {p.stats.answersCount === 1 ? "answer" : "answers"} contributed
                        </span>

                        <span className="font-semibold text-[color:var(--color-primary)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          View Profile
                          <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Peers Pagination */}
              {peerPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={peerPagination.page <= 1}
                    onClick={() => updateFilters({ page: (peerPagination.page - 1).toString() })}
                  >
                    <ArrowLeft className="size-4 mr-1" />
                    Previous
                  </Button>

                  <span className="text-xs text-[color:var(--color-text-muted)] font-medium">
                    Page {peerPagination.page} of {peerPagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={peerPagination.page >= peerPagination.totalPages}
                    onClick={() => updateFilters({ page: (peerPagination.page + 1).toString() })}
                  >
                    Next
                    <ArrowRight className="size-4 ml-1" />
                  </Button>
                </div>
              )}
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
          <span>Loading discovery search...</span>
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
