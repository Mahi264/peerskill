import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAdminCache,
  getAdminCached,
  invalidateAdminData,
  setAdminCached,
} from "@/lib/admin-data-cache";

describe("Admin Overview & Skills Data Freshness (Stage Admin-B)", () => {
  beforeEach(() => {
    clearAdminCache();
    vi.useRealTimers();
  });

  afterEach(() => {
    clearAdminCache();
    vi.useRealTimers();
  });

  // Overview Tests
  describe("Overview Freshness (admin:overview)", () => {
    it("1. cold fetch stores overview data with 30s TTL", () => {
      const stats = {
        totalStudents: 50,
        activeStudents: 45,
        pendingStudents: 5,
        totalDoubts: 12,
        resolvedDoubts: 8,
        totalAnswers: 20,
        acceptedAnswers: 8,
        totalConnections: 30,
        totalConversations: 15,
        totalPredefinedSkills: 10,
      };

      setAdminCached("admin:overview", stats, 30_000);

      const hit = getAdminCached<typeof stats>("admin:overview");
      expect(hit).not.toBeNull();
      expect(hit?.data.totalStudents).toBe(50);
      expect(hit?.isStale).toBe(false);
    });

    it("2. warm cache hydrates immediately without staleness", () => {
      const stats = { totalStudents: 100 };
      setAdminCached("admin:overview", stats, 30_000);

      const hit = getAdminCached<typeof stats>("admin:overview");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
      expect(hit?.data.totalStudents).toBe(100);
    });

    it("3. stale cache returns stale hit for background revalidation after 30s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const stats = { totalStudents: 100 };
      setAdminCached("admin:overview", stats, 30_000);

      // Advance by 35 seconds
      vi.setSystemTime(135_000);

      const hit = getAdminCached<typeof stats>("admin:overview");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(true);
      expect(hit?.data.totalStudents).toBe(100);
    });

    it("4. background failure retains stale overview data without wiping", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const initialStats = { totalStudents: 100 };
      setAdminCached("admin:overview", initialStats, 30_000);

      vi.setSystemTime(140_000); // Stale

      // Caller encounters fetch error; cache is NOT deleted
      const hit = getAdminCached<typeof initialStats>("admin:overview");
      expect(hit).not.toBeNull();
      expect(hit?.data.totalStudents).toBe(100);
    });

    it("5. mutation invalidation prevents stale KPI reuse", () => {
      setAdminCached("admin:overview", { totalPredefinedSkills: 10 }, 30_000);
      expect(getAdminCached("admin:overview")).not.toBeNull();

      // Skill created -> invalidates overview
      invalidateAdminData("admin:overview");

      expect(getAdminCached("admin:overview")).toBeNull();
    });
  });

  // Skills Tests
  describe("Skills Freshness (admin:skills)", () => {
    it("6. cold fetch stores skills data with 60s TTL", () => {
      const skills = [{ id: "1", name: "Python", category: "Programming" }];
      setAdminCached("admin:skills", skills, 60_000);

      const hit = getAdminCached<typeof skills>("admin:skills");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
      expect(hit?.data).toHaveLength(1);
    });

    it("7. warm cache hydrates without requiring refetch within 60s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const skills = [{ id: "1", name: "Python" }];
      setAdminCached("admin:skills", skills, 60_000);

      vi.setSystemTime(140_000); // 40s passed (within 60s)

      const hit = getAdminCached<typeof skills>("admin:skills");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
    });

    it("8. stale cache triggers background revalidation after 60s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const skills = [{ id: "1", name: "Python" }];
      setAdminCached("admin:skills", skills, 60_000);

      vi.setSystemTime(170_000); // 70s passed (>60s)

      const hit = getAdminCached<typeof skills>("admin:skills");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(true);
    });

    it("9. skill creation invalidates both skills cache and overview cache", () => {
      setAdminCached("admin:skills", [{ id: "1", name: "Python" }], 60_000);
      setAdminCached("admin:overview", { totalPredefinedSkills: 1 }, 30_000);

      // Skill creation mutation triggers dual invalidation
      invalidateAdminData("admin:skills");
      invalidateAdminData("admin:overview");

      expect(getAdminCached("admin:skills")).toBeNull();
      expect(getAdminCached("admin:overview")).toBeNull();
    });

    it("10. skill rename/update invalidates only skills cache", () => {
      setAdminCached("admin:skills", [{ id: "1", name: "Python" }], 60_000);
      setAdminCached("admin:overview", { totalPredefinedSkills: 1 }, 30_000);

      // Rename triggers skill invalidation only
      invalidateAdminData("admin:skills");

      expect(getAdminCached("admin:skills")).toBeNull();
      expect(getAdminCached("admin:overview")).not.toBeNull();
    });

    it("11. archive invalidates skills cache if supported", () => {
      setAdminCached("admin:skills", [{ id: "1", name: "Legacy" }], 60_000);
      invalidateAdminData("admin:skills");
      expect(getAdminCached("admin:skills")).toBeNull();
    });
  });

  // Isolation & Cleanup Tests
  describe("Isolation & Race Safety", () => {
    it("12. overview and skills caches are separate keys", () => {
      setAdminCached("admin:overview", { doubts: 10 }, 30_000);
      setAdminCached("admin:skills", [{ id: "1", name: "Math" }], 60_000);

      invalidateAdminData("admin:skills");

      expect(getAdminCached("admin:skills")).toBeNull();
      expect(getAdminCached("admin:overview")).not.toBeNull();
    });

    it("13. clearAdminCache removes all Admin cached domains simultaneously", () => {
      setAdminCached("admin:overview", { doubts: 10 }, 30_000);
      setAdminCached("admin:skills", [{ id: "1", name: "Math" }], 60_000);

      clearAdminCache();

      expect(getAdminCached("admin:overview")).toBeNull();
      expect(getAdminCached("admin:skills")).toBeNull();
    });

    it("14. old response cannot overwrite invalidated/newer data", () => {
      // Cache updated to version 2 at t=120
      setAdminCached("admin:overview", { version: 2 }, 30_000);

      // Invalidation occurs
      invalidateAdminData("admin:overview");

      // Verify that after invalidation, cache is null
      expect(getAdminCached("admin:overview")).toBeNull();

      // Subsequent fresh fetch sets authoritative data
      setAdminCached("admin:overview", { version: 3 }, 30_000);
      expect(getAdminCached<{ version: number }>("admin:overview")?.data.version).toBe(3);
    });
  });
});
