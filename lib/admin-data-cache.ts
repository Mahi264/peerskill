/**
 * PeerSkill In-Memory Admin Data Cache Core (Stage Admin-A)
 *
 * Lightweight, dependency-free, TTL-aware in-memory cache for Admin presentation data.
 *
 * Strict Invariants:
 * - In-memory Map only (never written to localStorage/sessionStorage/cookies/DB).
 * - Completely isolated from the Student data cache (lib/data-cache.ts).
 * - Bounded capacity (LRU eviction past MAX_ADMIN_CACHE_ENTRIES = 30).
 * - Accepts caller-specified TTL in milliseconds.
 * - Stores presentation/aggregate data only; NEVER contains tokens, credentials, or authorization logic.
 * - Authoritative authorization remains 100% server-side via AdminSession cookies.
 */

export interface AdminCacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface AdminCacheHit<T = unknown> {
  data: T;
  isStale: boolean;
}

export const MAX_ADMIN_CACHE_ENTRIES = 30;
export const DEFAULT_ADMIN_TTL_MS = 30_000; // 30 seconds default

// Dedicated in-memory singleton Map for Admin data
const adminCacheStore = new Map<string, AdminCacheEntry<unknown>>();

/**
 * Retrieve cached Admin entry if present.
 * Returns null if not cached, or { data, isStale } if cached.
 */
export function getAdminCached<T>(key: string): AdminCacheHit<T> | null {
  const entry = adminCacheStore.get(key) as AdminCacheEntry<T> | undefined;
  if (!entry) return null;

  const isStale = Date.now() - entry.timestamp > entry.ttl;
  return { data: entry.data, isStale };
}

/**
 * Store data in the Admin cache with a caller-defined TTL.
 * Evicts oldest entry if store exceeds MAX_ADMIN_CACHE_ENTRIES.
 */
export function setAdminCached<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_ADMIN_TTL_MS,
): void {
  // Evict oldest entry if at capacity and inserting a new key
  if (adminCacheStore.size >= MAX_ADMIN_CACHE_ENTRIES && !adminCacheStore.has(key)) {
    const oldestKey = adminCacheStore.keys().next().value;
    if (oldestKey !== undefined) {
      adminCacheStore.delete(oldestKey);
    }
  }

  adminCacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Invalidate a specific exact key or any key matching a prefix.
 */
export function invalidateAdminData(keyOrPrefix: string): void {
  for (const key of Array.from(adminCacheStore.keys())) {
    if (
      key === keyOrPrefix ||
      key.startsWith(`${keyOrPrefix}:`) ||
      key.startsWith(keyOrPrefix)
    ) {
      adminCacheStore.delete(key);
    }
  }
}

/**
 * Clear the entire in-memory Admin cache.
 * Must be invoked on Admin logout, ownership transfer, or session expiration.
 */
export function clearAdminCache(): void {
  adminCacheStore.clear();
}

/**
 * Returns current entry count (primarily for testing and inspection).
 */
export function getAdminCacheSize(): number {
  return adminCacheStore.size;
}
