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

import { getAuthenticatedUser } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

function createRequestWithCookie(rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  return new Request("http://localhost:3000/api/some-protected-route", {
    method: "GET",
    headers,
  });
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-cuid-123",
    email: "student@college.edu",
    passwordHash: "$argon2id$secret",
    collegeEmailVerified: true,
    status: "ACTIVE" as const,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("getAuthenticatedUser (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns authenticated user when valid session cookie is provided", async () => {
    const user = fakeUser();
    mockFindValidSession.mockResolvedValue({
      id: "session-id-1",
      userId: user.id,
      tokenHash: "token-hash",
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      user,
    });

    const result = await getAuthenticatedUser(createRequestWithCookie("valid-raw-token"));

    expect(result).toEqual(user);
    expect(mockFindValidSession).toHaveBeenCalledWith("valid-raw-token");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns null when session cookie is missing", async () => {
    const result = await getAuthenticatedUser(createRequestWithCookie());

    expect(result).toBeNull();
    expect(mockFindValidSession).not.toHaveBeenCalled();
  });

  it("returns null when session token is invalid", async () => {
    mockFindValidSession.mockResolvedValue(null);

    const result = await getAuthenticatedUser(createRequestWithCookie("invalid-token"));

    expect(result).toBeNull();
    expect(mockFindValidSession).toHaveBeenCalledWith("invalid-token");
  });

  it("returns null when session is expired or revoked", async () => {
    mockFindValidSession.mockResolvedValue(null);

    const result = await getAuthenticatedUser(createRequestWithCookie("expired-token"));

    expect(result).toBeNull();
    expect(mockFindValidSession).toHaveBeenCalledWith("expired-token");
  });

  it("passes the raw cookie token unchanged to findValidSession", async () => {
    const rawToken = "custom-opaque-raw-token-12345";
    mockFindValidSession.mockResolvedValue(null);

    await getAuthenticatedUser(createRequestWithCookie(rawToken));

    expect(mockFindValidSession).toHaveBeenCalledWith(rawToken);
  });
});
