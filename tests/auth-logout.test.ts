import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRevokeSession, mockCreateSession } = vi.hoisted(() => ({
  mockRevokeSession: vi.fn(),
  mockCreateSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    revokeSession: mockRevokeSession,
    createSession: mockCreateSession,
  };
});

import { POST } from "@/app/api/auth/logout/route";
import { SESSION_COOKIE_NAME } from "@/lib/session";

function createRequestWithCookie(rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  return new Request("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers,
  });
}

describe("POST /api/auth/logout (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevokeSession.mockResolvedValue(undefined);
  });

  it("revokes valid session and clears HTTP-only cookie on logout", async () => {
    const rawToken = "raw-session-token-to-revoke";
    const response = await POST(createRequestWithCookie(rawToken));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ data: { success: true } });

    expect(mockRevokeSession).toHaveBeenCalledWith(rawToken);
    expect(mockCreateSession).not.toHaveBeenCalled();

    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookieHeader?.toLowerCase()).toContain("httponly");
    expect(cookieHeader?.toLowerCase()).toContain("path=/");
    expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");
    expect(cookieHeader).toContain("Max-Age=0");
  });

  it("returns 200 and clears cookie when session cookie is missing", async () => {
    const response = await POST(createRequestWithCookie());

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ data: { success: true } });

    expect(mockRevokeSession).not.toHaveBeenCalled();
    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toContain("Max-Age=0");
  });

  it("returns 200 and clears cookie when session token is invalid or already revoked", async () => {
    const rawToken = "already-revoked-token";
    const response = await POST(createRequestWithCookie(rawToken));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ data: { success: true } });

    expect(mockRevokeSession).toHaveBeenCalledWith(rawToken);
    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toContain("Max-Age=0");
  });

  it("never includes raw token or tokenHash in response body", async () => {
    const response = await POST(createRequestWithCookie("sample-token"));
    const json = await response.json();

    expect(json).toEqual({ data: { success: true } });
    expect(json.data).not.toHaveProperty("token");
    expect(json.data).not.toHaveProperty("rawToken");
    expect(json.data).not.toHaveProperty("tokenHash");
  });

  it("does not create a new session on logout", async () => {
    await POST(createRequestWithCookie("sample-token"));
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
