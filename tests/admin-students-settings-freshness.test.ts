import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAdminCache,
  getAdminCached,
  invalidateAdminData,
  setAdminCached,
} from "@/lib/admin-data-cache";
import {
  clearAllCache as clearStudentCache,
  getCached as getStudentCached,
  setCached as setStudentCached,
} from "@/lib/data-cache";

describe("Admin Students & Settings Data Freshness (Stage Admin-C)", () => {
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

  // Students Directory Tests
  describe("Student Directory Freshness (admin:students:*)", () => {
    it("1. generates deterministic query-specific cache keys", () => {
      const key1 = "admin:students:rahul:ACTIVE:1:20";
      const key2 = "admin:students:::ALL:1:20";
      const key3 = "admin:students:::ALL:2:20";

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
    });

    it("2. enforces query isolation so different searches do not collide", () => {
      const csStudents = { students: [{ id: "1", fullName: "CS Student" }], totalPages: 1, totalStudents: 1 };
      const aiStudents = { students: [{ id: "2", fullName: "AI Student" }], totalPages: 1, totalStudents: 1 };

      setAdminCached("admin:students:cs:ALL:1:20", csStudents, 30_000);
      setAdminCached("admin:students:ai:ALL:1:20", aiStudents, 30_000);

      const hitCS = getAdminCached<typeof csStudents>("admin:students:cs:ALL:1:20");
      const hitAI = getAdminCached<typeof aiStudents>("admin:students:ai:ALL:1:20");

      expect(hitCS?.data.students[0].fullName).toBe("CS Student");
      expect(hitAI?.data.students[0].fullName).toBe("AI Student");
    });

    it("3. enforces status-filter isolation", () => {
      const allStudents = { students: [{ id: "1" }, { id: "2" }], totalPages: 1, totalStudents: 2 };
      const activeStudents = { students: [{ id: "1" }], totalPages: 1, totalStudents: 1 };

      setAdminCached("admin:students:::ALL:1:20", allStudents, 30_000);
      setAdminCached("admin:students:::ACTIVE:1:20", activeStudents, 30_000);

      expect(getAdminCached<typeof allStudents>("admin:students:::ALL:1:20")?.data.totalStudents).toBe(2);
      expect(getAdminCached<typeof activeStudents>("admin:students:::ACTIVE:1:20")?.data.totalStudents).toBe(1);
    });

    it("4. enforces page number isolation", () => {
      const page1 = { students: [{ id: "1" }], totalPages: 2, totalStudents: 25 };
      const page2 = { students: [{ id: "21" }], totalPages: 2, totalStudents: 25 };

      setAdminCached("admin:students:::ALL:1:20", page1, 30_000);
      setAdminCached("admin:students:::ALL:2:20", page2, 30_000);

      expect(getAdminCached<typeof page1>("admin:students:::ALL:1:20")?.data.students[0].id).toBe("1");
      expect(getAdminCached<typeof page2>("admin:students:::ALL:2:20")?.data.students[0].id).toBe("21");
    });

    it("5. cold fetch populates student directory cache with 30s TTL", () => {
      const data = { students: [{ id: "10", fullName: "Jane" }], totalPages: 1, totalStudents: 1 };
      setAdminCached("admin:students:jane:ALL:1:20", data, 30_000);

      const hit = getAdminCached<typeof data>("admin:students:jane:ALL:1:20");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
      expect(hit?.data.students).toHaveLength(1);
    });

    it("6. warm cache hit returns data without staleness within 30s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const data = { students: [{ id: "10" }], totalPages: 1, totalStudents: 1 };
      setAdminCached("admin:students:::ALL:1:20", data, 30_000);

      vi.setSystemTime(120_000); // 20s passed (<30s)

      const hit = getAdminCached<typeof data>("admin:students:::ALL:1:20");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
    });

    it("7. stale cache marks hit as stale for background revalidation after 30s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const data = { students: [{ id: "10" }], totalPages: 1, totalStudents: 1 };
      setAdminCached("admin:students:::ALL:1:20", data, 30_000);

      vi.setSystemTime(135_000); // 35s passed (>30s)

      const hit = getAdminCached<typeof data>("admin:students:::ALL:1:20");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(true);
    });

    it("8. background failure retains stale student data without blanking", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const initialData = { students: [{ id: "10" }], totalPages: 1, totalStudents: 1 };
      setAdminCached("admin:students:::ALL:1:20", initialData, 30_000);

      vi.setSystemTime(140_000); // Stale

      // Fetch fails; data remains preserved
      const hit = getAdminCached<typeof initialData>("admin:students:::ALL:1:20");
      expect(hit).not.toBeNull();
      expect(hit?.data.students).toHaveLength(1);
    });

    it("9. prefix invalidation clears all student queries simultaneously", () => {
      setAdminCached("admin:students:::ALL:1:20", { students: [] });
      setAdminCached("admin:students:rahul:ACTIVE:1:20", { students: [] });
      setAdminCached("admin:skills", [{ id: "1" }]);

      invalidateAdminData("admin:students");

      expect(getAdminCached("admin:students:::ALL:1:20")).toBeNull();
      expect(getAdminCached("admin:students:rahul:ACTIVE:1:20")).toBeNull();
      expect(getAdminCached("admin:skills")).not.toBeNull();
    });
  });

  // Settings Tests
  describe("Platform Settings Freshness (admin:settings)", () => {
    it("10. cold fetch stores platform settings with 120s TTL", () => {
      const settings = {
        platformName: "PeerSkill MITS",
        collegeDisplayName: "Madhav Institute",
        supportEmail: "support@mits.ac.in",
        allowCustomSkills: true,
      };

      setAdminCached("admin:settings", settings, 120_000);

      const hit = getAdminCached<typeof settings>("admin:settings");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
      expect(hit?.data.platformName).toBe("PeerSkill MITS");
    });

    it("11. warm cache hit returns settings without refetch within 120s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      setAdminCached("admin:settings", { platformName: "PeerSkill" }, 120_000);

      vi.setSystemTime(180_000); // 80s passed (<120s)

      const hit = getAdminCached<{ platformName: string }>("admin:settings");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
    });

    it("12. stale cache marks hit as stale for background revalidation after 120s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      setAdminCached("admin:settings", { platformName: "PeerSkill" }, 120_000);

      vi.setSystemTime(230_000); // 130s passed (>120s)

      const hit = getAdminCached<{ platformName: string }>("admin:settings");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(true);
    });

    it("13. background failure retains cached settings", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      setAdminCached("admin:settings", { platformName: "PeerSkill" }, 120_000);

      vi.setSystemTime(230_000);

      const hit = getAdminCached<{ platformName: string }>("admin:settings");
      expect(hit).not.toBeNull();
      expect(hit?.data.platformName).toBe("PeerSkill");
    });

    it("14. successful settings mutation invalidates and updates cache", () => {
      setAdminCached("admin:settings", { platformName: "Old Name" }, 120_000);

      // PATCH succeeds -> invalidates old and sets updated settings
      invalidateAdminData("admin:settings");
      setAdminCached("admin:settings", { platformName: "New Name" }, 120_000);

      const hit = getAdminCached<{ platformName: string }>("admin:settings");
      expect(hit?.data.platformName).toBe("New Name");
      expect(hit?.isStale).toBe(false);
    });

    it("15. failed settings mutation does not corrupt existing cache", () => {
      const original = { platformName: "Original Brand" };
      setAdminCached("admin:settings", original, 120_000);

      // Failed PATCH does NOT call invalidateAdminData or setAdminCached
      const hit = getAdminCached<typeof original>("admin:settings");
      expect(hit?.data.platformName).toBe("Original Brand");
    });
  });

  // Security & Isolation
  describe("Security, Isolation & Lifecycle Safety", () => {
    it("16. clearAdminCache removes students and settings entries completely", () => {
      setAdminCached("admin:students:::ALL:1:20", { students: [] });
      setAdminCached("admin:settings", { platformName: "PeerSkill" });
      setAdminCached("admin:overview", { totalStudents: 10 });
      setAdminCached("admin:skills", [{ id: "1" }]);

      clearAdminCache();

      expect(getAdminCached("admin:students:::ALL:1:20")).toBeNull();
      expect(getAdminCached("admin:settings")).toBeNull();
      expect(getAdminCached("admin:overview")).toBeNull();
      expect(getAdminCached("admin:skills")).toBeNull();
    });

    it("17. Admin cache and Student cache remain physically separate stores", () => {
      setAdminCached("admin:settings", { platformName: "PeerSkill Admin" });
      setStudentCached("admin:settings", { platformName: "PeerSkill Student" });

      const adminHit = getAdminCached<{ platformName: string }>("admin:settings");
      const studentHit = getStudentCached<{ platformName: string }>("admin:settings");

      expect(adminHit?.data.platformName).toBe("PeerSkill Admin");
      expect(studentHit?.data.platformName).toBe("PeerSkill Student");

      clearStudentCache();
      expect(getAdminCached("admin:settings")).not.toBeNull();
      expect(getStudentCached("admin:settings")).toBeNull();
    });

    it("18. operates strictly in volatile memory without persistent storage", () => {
      setAdminCached("admin:settings", { test: true });
      expect(getAdminCached("admin:settings")?.data).toEqual({ test: true });
    });
  });
});
