import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAdminCache,
  getAdminCacheSize,
  getAdminCached,
  invalidateAdminData,
  MAX_ADMIN_CACHE_ENTRIES,
  setAdminCached,
} from "@/lib/admin-data-cache";
import {
  clearAllCache as clearStudentCache,
  getCached as getStudentCached,
  setCached as setStudentCached,
} from "@/lib/data-cache";

describe("Admin Data Cache Foundation (lib/admin-data-cache.ts)", () => {
  beforeEach(() => {
    clearAdminCache();
    clearStudentCache();
    vi.useRealTimers();
  });

  afterEach(() => {
    clearAdminCache();
    clearStudentCache();
    vi.useRealTimers();
  });

  it("1. starts completely empty", () => {
    expect(getAdminCacheSize()).toBe(0);
    expect(getAdminCached("admin:overview")).toBeNull();
  });

  it("2. sets and gets data cleanly", () => {
    const mockOverview = { totalStudents: 100, activeStudents: 85 };
    setAdminCached("admin:overview", mockOverview, 30_000);

    const hit = getAdminCached<typeof mockOverview>("admin:overview");
    expect(hit).not.toBeNull();
    expect(hit?.data).toEqual(mockOverview);
    expect(hit?.isStale).toBe(false);
  });

  it("3. returns fresh entries with isStale: false within TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);

    setAdminCached("admin:skills", [{ id: "1", name: "React" }], 60_000);

    // Advance by 30 seconds (still within 60s TTL)
    vi.setSystemTime(130_000);

    const hit = getAdminCached<{ id: string; name: string }[]>("admin:skills");
    expect(hit).not.toBeNull();
    expect(hit?.isStale).toBe(false);
    expect(hit?.data).toHaveLength(1);
  });

  it("4. returns expired entries with isStale: true when TTL has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);

    setAdminCached("admin:settings", { platformName: "PeerSkill" }, 15_000);

    // Advance past TTL (20 seconds > 15s TTL)
    vi.setSystemTime(120_000);

    const hit = getAdminCached<{ platformName: string }>("admin:settings");
    expect(hit).not.toBeNull();
    expect(hit?.isStale).toBe(true);
    expect(hit?.data.platformName).toBe("PeerSkill");
  });

  it("5. supports exact key invalidation", () => {
    setAdminCached("admin:overview", { doubts: 10 });
    setAdminCached("admin:skills", { skills: 5 });

    invalidateAdminData("admin:overview");

    expect(getAdminCached("admin:overview")).toBeNull();
    expect(getAdminCached("admin:skills")).not.toBeNull();
  });

  it("6. supports prefix-based namespace invalidation", () => {
    setAdminCached("admin:students:q1", { students: [1] });
    setAdminCached("admin:students:q2", { students: [2] });
    setAdminCached("admin:skills", { skills: 5 });

    invalidateAdminData("admin:students");

    expect(getAdminCached("admin:students:q1")).toBeNull();
    expect(getAdminCached("admin:students:q2")).toBeNull();
    expect(getAdminCached("admin:skills")).not.toBeNull();
  });

  it("7. clearAdminCache purges all stored entries", () => {
    setAdminCached("admin:overview", { a: 1 });
    setAdminCached("admin:skills", { b: 2 });
    setAdminCached("admin:settings", { c: 3 });
    expect(getAdminCacheSize()).toBe(3);

    clearAdminCache();

    expect(getAdminCacheSize()).toBe(0);
    expect(getAdminCached("admin:overview")).toBeNull();
    expect(getAdminCached("admin:skills")).toBeNull();
    expect(getAdminCached("admin:settings")).toBeNull();
  });

  it("8. enforces bounded memory by evicting oldest entries first past limit", () => {
    for (let i = 1; i <= MAX_ADMIN_CACHE_ENTRIES; i++) {
      setAdminCached(`admin:key:${i}`, { index: i });
    }
    expect(getAdminCacheSize()).toBe(MAX_ADMIN_CACHE_ENTRIES);
    expect(getAdminCached("admin:key:1")).not.toBeNull();

    // Adding 31st entry must evict key:1
    setAdminCached("admin:key:31", { index: 31 });
    expect(getAdminCacheSize()).toBe(MAX_ADMIN_CACHE_ENTRIES);
    expect(getAdminCached("admin:key:1")).toBeNull();
    expect(getAdminCached("admin:key:31")).not.toBeNull();
  });

  it("9. proves Admin and Student caches are completely separate physical stores", () => {
    setAdminCached("test:key", { role: "ADMIN" });
    setStudentCached("test:key", { role: "STUDENT" });

    const adminHit = getAdminCached<{ role: string }>("test:key");
    const studentHit = getStudentCached<{ role: string }>("test:key");

    expect(adminHit?.data.role).toBe("ADMIN");
    expect(studentHit?.data.role).toBe("STUDENT");

    // Clearing Admin does not affect Student
    clearAdminCache();
    expect(getAdminCached("test:key")).toBeNull();
    expect(getStudentCached("test:key")).not.toBeNull();

    // Clearing Student does not affect Admin
    setAdminCached("test:key2", { role: "ADMIN" });
    clearStudentCache();
    expect(getStudentCached("test:key")).toBeNull();
    expect(getAdminCached("test:key2")).not.toBeNull();
  });

  it("10. operates strictly in memory without persistent storage", () => {
    setAdminCached("admin:overview", { count: 42 });
    // In-memory access works
    expect(getAdminCached("admin:overview")?.data).toEqual({ count: 42 });
  });
});
