import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "@/app/api/users/[id]/route";
import * as auth from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/users/[id] (Unit Tests)", () => {
  it("returns 401 UNAUTHENTICATED when viewer is not logged in", async () => {
    vi.spyOn(auth, "getAuthenticatedUser").mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/users/user-123");
    const res = await GET(req, { params: Promise.resolve({ id: "user-123" }) });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when viewer is SUSPENDED", async () => {
    vi.spyOn(auth, "getAuthenticatedUser").mockResolvedValueOnce({
      id: "viewer-1",
      email: "viewer@mitsgwl.ac.in",
      role: "STUDENT",
      status: "SUSPENDED",
      googleId: null,
      passwordHash: null,
      collegeEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new Request("http://localhost:3000/api/users/user-123");
    const res = await GET(req, { params: Promise.resolve({ id: "user-123" }) });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("returns 404 when target user does not exist or is not ACTIVE", async () => {
    vi.spyOn(auth, "getAuthenticatedUser").mockResolvedValueOnce({
      id: "viewer-1",
      email: "viewer@mitsgwl.ac.in",
      role: "STUDENT",
      status: "ACTIVE",
      googleId: null,
      passwordHash: null,
      collegeEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/users/missing-id");
    const res = await GET(req, { params: Promise.resolve({ id: "missing-id" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("USER_NOT_FOUND");
  });
});
