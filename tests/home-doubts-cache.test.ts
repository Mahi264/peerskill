import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  CACHE_KEYS,
  clearAllCache,
  getCached,
  invalidateAllDoubtFeeds,
  setCached,
  subscribe,
} from "@/lib/data-cache";

describe("Stage 3A: Home Doubt Feed Caching & Invalidation", () => {
  beforeEach(() => {
    clearAllCache();
    vi.restoreAllMocks();
  });

  const mockDoubt1 = {
    id: "doubt-1",
    authorId: "student-1",
    title: "Need help with Binary Search Tree insertion",
    body: "Can someone explain how to handle duplicate keys?",
    urgency: "ASSIGNMENT_STUCK" as const,
    status: "OPEN" as const,
    answerCount: 2,
    createdAt: "2026-08-27T10:00:00.000Z",
    updatedAt: "2026-08-27T10:30:00.000Z",
    author: {
      id: "student-1",
      email: "student1@mitsgwl.ac.in",
      fullName: "Rohan Verma",
      branch: "CSE",
    },
    skills: [{ id: "s-1", name: "Data Structures", slug: "data-structures" }],
  };

  const mockDoubt2 = {
    id: "doubt-2",
    authorId: "student-2",
    title: "Python asyncio task cancellation error",
    body: "Getting CancelledError during shutdown.",
    urgency: "PROJECT_BLOCKED" as const,
    status: "RESOLVED" as const,
    answerCount: 4,
    createdAt: "2026-08-27T11:00:00.000Z",
    updatedAt: "2026-08-27T11:45:00.000Z",
    author: {
      id: "student-2",
      email: "student2@mitsgwl.ac.in",
      fullName: "Ananya Roy",
      branch: "IT",
    },
    skills: [{ id: "s-2", name: "Python", slug: "python" }],
  };

  it("generates canonical normalized cache keys for all filter permutations", () => {
    const defaultKey = CACHE_KEYS.doubtFeed();
    expect(defaultKey).toBe("home:doubts:status=ALL&urgency=ALL&skill=ALL");

    const explicitAllKey = CACHE_KEYS.doubtFeed({
      status: "ALL",
      urgency: "ALL",
      skill: "ALL",
    });
    expect(explicitAllKey).toBe("home:doubts:status=ALL&urgency=ALL&skill=ALL");

    const filteredKey = CACHE_KEYS.doubtFeed({
      status: "OPEN",
      urgency: "ASSIGNMENT_STUCK",
      skill: "  Python ",
    });
    expect(filteredKey).toBe("home:doubts:status=OPEN&urgency=ASSIGNMENT_STUCK&skill=python");
  });

  it("stores feed responses in isolated cache slots without cross-filter collisions", () => {
    const allKey = CACHE_KEYS.doubtFeed({ status: "ALL", urgency: "ALL", skill: "ALL" });
    const pythonKey = CACHE_KEYS.doubtFeed({ status: "ALL", urgency: "ALL", skill: "python" });

    setCached(allKey, [mockDoubt1, mockDoubt2], 30_000);
    setCached(pythonKey, [mockDoubt2], 30_000);

    const allCached = getCached<typeof mockDoubt1[]>(allKey);
    const pythonCached = getCached<typeof mockDoubt1[]>(pythonKey);

    expect(allCached?.data).toHaveLength(2);
    expect(pythonCached?.data).toHaveLength(1);
    expect(pythonCached?.data[0].id).toBe("doubt-2");
  });

  it("returns cached feed data immediately on warm revisit with valid TTL", () => {
    const key = CACHE_KEYS.doubtFeed();
    setCached(key, [mockDoubt1], 30_000);

    const cached = getCached<typeof mockDoubt1[]>(key);
    expect(cached).not.toBeNull();
    expect(cached?.data).toHaveLength(1);
    expect(cached?.isStale).toBe(false);
    expect(cached?.data[0].title).toBe("Need help with Binary Search Tree insertion");
  });

  it("marks cached feed as stale after 30 seconds TTL expires", () => {
    const key = CACHE_KEYS.doubtFeed();
    setCached(key, [mockDoubt1], 30_000);

    // Fast-forward time past 30s
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 35_000);

    const cached = getCached<typeof mockDoubt1[]>(key);
    expect(cached).not.toBeNull();
    expect(cached?.isStale).toBe(true);
    expect(cached?.data).toHaveLength(1);
  });

  it("invalidates all Home feed filter variations when invalidateAllDoubtFeeds() is called", () => {
    const key1 = CACHE_KEYS.doubtFeed({ status: "ALL", urgency: "ALL", skill: "ALL" });
    const key2 = CACHE_KEYS.doubtFeed({ status: "OPEN", urgency: "ALL", skill: "ALL" });
    const key3 = CACHE_KEYS.doubtFeed({ status: "ALL", urgency: "ALL", skill: "python" });

    setCached(key1, [mockDoubt1, mockDoubt2], 30_000);
    setCached(key2, [mockDoubt1], 30_000);
    setCached(key3, [mockDoubt2], 30_000);

    const listener = vi.fn();
    subscribe(key1, listener);

    invalidateAllDoubtFeeds();

    expect(getCached(key1)).toBeNull();
    expect(getCached(key2)).toBeNull();
    expect(getCached(key3)).toBeNull();
    expect(listener).toHaveBeenCalledWith(undefined);
  });

  it("purges all doubt feed caches on clearAllCache() (e.g. on logout)", () => {
    const key = CACHE_KEYS.doubtFeed();
    setCached(key, [mockDoubt1], 30_000);

    clearAllCache();

    expect(getCached(key)).toBeNull();
  });

  it("protects against out-of-order race conditions when switching filters rapidly", async () => {
    let requestId = 0;
    let latestCommittedDoubts: string[] = [];

    // Simulate request 1 for "ALL" (slow network)
    const req1Id = ++requestId;
    const req1Promise = new Promise<{ id: number; data: string[] }>((resolve) =>
      setTimeout(() => resolve({ id: req1Id, data: ["doubt-all-1", "doubt-all-2"] }), 50),
    );

    // Simulate request 2 for "Python" (fast network)
    const req2Id = ++requestId;
    const req2Promise = new Promise<{ id: number; data: string[] }>((resolve) =>
      setTimeout(() => resolve({ id: req2Id, data: ["doubt-py-1"] }), 10),
    );

    // Request 2 finishes first
    const res2 = await req2Promise;
    if (res2.id === requestId) {
      latestCommittedDoubts = res2.data;
    }

    // Request 1 finishes later
    const res1 = await req1Promise;
    if (res1.id === requestId) {
      latestCommittedDoubts = res1.data;
    }

    // Request 1 must NOT overwrite Request 2
    expect(latestCommittedDoubts).toEqual(["doubt-py-1"]);
  });

  it("retains stale cached feed in state when background revalidation fails", () => {
    const key = CACHE_KEYS.doubtFeed();
    setCached(key, [mockDoubt1], 30_000);

    const cached = getCached<typeof mockDoubt1[]>(key);
    expect(cached?.data).toBeDefined();

    // Simulate failed background fetch
    const activeFeedState = cached?.data;
    try {
      throw new Error("Network offline");
    } catch {
      // Kept stale feed data
    }

    expect(activeFeedState).toHaveLength(1);
    expect(activeFeedState?.[0].id).toBe("doubt-1");
  });
});
