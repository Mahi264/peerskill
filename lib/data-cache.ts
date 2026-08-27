/**
 * PeerSkill In-Memory Client Data Cache & Synchronization Core
 *
 * Lightweight, dependency-free, TTL-aware in-memory cache for client-side
 * data reuse, instant navigation, and cross-route relationship synchronization.
 *
 * Invariants:
 * - Client-only, in-memory Map (never written to localStorage/sessionStorage/DB)
 * - Bounded capacity (LRU eviction past MAX_ENTRIES)
 * - Cleared unconditionally on StudentAuthContext logout or identity change
 * - Strictly isolated from Admin accounts and Admin routes
 */

import * as React from "react";
import { ViewerConnectionInfo } from "@/lib/validations/connection";
import {
  FormattedConversationItem,
  FormattedMessage,
  PeerProfileHeader,
} from "@/lib/validations/message";

export type { ViewerConnectionInfo };

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

const MAX_ENTRIES = 100;
const DEFAULT_TTL_MS = 30_000; // 30 seconds default

// Module-level in-memory storage (singleton per client runtime)
const cacheStore = new Map<string, CacheEntry<unknown>>();

// Active key / prefix subscription listeners
type CacheListener = (data?: unknown) => void;
const listeners = new Map<string, Set<CacheListener>>();

/**
 * Retrieve cached entry if present.
 * Returns null if not cached, or { data, isStale } if cached.
 */
export function getCached<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const isStale = Date.now() - entry.timestamp > entry.ttl;
  return { data: entry.data, isStale };
}

/**
 * Store data in the client cache with a defined TTL.
 */
export function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  // Evict oldest entry if at capacity
  if (cacheStore.size >= MAX_ENTRIES && !cacheStore.has(key)) {
    const oldestKey = cacheStore.keys().next().value;
    if (oldestKey !== undefined) {
      cacheStore.delete(oldestKey);
    }
  }

  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });

  notify(key, data);
}

/**
 * Invalidate a specific key or all keys starting with a prefix.
 */
export function invalidateData(keyOrPrefix: string): void {
  for (const key of Array.from(cacheStore.keys())) {
    if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`) || key.startsWith(keyOrPrefix)) {
      cacheStore.delete(key);
      notify(key, undefined);
    }
  }
}

/**
 * Clear the entire in-memory cache.
 * Must be invoked on logout or student identity switch.
 */
export function clearAllCache(): void {
  cacheStore.clear();
  for (const key of Array.from(listeners.keys())) {
    notify(key, undefined);
  }
}

/**
 * Subscribe to changes on a specific cache key.
 */
export function subscribe(key: string, listener: CacheListener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  return () => {
    const existing = listeners.get(key);
    if (existing) {
      existing.delete(listener);
      if (existing.size === 0) {
        listeners.delete(key);
      }
    }
  };
}

/**
 * Notify all subscribed listeners for a key.
 */
export function notify(key: string, data?: unknown): void {
  const directListeners = listeners.get(key);
  if (directListeners) {
    directListeners.forEach((fn) => fn(data));
  }

  // Also check wildcards/prefixes (e.g. 'peer:connection:*')
  for (const [subKey, set] of listeners.entries()) {
    if (subKey.endsWith("*") && key.startsWith(subKey.slice(0, -1))) {
      set.forEach((fn) => fn({ key, data }));
    }
  }
}

// ---------------------------------------------------------------------------
// Connection & Public Profile Synchronization Helpers
// ---------------------------------------------------------------------------

export const CACHE_KEYS = {
  CONNECTIONS_ALL: "connections:all",
  userProfile: (userId: string) => `user:profile:${userId}`,
  peerConnection: (userId: string) => `peer:connection:${userId}`,
  INBOX_CONVERSATIONS: "inbox:conversations",
  conversationDetails: (conversationId: string) => `conversation:${conversationId}`,
  conversationMessages: (conversationId: string) => `conversation:${conversationId}:messages`,
} as const;

interface CachedPeerProfileWrapper {
  profile?: unknown;
  viewerConnection?: ViewerConnectionInfo;
  [key: string]: unknown;
}

/**
 * Broadcast a peer relationship status change across all student views.
 * Updates the cached user profile if present, invalidates full connections list,
 * and notifies any mounted components observing this peer.
 */
export function updatePeerConnectionRelationship(
  userId: string,
  viewerConnection: ViewerConnectionInfo,
): void {
  const profileKey = CACHE_KEYS.userProfile(userId);
  const cached = getCached<CachedPeerProfileWrapper>(profileKey);

  if (cached?.data?.profile) {
    const updated = {
      ...cached.data,
      viewerConnection,
    };
    // Keep stable profile data, refresh timestamp
    setCached(profileKey, updated, 60_000);
  }

  // Invalidate connection list cache so /connections refetches
  invalidateData(CACHE_KEYS.CONNECTIONS_ALL);

  // Broadcast relationship update event
  notify(CACHE_KEYS.peerConnection(userId), viewerConnection);
}

// ---------------------------------------------------------------------------
// Messaging Inbox & Conversation Synchronization Helpers
// ---------------------------------------------------------------------------

/**
 * Append or merge incoming message(s) to the cached conversation history,
 * preserving chronological order and preventing duplicates.
 */
export function updateCachedConversationMessages(
  conversationId: string,
  incoming: FormattedMessage | FormattedMessage[],
): FormattedMessage[] {
  const key = CACHE_KEYS.conversationMessages(conversationId);
  const cached = getCached<FormattedMessage[]>(key);
  const currentList = cached?.data || [];

  const incomingList = Array.isArray(incoming) ? incoming : [incoming];
  const map = new Map<string, FormattedMessage>();

  for (const m of currentList) {
    map.set(m.id, m);
  }
  for (const m of incomingList) {
    map.set(m.id, m);
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  setCached(key, merged, 30_000);
  return merged;
}

/**
 * Update cached inbox preview for a conversation upon sending or receiving a new message.
 * Moves the conversation to the top of the inbox list and broadcasts to all inbox subscribers.
 */
export function updateCachedInboxWithNewMessage(
  conversationId: string,
  message: FormattedMessage,
  peer?: PeerProfileHeader,
): void {
  const key = CACHE_KEYS.INBOX_CONVERSATIONS;
  const cached = getCached<FormattedConversationItem[]>(key);

  const lastMessageSummary = {
    id: message.id,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt,
  };

  if (cached?.data) {
    const list = [...cached.data];
    const index = list.findIndex((c) => c.id === conversationId);

    if (index !== -1) {
      const target = list[index];
      const updatedItem: FormattedConversationItem = {
        ...target,
        lastMessage: lastMessageSummary,
        updatedAt: message.createdAt,
      };
      // Move to top of inbox list
      list.splice(index, 1);
      list.unshift(updatedItem);
    } else if (peer) {
      const newItem: FormattedConversationItem = {
        id: conversationId,
        peer,
        lastMessage: lastMessageSummary,
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
      };
      list.unshift(newItem);
    }

    setCached(key, list, 15_000);
  } else if (peer) {
    const list: FormattedConversationItem[] = [
      {
        id: conversationId,
        peer,
        lastMessage: lastMessageSummary,
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
      },
    ];
    setCached(key, list, 15_000);
  }
}

// ---------------------------------------------------------------------------
// React Hook: useCachedData
// ---------------------------------------------------------------------------

export interface UseCachedDataOptions<T> {
  ttl?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
}

export interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  mutate: (updater: T | ((prev: T | null) => T)) => void;
}

/**
 * React hook to read and synchronize cached domain data using React's useSyncExternalStore.
 */
export function useCachedData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions<T> = {},
): UseCachedDataResult<T> {
  const { ttl = DEFAULT_TTL_MS, enabled = true } = options;

  const subscribeToKey = React.useCallback(
    (callback: () => void) => {
      if (!key || !enabled) {
        return () => {};
      }
      return subscribe(key, callback);
    },
    [key, enabled],
  );

  const getSnapshot = React.useCallback(() => {
    if (!key || !enabled) return null;
    const entry = getCached<T>(key);
    return entry ? entry.data : null;
  }, [key, enabled]);

  const getServerSnapshot = React.useCallback(() => null, []);

  const data = React.useSyncExternalStore(subscribeToKey, getSnapshot, getServerSnapshot);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const executeFetch = React.useCallback(
    async () => {
      if (!key || !enabled) return;

      try {
        const fresh = await fetcher();
        setCached(key, fresh, ttl);
        if (options.onSuccess) {
          options.onSuccess(fresh);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    },
    [key, enabled, fetcher, ttl, options],
  );

  React.useEffect(() => {
    if (!key || !enabled) return;

    let ignore = false;
    async function load() {
      const cached = getCached<T>(key!);
      if (!cached || cached.isStale) {
        try {
          const fresh = await fetcher();
          if (!ignore) {
            setCached(key!, fresh, ttl);
            if (options.onSuccess) {
              options.onSuccess(fresh);
            }
          }
        } catch (err: unknown) {
          if (!ignore && !cached) {
            setError(err instanceof Error ? err.message : "Failed to load data.");
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      }
    }
    void load();

    return () => {
      ignore = true;
    };
  }, [key, enabled, fetcher, ttl, options]);

  const mutate = React.useCallback(
    (updater: T | ((prev: T | null) => T)) => {
      if (!key) return;
      const current = getCached<T>(key)?.data ?? null;
      const next =
        typeof updater === "function"
          ? (updater as (prev: T | null) => T)(current)
          : updater;
      setCached(key, next, ttl);
    },
    [key, ttl],
  );

  return {
    data,
    loading: loading && !data,
    error,
    refresh: () => executeFetch(),
    mutate,
  };
}
