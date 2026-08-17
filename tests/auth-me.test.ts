import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindValidSession, mockCreateSession } = vi.hoisted(() => ({
  mockFindValidSession: vi.fn(),
  mockCreateSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    findValidSession: mockFindValidSession,
    createSession: mockCreateSession,
  };
});

import { GET } from "@/app/api/auth/me/route";
import { SESSION_COOKIE_NAME } from "@/lib/session";

function createRequestWithCookie(rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  return new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers,
  });
}

function fakeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-cuid-1",
    userId: "user-cuid-123",
    tokenHash: "token-hash-123",
    expiresAt: new Date(Date.now() + 100000),
    createdAt: new Date(),
    user: {
      id: "user-cuid-123",
      email: "active@college.edu",
      passwordHash: "$argon2id$secretpasswordhash",
      collegeEmailVerified: false,
      role: "STUDENT",
      status: "ACTIVE",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      ...overrides,
    },
  };
}

describe("GET /api/auth/me (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 and safe user payload when valid session cookie is provided", async () => {
    const session = fakeSession();
    mockFindValidSession.mockResolvedValue(session);

    const response = await GET(createRequestWithCookie("valid-raw-token"));

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.user).toEqual({
      id: "user-cuid-123",
      email: "active@college.edu",
      collegeEmailVerified: false,
      role: "STUDENT",
      status: "ACTIVE",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(mockFindValidSession).toHaveBeenCalledWith("valid-raw-token");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("never includes passwordHash, tokenHash, or session internal fields in response", async () => {
    mockFindValidSession.mockResolvedValue(fakeSession());

    const response = await GET(createRequestWithCookie("valid-raw-token"));
    const json = await response.json();

    expect(json.data.user).not.toHaveProperty("passwordHash");
    expect(json.data).not.toHaveProperty("session");
    expect(json.data).not.toHaveProperty("tokenHash");
    expect(json.data).not.toHaveProperty("token");
  });

  it("returns 401 UNAAUTHENTICATED when session cookie is missing", async () => {
    const response = await GET(createRequestWithCookie());

    expect(response.status).toBe(401);
    const json = await response.json();

    expect(json.error.code).toBe("UNAUTHENTICATED");
    expect(json.error.message).toBe("Authentication required.");
    expect(mockFindValidSession).not.toHaveBeenCalled();
  });

  it("returns 401 UNAAUTHENTICATED when invalid token is provided", async () => {
    mockFindValidSession.mockResolvedValue(null);

    const response = await GET(createRequestWithCookie("invalid-token"));

    expect(response.status).toBe(401);
    const json = await response.json();

    expect(json.error.code).toBe("UNAUTHENTICATED");
    expect(json.error.message).toBe("Authentication required.");
    expect(mockFindValidSession).toHaveBeenCalledWith("invalid-token");
  });

  it("returns 401 UNAAUTHENTICATED when session is expired or revoked", async () => {
    mockFindValidSession.mockResolvedValue(null);

    const response = await GET(createRequestWithCookie("expired-token"));

    expect(response.status).toBe(401);
    const json = await response.json();

    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("does not create or rotate sessions during GET /me", async () => {
    mockFindValidSession.mockResolvedValue(fakeSession());

    await GET(createRequestWithCookie("valid-token"));

    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
