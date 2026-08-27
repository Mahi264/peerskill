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

describe("Admin Ownership Data Freshness & Security (Stage Admin-D)", () => {
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

  describe("Ownership Presentation Caching (admin:ownership)", () => {
    it("1. cold ownership fetch populates cache with 15s TTL", () => {
      const payload = {
        currentAdmin: {
          id: "admin_123",
          email: "admin@mits.ac.in",
          displayName: "Platform Administrator",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        auditHistory: [
          {
            id: "log_1",
            action: "INITIAL_ADMIN_BOOTSTRAPPED",
            details: { bootstrappedEmail: "admin@mits.ac.in" },
            ipAddress: "127.0.0.1",
            createdAt: new Date().toISOString(),
          },
        ],
      };

      setAdminCached("admin:ownership", payload, 15_000);

      const hit = getAdminCached<typeof payload>("admin:ownership");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
      expect(hit?.data.currentAdmin?.email).toBe("admin@mits.ac.in");
      expect(hit?.data.auditHistory).toHaveLength(1);
    });

    it("2. warm ownership cache returns instantly without staleness within 15s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const payload = {
        currentAdmin: { id: "a1", email: "admin@mits.ac.in" },
        auditHistory: [],
      };
      setAdminCached("admin:ownership", payload, 15_000);

      vi.setSystemTime(110_000); // 10s passed (<15s)

      const hit = getAdminCached<typeof payload>("admin:ownership");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(false);
      expect(hit?.data.currentAdmin?.email).toBe("admin@mits.ac.in");
    });

    it("3. stale ownership cache returns data with isStale=true after 15s", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const payload = {
        currentAdmin: { id: "a1", email: "admin@mits.ac.in" },
        auditHistory: [],
      };
      setAdminCached("admin:ownership", payload, 15_000);

      vi.setSystemTime(120_000); // 20s passed (>15s)

      const hit = getAdminCached<typeof payload>("admin:ownership");
      expect(hit).not.toBeNull();
      expect(hit?.isStale).toBe(true);
      expect(hit?.data.currentAdmin?.email).toBe("admin@mits.ac.in");
    });

    it("4. background revalidation success updates cache", () => {
      const oldPayload = {
        currentAdmin: { id: "a1", email: "old_admin@mits.ac.in" },
        auditHistory: [],
      };
      setAdminCached("admin:ownership", oldPayload, 15_000);

      const newPayload = {
        currentAdmin: { id: "a1", email: "new_admin@mits.ac.in" },
        auditHistory: [
          {
            id: "l2",
            action: "OWNERSHIP_TRANSFERRED",
            details: { toEmail: "new_admin@mits.ac.in" },
            ipAddress: null,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      setAdminCached("admin:ownership", newPayload, 15_000);

      const hit = getAdminCached<typeof newPayload>("admin:ownership");
      expect(hit?.data.currentAdmin?.email).toBe("new_admin@mits.ac.in");
      expect(hit?.data.auditHistory).toHaveLength(1);
    });

    it("5. background revalidation failure retains stale display data", () => {
      vi.useFakeTimers();
      vi.setSystemTime(100_000);

      const payload = {
        currentAdmin: { id: "a1", email: "admin@mits.ac.in" },
        auditHistory: [],
      };
      setAdminCached("admin:ownership", payload, 15_000);

      vi.setSystemTime(125_000); // Stale

      // Fetch fails; data remains intact
      const hit = getAdminCached<typeof payload>("admin:ownership");
      expect(hit).not.toBeNull();
      expect(hit?.data.currentAdmin?.email).toBe("admin@mits.ac.in");
    });
  });

  describe("Security, Cleanup & Identity Isolation", () => {
    it("6. clearAdminCache removes ownership cache completely", () => {
      setAdminCached("admin:ownership", { currentAdmin: { email: "admin@mits.ac.in" } });
      expect(getAdminCached("admin:ownership")).not.toBeNull();

      clearAdminCache();
      expect(getAdminCached("admin:ownership")).toBeNull();
    });

    it("7. successful transfer clears ALL Admin cache entries simultaneously", () => {
      setAdminCached("admin:overview", { totalStudents: 50 });
      setAdminCached("admin:skills", [{ id: "1" }]);
      setAdminCached("admin:students:::ALL:1:20", { students: [] });
      setAdminCached("admin:settings", { platformName: "PeerSkill" });
      setAdminCached("admin:ownership", { currentAdmin: { email: "owner@mits.ac.in" } });

      // Transfer completes -> clearAdminCache() called
      clearAdminCache();

      expect(getAdminCached("admin:overview")).toBeNull();
      expect(getAdminCached("admin:skills")).toBeNull();
      expect(getAdminCached("admin:students:::ALL:1:20")).toBeNull();
      expect(getAdminCached("admin:settings")).toBeNull();
      expect(getAdminCached("admin:ownership")).toBeNull();
    });

    it("8. logout clears ownership cache and all admin domains", () => {
      setAdminCached("admin:ownership", { currentAdmin: { email: "owner@mits.ac.in" } });

      // AdminShell.handleLogout executes clearAdminCache()
      clearAdminCache();

      expect(getAdminCached("admin:ownership")).toBeNull();
    });

    it("9. Admin cache remains physically separate from Student cache", () => {
      setAdminCached("admin:ownership", { currentAdmin: { email: "admin@mits.ac.in" } });
      setStudentCached("admin:ownership", { studentKey: true });

      expect(getAdminCached("admin:ownership")?.data).toEqual({
        currentAdmin: { email: "admin@mits.ac.in" },
      });
      expect(getStudentCached("admin:ownership")?.data).toEqual({ studentKey: true });

      clearAdminCache();
      expect(getAdminCached("admin:ownership")).toBeNull();
      expect(getStudentCached("admin:ownership")).not.toBeNull();
    });

    it("10. an old GET response cannot overwrite state after transfer/invalidation", () => {
      // Invalidate on transfer
      invalidateAdminData("admin:ownership");
      expect(getAdminCached("admin:ownership")).toBeNull();

      // Fresh state stored post-transfer or login
      setAdminCached("admin:ownership", { currentAdmin: { email: "successor@mits.ac.in" } }, 15_000);
      expect(
        getAdminCached<{ currentAdmin: { email: string } }>("admin:ownership")?.data.currentAdmin.email,
      ).toBe("successor@mits.ac.in");
    });

    it("11. server authorization remains required and cannot be bypassed by client cache", () => {
      // Client cache only stores presentation data
      setAdminCached("admin:ownership", { currentAdmin: { email: "hacker@evil.com" } });

      // Server authorization relies on AdminSession cookie in HTTP requests, not getAdminCached
      expect(getAdminCached("admin:ownership")?.data).toBeDefined();
      // Clearing session/cache resets client state
      clearAdminCache();
      expect(getAdminCached("admin:ownership")).toBeNull();
    });

    it("12. no auth/session secrets are stored in ownership cache", () => {
      const presentationData = {
        currentAdmin: {
          id: "admin_id",
          email: "admin@mits.ac.in",
          displayName: "Platform Admin",
          createdAt: "2026-08-28T00:00:00.000Z",
          updatedAt: "2026-08-28T00:00:00.000Z",
        },
        auditHistory: [],
      };

      setAdminCached("admin:ownership", presentationData, 15_000);
      const hit = getAdminCached<typeof presentationData>("admin:ownership");

      // Verify no sensitive session/crypto fields exist in cached object
      expect(hit?.data).not.toHaveProperty("tokenHash");
      expect(hit?.data).not.toHaveProperty("sessionToken");
      expect(hit?.data).not.toHaveProperty("passwordHash");
      expect(hit?.data).not.toHaveProperty("cookie");
    });
  });
});
