import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  CACHE_KEYS,
  clearAllCache,
  getCached,
  invalidateData,
  setCached,
  subscribe,
  notify,
  updatePeerConnectionRelationship,
  ViewerConnectionInfo,
} from "@/lib/data-cache";

describe("Data Cache Core (lib/data-cache.ts)", () => {
  beforeEach(() => {
    clearAllCache();
    vi.restoreAllMocks();
  });

  it("stores and retrieves cached data before TTL expires", () => {
    setCached("test:key", { name: "PeerSkill" }, 10_000);

    const result = getCached<{ name: string }>("test:key");
    expect(result).not.toBeNull();
    expect(result?.data.name).toBe("PeerSkill");
    expect(result?.isStale).toBe(false);
  });

  it("returns isStale: true when TTL has passed", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    setCached("test:expiring", { count: 42 }, 5_000);

    // Immediately fresh
    expect(getCached("test:expiring")?.isStale).toBe(false);

    // Fast forward 6 seconds
    vi.setSystemTime(now + 6_000);

    const staleResult = getCached<{ count: number }>("test:expiring");
    expect(staleResult).not.toBeNull();
    expect(staleResult?.data.count).toBe(42);
    expect(staleResult?.isStale).toBe(true);

    vi.useRealTimers();
  });

  it("invalidates a specific key correctly", () => {
    setCached("user:1", { name: "Alice" });
    setCached("user:2", { name: "Bob" });

    invalidateData("user:1");

    expect(getCached("user:1")).toBeNull();
    expect(getCached("user:2")).not.toBeNull();
  });

  it("invalidates keys by prefix pattern", () => {
    setCached("peer:profile:user-1", { id: "user-1" });
    setCached("peer:profile:user-2", { id: "user-2" });
    setCached("connections:all", { count: 5 });

    invalidateData("peer:profile");

    expect(getCached("peer:profile:user-1")).toBeNull();
    expect(getCached("peer:profile:user-2")).toBeNull();
    expect(getCached("connections:all")).not.toBeNull();
  });

  it("clears all cache entries on clearAllCache()", () => {
    setCached("connections:all", { count: 10 });
    setCached("user:profile:123", { name: "Mohit" });

    clearAllCache();

    expect(getCached("connections:all")).toBeNull();
    expect(getCached("user:profile:123")).toBeNull();
  });

  it("enforces maximum bounded capacity (MAX_ENTRIES = 100)", () => {
    // Fill with 100 items
    for (let i = 1; i <= 100; i++) {
      setCached(`key:${i}`, { val: i });
    }

    expect(getCached("key:1")).not.toBeNull();
    expect(getCached("key:100")).not.toBeNull();

    // Adding 101st item should evict key:1
    setCached("key:101", { val: 101 });

    expect(getCached("key:1")).toBeNull();
    expect(getCached("key:101")).not.toBeNull();
  });

  it("notifies direct subscribers when a key is updated or invalidated", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe("connections:all", listener);

    setCached("connections:all", { count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1 });

    invalidateData("connections:all");
    expect(listener).toHaveBeenCalledWith(undefined);

    unsubscribe();
    setCached("connections:all", { count: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("notifies wildcard prefix subscribers on peer relationship updates", () => {
    const wildcardListener = vi.fn();
    const unsubscribe = subscribe("peer:connection:*", wildcardListener);

    notify("peer:connection:user-99", { state: "CONNECTED" });

    expect(wildcardListener).toHaveBeenCalledWith({
      key: "peer:connection:user-99",
      data: { state: "CONNECTED" },
    });

    unsubscribe();
  });
});

describe("Connection & Public Profile Synchronization (updatePeerConnectionRelationship)", () => {
  beforeEach(() => {
    clearAllCache();
  });

  it("updates viewerConnection inside cached peer profile without destroying stable profile fields", () => {
    const userId = "peer-abc";
    const profileKey = CACHE_KEYS.userProfile(userId);

    // Initial cached profile
    setCached(profileKey, {
      id: userId,
      profile: {
        fullName: "Rahul Verma",
        branch: "CSE",
        graduationYear: 2026,
      },
      skills: [{ name: "React" }],
      viewerConnection: {
        state: "NOT_CONNECTED",
      },
    });

    // Set connection list cache
    setCached(CACHE_KEYS.CONNECTIONS_ALL, { counts: { connected: 0 } });

    const newRelationship: ViewerConnectionInfo = {
      state: "PENDING_OUTGOING",
      connectionId: "conn-123",
    };

    const peerListener = vi.fn();
    subscribe(CACHE_KEYS.peerConnection(userId), peerListener);

    // Act
    updatePeerConnectionRelationship(userId, newRelationship);

    // 1. Profile cache should retain stable bio/skills and update viewerConnection
    interface TestPeerProfile {
      id: string;
      profile: { fullName: string; branch: string; graduationYear: number };
      skills: Array<{ name: string }>;
      viewerConnection: ViewerConnectionInfo;
    }
    const updatedProfile = getCached<TestPeerProfile>(profileKey)?.data;
    expect(updatedProfile?.profile.fullName).toBe("Rahul Verma");
    expect(updatedProfile?.skills).toHaveLength(1);
    expect(updatedProfile?.viewerConnection).toEqual(newRelationship);

    // 2. Connections list cache must be invalidated
    expect(getCached(CACHE_KEYS.CONNECTIONS_ALL)).toBeNull();

    // 3. Listener must have received notification
    expect(peerListener).toHaveBeenCalledWith(newRelationship);
  });

  it("broadcasts relationship changes and invalidates connections:all even when peer profile was not cached", () => {
    const userId = "peer-xyz";
    const newRelationship: ViewerConnectionInfo = {
      state: "CONNECTED",
      connectionId: "conn-456",
    };

    setCached(CACHE_KEYS.CONNECTIONS_ALL, { counts: { connected: 3 } });

    const peerListener = vi.fn();
    subscribe(CACHE_KEYS.peerConnection(userId), peerListener);

    updatePeerConnectionRelationship(userId, newRelationship);

    expect(getCached(CACHE_KEYS.CONNECTIONS_ALL)).toBeNull();
    expect(peerListener).toHaveBeenCalledWith(newRelationship);
  });
});
