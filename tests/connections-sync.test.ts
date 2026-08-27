import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  CACHE_KEYS,
  clearAllCache,
  getCached,
  setCached,
  subscribe,
  updatePeerConnectionRelationship,
  ViewerConnectionInfo,
} from "@/lib/data-cache";

interface MockPeerCache {
  id: string;
  profile: { fullName: string };
  viewerConnection: ViewerConnectionInfo;
}

describe("Cross-Route Connection & Peer Profile Synchronization", () => {
  beforeEach(() => {
    clearAllCache();
    vi.restoreAllMocks();
  });

  it("synchronizes status when user sends connection request (NOT_CONNECTED -> PENDING_OUTGOING)", () => {
    const peerId = "peer-student-1";
    const profileKey = CACHE_KEYS.userProfile(peerId);

    // Seed initial peer profile cache
    setCached<MockPeerCache>(profileKey, {
      id: peerId,
      profile: { fullName: "Aarav Sharma" },
      viewerConnection: { state: "NOT_CONNECTED" },
    });

    // Seed initial connections:all cache
    setCached(CACHE_KEYS.CONNECTIONS_ALL, {
      connected: [],
      incoming: [],
      outgoing: [],
      counts: { connected: 0, incoming: 0, outgoing: 0 },
    });

    const searchListener = vi.fn();
    subscribe("peer:connection:*", searchListener);

    // Action: Connect sent
    const newRelationship: ViewerConnectionInfo = {
      state: "PENDING_OUTGOING",
      connectionId: "new-conn-99",
    };
    updatePeerConnectionRelationship(peerId, newRelationship);

    // 1. Peer profile cache updated
    expect(getCached<MockPeerCache>(profileKey)?.data.viewerConnection).toEqual(newRelationship);

    // 2. Connections list cache invalidated
    expect(getCached(CACHE_KEYS.CONNECTIONS_ALL)).toBeNull();

    // 3. Search listener notified
    expect(searchListener).toHaveBeenCalledWith({
      key: `peer:connection:${peerId}`,
      data: newRelationship,
    });
  });

  it("synchronizes status when incoming connection is accepted (PENDING_INCOMING -> CONNECTED)", () => {
    const peerId = "peer-student-2";
    const profileKey = CACHE_KEYS.userProfile(peerId);

    setCached<MockPeerCache>(profileKey, {
      id: peerId,
      profile: { fullName: "Priya Patel" },
      viewerConnection: { state: "PENDING_INCOMING", connectionId: "conn-abc" },
    });

    setCached(CACHE_KEYS.CONNECTIONS_ALL, {
      connected: [],
      incoming: [{ id: "conn-abc" }],
      outgoing: [],
      counts: { connected: 0, incoming: 1, outgoing: 0 },
    });

    // Action: Accept request
    const acceptedRelationship: ViewerConnectionInfo = {
      state: "CONNECTED",
      connectionId: "conn-abc",
    };
    updatePeerConnectionRelationship(peerId, acceptedRelationship);

    // Profile cache updated
    expect(getCached<MockPeerCache>(profileKey)?.data.viewerConnection.state).toBe("CONNECTED");
    // Connections list cache invalidated for fresh fetch
    expect(getCached(CACHE_KEYS.CONNECTIONS_ALL)).toBeNull();
  });

  it("synchronizes status when connection is removed (CONNECTED -> NOT_CONNECTED)", () => {
    const peerId = "peer-student-3";
    const profileKey = CACHE_KEYS.userProfile(peerId);

    setCached<MockPeerCache>(profileKey, {
      id: peerId,
      profile: { fullName: "Rohan Gupta" },
      viewerConnection: { state: "CONNECTED", connectionId: "conn-xyz" },
    });

    const removedRelationship: ViewerConnectionInfo = {
      state: "NOT_CONNECTED",
    };
    updatePeerConnectionRelationship(peerId, removedRelationship);

    expect(getCached<MockPeerCache>(profileKey)?.data.viewerConnection.state).toBe("NOT_CONNECTED");
    expect(getCached<MockPeerCache>(profileKey)?.data.viewerConnection.connectionId).toBeUndefined();
  });

  it("clears cached student data on clearAllCache() ensuring no state leak across logins", () => {
    setCached(CACHE_KEYS.CONNECTIONS_ALL, { counts: { connected: 5 } });
    setCached(CACHE_KEYS.userProfile("student-a"), { fullName: "Student A" });

    // Simulate logout
    clearAllCache();

    expect(getCached(CACHE_KEYS.CONNECTIONS_ALL)).toBeNull();
    expect(getCached(CACHE_KEYS.userProfile("student-a"))).toBeNull();
  });
});
