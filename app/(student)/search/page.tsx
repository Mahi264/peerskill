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
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertBanner } from "@/components/ui/toast";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";
import { ViewerConnectionInfo } from "@/lib/validations/connection";
import {
  CACHE_KEYS,
  getCached,
  setCached,
  subscribe,
} from "@/lib/data-cache";

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
    branch?: string | null;
    section?: string | null;
    graduationYear?: number | null;
    avatarUrl?: string | null;
  };
  skills: Array<{ id: string; name: string; slug: string }>;
}

interface SearchPeer {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  branch: string | null;
  section?: string | null;
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
  viewerConnection?: ViewerConnectionInfo;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CachedKnowledgeData {
  doubts: SearchDoubt[];
  pagination: Pagination;
}

interface CachedPeersData {
  peers: SearchPeer[];
  pagination: Pagination;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") === "peers" ? "peers" : "doubts";
  const doubtQuery = searchParams.get("q") || "";
  const peerQuery = searchParams.get("peerQuery") || searchParams.get("peerQ") || "";
  const activeQuery = currentTab === "doubts" ? doubtQuery : peerQuery;

  // Doubts filters
  const filterStatus = searchParams.get("status") || "ALL";
  const filterUrgency = searchParams.get("urgency") || "ALL";
  const filterSkill = searchParams.get("skill") || searchParams.get("skillId") || "";

  // Peers filters
  const filterAvailable = searchParams.get("available") === "true";
  const filterLevel = searchParams.get("level") || "ALL";

  const currentPage = Number.parseInt(searchParams.get("page") || "1", 10);

  // Deterministic Cache Keys
  const currentKnowledgeKey = CACHE_KEYS.searchKnowledge({
    q: doubtQuery,
    status: filterStatus,
    urgency: filterUrgency,
    skillId: filterSkill,
    page: currentPage,
  });

  const currentPeersKey = CACHE_KEYS.searchPeers({
    q: peerQuery,
    available: filterAvailable,
    level: filterLevel,
    skill: filterSkill,
    page: currentPage,
  });

  // Synchronous Render 0 Hydration
  const cachedKnowledge = doubtQuery.trim()
    ? getCached<CachedKnowledgeData>(currentKnowledgeKey)
    : null;
  const cachedPeers = getCached<CachedPeersData>(currentPeersKey);

  const initialDoubtResults = cachedKnowledge?.data?.doubts || [];
  const initialDoubtPagination = cachedKnowledge?.data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  const initialPeerResults = cachedPeers?.data?.peers || [];
  const initialPeerPagination = cachedPeers?.data?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  const initialLoading =
    currentTab === "doubts"
      ? Boolean(doubtQuery.trim() && !cachedKnowledge)
      : !cachedPeers;

  const [loading, setLoading] = React.useState(initialLoading);
  const [error, setError] = React.useState<string | null>(null);

  // Doubts state
  const [doubtResults, setDoubtResults] = React.useState<SearchDoubt[]>(initialDoubtResults);
  const [doubtPagination, setDoubtPagination] = React.useState<Pagination>(initialDoubtPagination);

  // Peers state
  const [peerResults, setPeerResults] = React.useState<SearchPeer[]>(initialPeerResults);
  const [peerPagination, setPeerPagination] = React.useState<Pagination>(initialPeerPagination);

  const requestIdRef = React.useRef(0);

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
      const queryString = params.toString();
      router.push(queryString ? `/search?${queryString}` : "/search");
    },
    [router, searchParams],
  );

  const handleTabChange = (tab: "doubts" | "peers") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "doubts") {
      params.delete("tab");
    } else {
      params.set("tab", "peers");
    }
    params.delete("page");
    const queryString = params.toString();
    router.push(queryString ? `/search?${queryString}` : "/search");
  };

  const handleSearchSubmit = (newQuery: string) => {
    if (currentTab === "doubts") {
      updateFilters({ q: newQuery || null, page: null });
    } else {
      updateFilters({ peerQuery: newQuery || null, peerQ: null, page: null });
    }
  };

  const handleSearchClear = () => {
    if (currentTab === "doubts") {
      updateFilters({ q: null, page: null });
    } else {
      updateFilters({ peerQuery: null, peerQ: null, page: null });
    }
  };

  // Run Search Effect with Caching, Stale-While-Revalidate, Race Safety & Subscriptions
  React.useEffect(() => {
    let ignore = false;
    const currentReqId = ++requestIdRef.current;

    if (currentTab === "doubts") {
      if (!doubtQuery.trim()) {
        if (!ignore && currentReqId === requestIdRef.current) {
          setDoubtResults([]);
          setDoubtPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
          setLoading(false);
          setError(null);
        }
        return;
      }

      const cached = getCached<CachedKnowledgeData>(currentKnowledgeKey);
      if (cached?.data) {
        if (!ignore && currentReqId === requestIdRef.current) {
          setDoubtResults(cached.data.doubts || []);
          setDoubtPagination(
            cached.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
          );
          setLoading(false);
        }
      } else {
        if (!ignore && currentReqId === requestIdRef.current) {
          setDoubtResults([]);
          setLoading(true);
        }
      }

      async function runKnowledgeSearch() {
        if (!cached || cached.isStale) {
          try {
            const params = new URLSearchParams();
            params.set("q", doubtQuery.trim());
            if (filterStatus !== "ALL") params.set("status", filterStatus);
            if (filterUrgency !== "ALL") params.set("urgency", filterUrgency);
            if (filterSkill) params.set("skillId", filterSkill);
            if (currentPage > 1) params.set("page", currentPage.toString());

            const res = await fetch(`/api/search/knowledge?${params.toString()}`);
            if (!res.ok) {
              throw new Error("Failed to load knowledge search results.");
            }

            const json = await res.json();
            if (!ignore && currentReqId === requestIdRef.current) {
              const freshDoubts: SearchDoubt[] = json.data?.doubts || [];
              const freshPagination: Pagination =
                json.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
              setDoubtResults(freshDoubts);
              setDoubtPagination(freshPagination);
              setCached(
                currentKnowledgeKey,
                { doubts: freshDoubts, pagination: freshPagination },
                30_000,
              );
              setError(null);
            }
          } catch {
            if (!ignore && currentReqId === requestIdRef.current && !cached?.data) {
              setError("Unable to search campus knowledge right now. Please try again.");
            }
          } finally {
            if (!ignore && currentReqId === requestIdRef.current) {
              setLoading(false);
            }
          }
        }
      }

      void runKnowledgeSearch();

      const unsubscribe = subscribe(currentKnowledgeKey, (updatedData) => {
        if (updatedData !== undefined) {
          const payload = updatedData as CachedKnowledgeData;
          if (!ignore && currentReqId === requestIdRef.current) {
            setDoubtResults(payload?.doubts || []);
            setDoubtPagination(
              payload?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
            );
          }
        } else {
          void runKnowledgeSearch();
        }
      });

      return () => {
        ignore = true;
        unsubscribe();
      };
    } else {
      // Peers search
      const cached = getCached<CachedPeersData>(currentPeersKey);
      if (cached?.data) {
        if (!ignore && currentReqId === requestIdRef.current) {
          setPeerResults(cached.data.peers || []);
          setPeerPagination(
            cached.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
          );
          setLoading(false);
        }
      } else {
        if (!ignore && currentReqId === requestIdRef.current) {
          setPeerResults([]);
          setLoading(true);
        }
      }

      async function runPeersSearch() {
        if (!cached || cached.isStale) {
          try {
            const params = new URLSearchParams();
            if (peerQuery.trim()) params.set("q", peerQuery.trim());
            if (filterAvailable) params.set("available", "true");
            if (filterLevel !== "ALL") params.set("level", filterLevel);
            if (filterSkill) params.set("skill", filterSkill);
            if (currentPage > 1) params.set("page", currentPage.toString());

            const res = await fetch(`/api/search/peers?${params.toString()}`);
            if (!res.ok) {
              throw new Error("Failed to load campus peers.");
            }

            const json = await res.json();
            if (!ignore && currentReqId === requestIdRef.current) {
              const freshPeers: SearchPeer[] = json.data?.peers || [];
              const freshPagination: Pagination =
                json.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
              setPeerResults(freshPeers);
              setPeerPagination(freshPagination);
              setCached(
                currentPeersKey,
                { peers: freshPeers, pagination: freshPagination },
                30_000,
              );
              setError(null);
            }
          } catch {
            if (!ignore && currentReqId === requestIdRef.current && !cached?.data) {
              setError("Unable to search campus peers right now. Please try again.");
            }
          } finally {
            if (!ignore && currentReqId === requestIdRef.current) {
              setLoading(false);
            }
          }
        }
      }

      void runPeersSearch();

      const unsubscribe = subscribe(currentPeersKey, (updatedData) => {
        if (updatedData !== undefined) {
          const payload = updatedData as CachedPeersData;
          if (!ignore && currentReqId === requestIdRef.current) {
            setPeerResults(payload?.peers || []);
            setPeerPagination(
              payload?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
            );
          }
        } else {
          void runPeersSearch();
        }
      });

      return () => {
        ignore = true;
        unsubscribe();
      };
    }
  }, [
    currentTab,
    doubtQuery,
    peerQuery,
    filterStatus,
    filterUrgency,
    filterSkill,
    filterAvailable,
    filterLevel,
    currentPage,
    currentKnowledgeKey,
    currentPeersKey,
  ]);

  // Synchronize peer relationship status live from external connection mutations
  React.useEffect(() => {
    const unsubscribe = subscribe("peer:connection:*", (payload: unknown) => {
      const event = payload as { key?: string; data?: ViewerConnectionInfo } | undefined;
      if (!event?.key) return;
      const targetUserId = event.key.replace("peer:connection:", "");
      if (!targetUserId) return;

      setPeerResults((prev) =>
        prev.map((p) =>
          p.id === targetUserId
            ? { ...p, viewerConnection: event.data || undefined }
            : p,
        ),
      );
    });

    return unsubscribe;
  }, []);

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

  const popularKnowledgeQueries = [
    "Data Structures",
    "React useEffect",
    "DBMS Normalization",
    "Python Recursion",
    "C++ Pointers",
  ];

  const suggestedPeerSkills = [
    "C++",
    "Python",
    "Java",
    "React",
    "Data Structures",
    "Algorithms",
    "DBMS",
    "Machine Learning",
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[color:var(--color-border)]/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <SearchIcon className="size-6 text-[color:var(--color-primary)]" />
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">
              Campus Discovery
            </h1>
          </div>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Search solved course doubts, explore peer answers, and discover verified MITS classmates.
          </p>
        </div>

        <Link href="/doubts/new">
          <Button className="gap-2">
            <Plus className="size-4" />
            Ask a Doubt
          </Button>
        </Link>
      </div>

      {/* Top Search Controls Bar */}
      <div className="space-y-4">
        {/* Full-width Search Input */}
        <HeaderSearch
          key={currentTab}
          initialValue={activeQuery}
          placeholder={
            currentTab === "doubts"
              ? "Search campus doubts & solutions..."
              : "Search campus peers by name or skill..."
          }
          onSearch={handleSearchSubmit}
          onClear={handleSearchClear}
          className="max-w-none"
        />

        {/* Tab Switcher */}
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
            <span>Campus Doubts & Solutions</span>
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
            <span>Campus Peers & Skills</span>
          </button>
        </div>
      </div>

      {error && <AlertBanner variant="error" message={error} />}

      {/* TAB 1: KNOWLEDGE / DOUBTS SEARCH */}
      {currentTab === "doubts" && (
        <div className="space-y-6">
          {/* Doubts Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">
                Filters:
              </span>

              {/* Status Filter */}
              <Select
                value={filterStatus}
                onChange={(e) => updateFilters({ status: e.target.value })}
                className="h-8 text-xs font-medium w-32"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open Only</option>
                <option value="RESOLVED">Resolved Only</option>
              </Select>

              {/* Urgency Filter */}
              <Select
                value={filterUrgency}
                onChange={(e) => updateFilters({ urgency: e.target.value })}
                className="h-8 text-xs font-medium w-36"
              >
                <option value="ALL">All Urgencies</option>
                <option value="CURIOUS">Curious</option>
                <option value="ASSIGNMENT_STUCK">Assignment Stuck</option>
                <option value="PROJECT_BLOCKED">Project Blocked</option>
                <option value="EXAM_PREP">Exam Prep</option>
              </Select>
            </div>

            <div className="text-xs text-[color:var(--color-text-muted)] font-medium">
              {doubtPagination.total} {doubtPagination.total === 1 ? "result" : "results"} found
            </div>
          </div>

          {/* Initial / Empty Query State */}
          {!doubtQuery.trim() && (
            <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed bg-white border-[color:var(--color-border)] shadow-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)] mb-1">
                <SearchIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[color:var(--color-text)]">
                  Search campus knowledge
                </h2>
                <p className="text-xs sm:text-sm text-[color:var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                  Try a course, error message, concept, or skill to discover existing doubts and accepted peer answers.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-text-muted)]">
                  Popular Queries
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                  {popularKnowledgeQueries.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSearchSubmit(q)}
                      className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3.5 py-1.5 text-xs font-medium text-[color:var(--color-text)] hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] transition-colors shadow-xs cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Loading Skeleton */}
          {loading && doubtQuery.trim() && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="p-6 space-y-3 animate-pulse border-[color:var(--color-border)]">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </Card>
              ))}
            </div>
          )}

          {/* No Results Fallback */}
          {!loading && doubtQuery.trim() && doubtResults.length === 0 && (
            <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed bg-white border-[color:var(--color-border)] shadow-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                <HelpCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[color:var(--color-text)]">
                  No matching campus doubts found
                </h3>
                <p className="text-xs sm:text-sm text-[color:var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                  We couldn&apos;t find any questions matching &ldquo;{doubtQuery}&rdquo;. Try different keywords or post your question for classmates!
                </p>
              </div>
              <Button asChild size="sm" className="gap-2">
                <Link href="/doubts/new">
                  <Plus className="size-4" />
                  Ask this Doubt to Peers
                </Link>
              </Button>
            </Card>
          )}

          {/* Results Stream */}
          {!loading && doubtResults.length > 0 && (
            <div className="space-y-4">
              {doubtResults.map((doubt) => (
                <Card
                  key={doubt.id}
                  className="p-5 sm:p-6 space-y-3.5 border-[color:var(--color-border)] shadow-sm hover:border-[color:var(--color-border-focus)] transition-colors rounded-[var(--radius-md)]"
                >
                  <CardContent className="p-0 space-y-3">
                    {/* Urgency & Status Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getUrgencyBadge(doubt.urgency)}
                        {doubt.status === "RESOLVED" ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="size-3" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </div>

                      {/* Skill Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
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
                          src={doubt.author.avatarUrl}
                          size="sm"
                        />
                        <span className="font-medium text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)]">
                          {doubt.author.fullName}
                        </span>
                        <span>•</span>
                        <span>{formatPublicPeerAcademicSubtitle(doubt.author)}</span>
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
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[color:var(--color-surface)] rounded-[var(--radius-md)] border border-[color:var(--color-border)] shadow-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-[color:var(--color-text-muted)] uppercase tracking-wider">
                Peer Filters:
              </span>

              {/* Minimum Proficiency Level */}
              <Select
                value={filterLevel}
                onChange={(e) => updateFilters({ level: e.target.value })}
                className="h-8 text-xs font-medium w-36"
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
                      : "bg-[color:var(--color-surface)] text-[color:var(--color-text)] border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]"
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
              {[1, 2, 3, 4].map((n) => (
                <Card key={n} className="p-5 space-y-3 animate-pulse border-[color:var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gray-200" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </Card>
              ))}
            </div>
          )}

          {/* No Peers Fallback */}
          {!loading && peerResults.length === 0 && (
            <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed bg-white border-[color:var(--color-border)] shadow-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)] text-[color:var(--color-text-muted)]">
                <Users className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[color:var(--color-text)]">
                  No peers found matching your filters
                </h3>
                <p className="text-xs sm:text-sm text-[color:var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
                  Try clearing your search query or selecting &ldquo;All Levels&rdquo; to find classmates.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push("/search?tab=peers");
                }}
              >
                Clear Peer Filters
              </Button>
            </Card>
          )}

          {/* Peer Results Grid */}
          {!loading && peerResults.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {peerResults.map((p) => (
                  <Link key={p.id} href={`/users/${p.id}`} className="block group">
                    <Card className="p-5 border-[color:var(--color-border)] shadow-sm rounded-[var(--radius-md)] bg-white h-full flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Peer Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={p.fullName}
                              src={p.avatarUrl}
                              size="md"
                            />
                            <div>
                              <h3 className="text-base font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors">
                                {p.fullName}
                              </h3>
                              <p className="text-xs text-[color:var(--color-text-muted)]">
                                {formatPublicPeerAcademicSubtitle(p)}
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
                        <div className="flex items-center gap-2">
                          <span>
                            {p.stats.answersCount} {p.stats.answersCount === 1 ? "answer" : "answers"}
                          </span>
                          {p.viewerConnection?.state === "CONNECTED" && (
                            <Badge variant="success" className="text-[10px] py-0 px-1.5 font-medium">
                              Connected
                            </Badge>
                          )}
                          {p.viewerConnection?.state === "PENDING_OUTGOING" && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-50 text-amber-800 border-amber-300">
                              Requested
                            </Badge>
                          )}
                          {p.viewerConnection?.state === "PENDING_INCOMING" && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-50 text-emerald-800 border-emerald-300">
                              Respond
                            </Badge>
                          )}
                        </div>

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
  return (
    <React.Suspense fallback={<div className="p-4 text-center text-sm">Loading...</div>}>
      <SearchPageContent />
    </React.Suspense>
  );
}
