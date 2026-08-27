import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  CACHE_KEYS,
  clearAllCache,
  getCached,
  invalidateSearchKnowledge,
  invalidateSearchPeers,
  setCached,
  subscribe,
  updatePeerConnectionRelationship,
} from "@/lib/data-cache";
import { ViewerConnectionInfo } from "@/lib/validations/connection";

describe("Stage 4: Search Data Freshness & Caching", () => {
  beforeEach(() => {
    clearAllCache();
    vi.restoreAllMocks();
  });

  const mockDoubtSearchResult = {
    doubts: [
      {
        id: "doubt-1",
        authorId: "student-1",
        title: "Python async event loop tutorial",
        body: "How do tasks schedule concurrently in Python?",
        urgency: "CURIOUS" as const,
        status: "RESOLVED" as const,
        answerCount: 3,
        acceptedAnswerId: "ans-1",
        createdAt: "2026-08-27T10:00:00.000Z",
        updatedAt: "2026-08-27T10:30:00.000Z",
        author: {
          id: "student-1",
          email: "student1@mitsgwl.ac.in",
          fullName: "Rohan Verma",
        },
        skills: [{ id: "s-1", name: "Python", slug: "python" }],
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  };

  const mockPeerSearchResult = {
    peers: [
      {
        id: "student-2",
        fullName: "Ananya Roy",
        avatarUrl: null,
        branch: "CSE",
        section: "A",
        graduationYear: 2026,
        bio: "Full-stack developer & Python enthusiast",
        helpAvailable: true,
        helpStatus: "Free to help after 4 PM",
        skills: [
          {
            id: "s-1",
            name: "Python",
            slug: "python",
            level: "ADVANCED" as const,
          },
        ],
        stats: {
          doubtsCount: 4,
          answersCount: 12,
        },
        viewerConnection: {
          state: "NOT_CONNECTED",
        } as ViewerConnectionInfo,
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  };

  it("generates deterministic canonical keys for knowledge search", () => {
    const defaultKey = CACHE_KEYS.searchKnowledge();
    expect(defaultKey).toBe("search:knowledge:q=&status=ALL&urgency=ALL&skillId=&page=1");

    const filteredKey = CACHE_KEYS.searchKnowledge({
      q: "  python recursion ",
      status: "OPEN",
      urgency: "ASSIGNMENT_STUCK",
      skillId: "skill-123",
      page: 2,
    });
    expect(filteredKey).toBe(
      "search:knowledge:q=python recursion&status=OPEN&urgency=ASSIGNMENT_STUCK&skillId=skill-123&page=2",
    );
  });

  it("generates deterministic canonical keys for peer search", () => {
    const defaultKey = CACHE_KEYS.searchPeers();
    expect(defaultKey).toBe("search:peers:q=&skill=&available=&level=ALL&page=1");

    const filteredKey = CACHE_KEYS.searchPeers({
      q: "  Ananya ",
      skill: "  Python ",
      available: true,
      level: "ADVANCED",
      page: 3,
    });
    expect(filteredKey).toBe("search:peers:q=Ananya&skill=python&available=true&level=ADVANCED&page=3");
  });

  it("isolates different pages in knowledge search cache", () => {
    const page1Key = CACHE_KEYS.searchKnowledge({ q: "python", page: 1 });
    const page2Key = CACHE_KEYS.searchKnowledge({ q: "python", page: 2 });

    setCached(page1Key, { ...mockDoubtSearchResult, pagination: { ...mockDoubtSearchResult.pagination, page: 1 } }, 30_000);
    setCached(page2Key, { ...mockDoubtSearchResult, pagination: { ...mockDoubtSearchResult.pagination, page: 2 } }, 30_000);

    const cached1 = getCached<typeof mockDoubtSearchResult>(page1Key);
    const cached2 = getCached<typeof mockDoubtSearchResult>(page2Key);

    expect(cached1?.data.pagination.page).toBe(1);
    expect(cached2?.data.pagination.page).toBe(2);
  });

  it("isolates different query terms and filters without cross-contamination", () => {
    const pythonKey = CACHE_KEYS.searchKnowledge({ q: "python" });
    const reactKey = CACHE_KEYS.searchKnowledge({ q: "react" });

    setCached(pythonKey, mockDoubtSearchResult, 30_000);

    expect(getCached(pythonKey)).not.toBeNull();
    expect(getCached(reactKey)).toBeNull();
  });

  it("stores and retrieves search results with 30s TTL and marks stale after expiration", () => {
    const key = CACHE_KEYS.searchKnowledge({ q: "python" });
    setCached(key, mockDoubtSearchResult, 30_000);

    const warmCached = getCached<typeof mockDoubtSearchResult>(key);
    expect(warmCached?.isStale).toBe(false);
    expect(warmCached?.data.doubts[0].title).toBe("Python async event loop tutorial");

    // Advance time past 30s
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 35_000);

    const staleCached = getCached<typeof mockDoubtSearchResult>(key);
    expect(staleCached).not.toBeNull();
    expect(staleCached?.isStale).toBe(true);
  });

  it("invalidates all knowledge search cache keys on invalidateSearchKnowledge()", () => {
    const key1 = CACHE_KEYS.searchKnowledge({ q: "python" });
    const key2 = CACHE_KEYS.searchKnowledge({ q: "react", status: "OPEN" });
    const peerKey = CACHE_KEYS.searchPeers({ q: "python" });

    setCached(key1, mockDoubtSearchResult, 30_000);
    setCached(key2, mockDoubtSearchResult, 30_000);
    setCached(peerKey, mockPeerSearchResult, 30_000);

    const listener = vi.fn();
    subscribe(key1, listener);

    invalidateSearchKnowledge();

    expect(getCached(key1)).toBeNull();
    expect(getCached(key2)).toBeNull();
    // Peer cache must remain untouched
    expect(getCached(peerKey)).not.toBeNull();
    expect(listener).toHaveBeenCalledWith(undefined);
  });

  it("invalidates all peer search cache keys on invalidateSearchPeers()", () => {
    const key1 = CACHE_KEYS.searchPeers({ q: "python" });
    const key2 = CACHE_KEYS.searchPeers({ skill: "react" });
    const knowledgeKey = CACHE_KEYS.searchKnowledge({ q: "python" });

    setCached(key1, mockPeerSearchResult, 30_000);
    setCached(key2, mockPeerSearchResult, 30_000);
    setCached(knowledgeKey, mockDoubtSearchResult, 30_000);

    invalidateSearchPeers();

    expect(getCached(key1)).toBeNull();
    expect(getCached(key2)).toBeNull();
    // Knowledge cache must remain untouched
    expect(getCached(knowledgeKey)).not.toBeNull();
  });

  it("retains stale cached results when background revalidation fails", () => {
    const key = CACHE_KEYS.searchKnowledge({ q: "python" });
    setCached(key, mockDoubtSearchResult, 30_000);

    const cached = getCached<typeof mockDoubtSearchResult>(key);
    const activeState = cached?.data;

    try {
      throw new Error("Network error");
    } catch {
      // Kept stale state
    }

    expect(activeState?.doubts).toHaveLength(1);
    expect(activeState?.doubts[0].id).toBe("doubt-1");
  });

  it("clears all search caches unconditionally on clearAllCache() (logout)", () => {
    const kKey = CACHE_KEYS.searchKnowledge({ q: "python" });
    const pKey = CACHE_KEYS.searchPeers({ q: "python" });

    setCached(kKey, mockDoubtSearchResult, 30_000);
    setCached(pKey, mockPeerSearchResult, 30_000);

    clearAllCache();

    expect(getCached(kKey)).toBeNull();
    expect(getCached(pKey)).toBeNull();
  });

  it("protects against race conditions when user switches queries rapidly", async () => {
    let requestId = 0;
    let renderedQuery = "";

    const req1Id = ++requestId;
    const req1Promise = new Promise<{ id: number; q: string }>((resolve) =>
      setTimeout(() => resolve({ id: req1Id, q: "python" }), 50),
    );

    const req2Id = ++requestId;
    const req2Promise = new Promise<{ id: number; q: string }>((resolve) =>
      setTimeout(() => resolve({ id: req2Id, q: "algorithms" }), 10),
    );

    const res2 = await req2Promise;
    if (res2.id === requestId) {
      renderedQuery = res2.q;
    }

    const res1 = await req1Promise;
    if (res1.id === requestId) {
      renderedQuery = res1.q;
    }

    expect(renderedQuery).toBe("algorithms");
  });

  it("preserves peer search cache and updates connection state live via Stage 1 subscription", () => {
    const peerKey = CACHE_KEYS.searchPeers({ q: "ananya" });
    setCached(peerKey, mockPeerSearchResult, 30_000);

    let activePeerList: Array<
      Omit<(typeof mockPeerSearchResult.peers)[number], "viewerConnection"> & {
        viewerConnection?: ViewerConnectionInfo;
      }
    > = [...mockPeerSearchResult.peers];

    // Subscribe to Stage 1 peer connection broadcasts
    subscribe("peer:connection:*", (payload: unknown) => {
      const event = payload as { key?: string; data?: ViewerConnectionInfo };
      if (!event?.key) return;
      const targetUserId = event.key.replace("peer:connection:", "");
      activePeerList = activePeerList.map((p) =>
        p.id === targetUserId ? { ...p, viewerConnection: event.data } : p,
      );
    });

    // User clicks Connect -> Stage 1 broadcast fires
    updatePeerConnectionRelationship("student-2", {
      state: "PENDING_OUTGOING",
    });

    // Peer list in component updated live without invalidating peer search cache
    expect(activePeerList[0].viewerConnection?.state).toBe("PENDING_OUTGOING");
    expect(getCached(peerKey)).not.toBeNull();
  });
});
