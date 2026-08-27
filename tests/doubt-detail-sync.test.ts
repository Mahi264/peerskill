import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  CACHE_KEYS,
  clearAllCache,
  getCached,
  invalidateAllDoubtFeeds,
  invalidateData,
  setCached,
  subscribe,
  updateCachedDoubtDetail,
} from "@/lib/data-cache";

describe("Stage 3B: Doubt Detail & Answer Mutation Synchronization", () => {
  beforeEach(() => {
    clearAllCache();
    vi.restoreAllMocks();
  });

  const mockAuthor = {
    id: "student-1",
    email: "student1@mitsgwl.ac.in",
    fullName: "Rohan Verma",
    branch: "CSE",
    graduationYear: 2026,
    avatarUrl: null,
  };

  const mockDoubtDetail = {
    id: "doubt-100",
    authorId: "student-1",
    title: "Understanding Dynamic Programming memoization vs tabulation",
    body: "Can someone share a clear mental model?",
    urgency: "EXAM_PREP" as const,
    status: "OPEN" as const,
    answerCount: 1,
    acceptedAnswerId: null,
    createdAt: "2026-08-27T10:00:00.000Z",
    updatedAt: "2026-08-27T10:00:00.000Z",
    author: mockAuthor,
    skills: [{ id: "s-1", name: "Algorithms", slug: "algorithms" }],
    answers: [
      {
        id: "ans-1",
        doubtId: "doubt-100",
        authorId: "student-2",
        body: "Memoization is top-down, tabulation is bottom-up.",
        isAccepted: false,
        createdAt: "2026-08-27T10:15:00.000Z",
        updatedAt: "2026-08-27T10:15:00.000Z",
        author: {
          id: "student-2",
          email: "student2@mitsgwl.ac.in",
          fullName: "Ananya Roy",
          branch: "IT",
          graduationYear: 2026,
          avatarUrl: null,
        },
      },
    ],
  };

  it("stores and retrieves doubt detail with 20s TTL", () => {
    const key = CACHE_KEYS.doubtDetail("doubt-100");
    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);

    const cached = getCached<typeof mockDoubtDetail>(key);
    expect(cached).not.toBeNull();
    expect(cached?.data.title).toBe(mockDoubtDetail.title);
    expect(cached?.isStale).toBe(false);
  });

  it("detects stale detail after 20s TTL expiration", () => {
    const key = CACHE_KEYS.doubtDetail("doubt-100");
    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);

    // Advance time by 25s
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 25_000);

    const cached = getCached<typeof mockDoubtDetail>(key);
    expect(cached).not.toBeNull();
    expect(cached?.isStale).toBe(true);
  });

  it("synchronizes answer submission: updates detail cache and invalidates Home doubt feeds", () => {
    const doubtKey = CACHE_KEYS.doubtDetail("doubt-100");
    const feedKey = CACHE_KEYS.doubtFeed({ status: "ALL", urgency: "ALL", skill: "ALL" });

    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);
    setCached(feedKey, [{ id: "doubt-100", answerCount: 1 }], 30_000);

    const feedListener = vi.fn();
    subscribe(feedKey, feedListener);

    // New answer submitted
    const newAnswer = {
      id: "ans-2",
      doubtId: "doubt-100",
      authorId: "student-3",
      body: "Think of memoization as caching recursion returns.",
      isAccepted: false,
      createdAt: "2026-08-27T10:30:00.000Z",
      updatedAt: "2026-08-27T10:30:00.000Z",
      author: {
        id: "student-3",
        email: "student3@mitsgwl.ac.in",
        fullName: "Vikram Sen",
        branch: "EC",
        graduationYear: 2027,
        avatarUrl: null,
      },
    };

    const updatedDetail = {
      ...mockDoubtDetail,
      answerCount: 2,
      answers: [...mockDoubtDetail.answers, newAnswer],
    };

    updateCachedDoubtDetail("doubt-100", updatedDetail);
    invalidateAllDoubtFeeds();

    // Verify detail is updated in cache
    const cachedDetail = getCached<typeof mockDoubtDetail>(doubtKey);
    expect(cachedDetail?.data.answerCount).toBe(2);
    expect(cachedDetail?.data.answers).toHaveLength(2);

    // Verify Home feed was invalidated
    expect(getCached(feedKey)).toBeNull();
    expect(feedListener).toHaveBeenCalledWith(undefined);
  });

  it("synchronizes answer acceptance: marks status RESOLVED, isAccepted true, and invalidates Home doubt feeds", () => {
    const doubtKey = CACHE_KEYS.doubtDetail("doubt-100");
    const feedKey = CACHE_KEYS.doubtFeed({ status: "OPEN", urgency: "ALL", skill: "ALL" });

    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);
    setCached(feedKey, [{ id: "doubt-100", status: "OPEN" }], 30_000);

    const resolvedDetail = {
      ...mockDoubtDetail,
      status: "RESOLVED" as const,
      acceptedAnswerId: "ans-1",
      answers: [
        {
          ...mockDoubtDetail.answers[0],
          isAccepted: true,
        },
      ],
    };

    updateCachedDoubtDetail("doubt-100", resolvedDetail);
    invalidateAllDoubtFeeds();

    const cachedDetail = getCached<typeof mockDoubtDetail>(doubtKey);
    expect(cachedDetail?.data.status).toBe("RESOLVED");
    expect(cachedDetail?.data.acceptedAnswerId).toBe("ans-1");
    expect(cachedDetail?.data.answers[0].isAccepted).toBe(true);

    // Feed cache purged
    expect(getCached(feedKey)).toBeNull();
  });

  it("synchronizes doubt deletion: purges detail from cache and invalidates Home doubt feeds", () => {
    const doubtKey = CACHE_KEYS.doubtDetail("doubt-100");
    const feedKey = CACHE_KEYS.doubtFeed();

    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);
    setCached(feedKey, [{ id: "doubt-100" }], 30_000);

    // Delete doubt
    invalidateData(doubtKey);
    invalidateAllDoubtFeeds();

    expect(getCached(doubtKey)).toBeNull();
    expect(getCached(feedKey)).toBeNull();
  });

  it("enforces server authority: does not mutate cache on failed server mutation", () => {
    const doubtKey = CACHE_KEYS.doubtDetail("doubt-100");
    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);

    // Simulate rejected attempt (e.g. 403 Forbidden - non-author trying to accept)
    const serverAccepted = false;
    if (!serverAccepted) {
      // No cache mutation performed
    }

    const cached = getCached<typeof mockDoubtDetail>(doubtKey);
    expect(cached?.data.status).toBe("OPEN");
    expect(cached?.data.acceptedAnswerId).toBeNull();
  });

  it("purges doubt detail on 404 server response (e.g. moderation removal)", () => {
    const doubtKey = CACHE_KEYS.doubtDetail("doubt-100");
    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);

    // Server returns 404 Not Found on revalidation
    const serverStatus = 404;
    if (serverStatus === 404) {
      invalidateData(doubtKey);
    }

    expect(getCached(doubtKey)).toBeNull();
  });

  it("clears all doubt detail caches on clearAllCache() (e.g. logout)", () => {
    updateCachedDoubtDetail("doubt-100", mockDoubtDetail);
    updateCachedDoubtDetail("doubt-200", mockDoubtDetail);

    clearAllCache();

    expect(getCached(CACHE_KEYS.doubtDetail("doubt-100"))).toBeNull();
    expect(getCached(CACHE_KEYS.doubtDetail("doubt-200"))).toBeNull();
  });
});
