import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUserFindUnique, mockVerifyPassword, mockCreateSession } = vi.hoisted(
  () => ({
    mockUserFindUnique: vi.fn(),
    mockVerifyPassword: vi.fn(),
    mockCreateSession: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: mockVerifyPassword,
}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    createSession: mockCreateSession,
  };
});

import { POST } from "@/app/api/auth/login/route";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return { email: "active@college.edu", password: "correctpassword123" };
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-cuid-123",
    email: "active@college.edu",
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$realhash",
    collegeEmailVerified: false,
    role: "STUDENT",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("POST /api/auth/login (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockResolvedValue({
      rawToken: "raw-session-token-64-bytes-hex",
      session: {
        id: "session-id-1",
        userId: "user-cuid-123",
        tokenHash: "token-hash",
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    });
  });

  it("returns 200, safe user payload, and HTTP-only cookie on valid credentials for active user", async () => {
    const user = fakeUser();
    mockUserFindUnique.mockResolvedValue(user);
    mockVerifyPassword.mockResolvedValue(true);

    const response = await POST(createRequest(validBody()));

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.user).toMatchObject({
      id: "user-cuid-123",
      email: "active@college.edu",
      collegeEmailVerified: false,
      role: "STUDENT",
      status: "ACTIVE",
    });

    expect(mockCreateSession).toHaveBeenCalledWith("user-cuid-123");

    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain("peerskill_session=raw-session-token-64-bytes-hex");
    expect(cookieHeader?.toLowerCase()).toContain("httponly");
    expect(cookieHeader?.toLowerCase()).toContain("path=/");
    expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");
  });

  it("never includes passwordHash or raw session token in the JSON response", async () => {
    mockUserFindUnique.mockResolvedValue(fakeUser());
    mockVerifyPassword.mockResolvedValue(true);

    const response = await POST(createRequest(validBody()));
    const json = await response.json();

    expect(json.data.user).not.toHaveProperty("passwordHash");
    expect(json.data).not.toHaveProperty("token");
    expect(json.data).not.toHaveProperty("rawToken");
    expect(json.data.user).not.toHaveProperty("rawToken");
  });

  it("normalizes email to lowercase before database query", async () => {
    mockUserFindUnique.mockResolvedValue(fakeUser());
    mockVerifyPassword.mockResolvedValue(true);

    await POST(
      createRequest({
        email: "Active@College.EDU",
        password: "correctpassword123",
      }),
    );

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: "active@college.edu" },
    });
  });


  it("returns 422 for invalid email format", async () => {
    const response = await POST(
      createRequest({ email: "invalid-email", password: "somepassword" }),
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details).toHaveProperty("email");
  });

  it("returns 422 for missing password", async () => {
    const response = await POST(
      createRequest({ email: "active@college.edu", password: "" }),
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details).toHaveProperty("password");
  });

  it("returns 400 for malformed JSON request body", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json-body",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_JSON");
  });

  it("returns 401 with generic INVALID_CREDENTIALS for nonexistent account", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        email: "nonexistent@college.edu",
        password: "password123",
      }),
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_CREDENTIALS");
    expect(json.error.message).toBe("Invalid email or password.");
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 401 with generic INVALID_CREDENTIALS for incorrect password", async () => {
    mockUserFindUnique.mockResolvedValue(fakeUser());
    mockVerifyPassword.mockResolvedValue(false);

    const response = await POST(
      createRequest({
        email: "active@college.edu",
        password: "wrongpassword",
      }),
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_CREDENTIALS");
    expect(json.error.message).toBe("Invalid email or password.");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("returns 200 and issues a session cookie for PENDING user to allow onboarding", async () => {
    const user = fakeUser({ status: "PENDING" });
    mockUserFindUnique.mockResolvedValue(user);
    mockVerifyPassword.mockResolvedValue(true);

    const response = await POST(createRequest(validBody()));

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data.user).toMatchObject({
      id: "user-cuid-123",
      email: "active@college.edu",
      status: "PENDING",
    });

    expect(mockCreateSession).toHaveBeenCalledWith("user-cuid-123");

    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain("peerskill_session=raw-session-token-64-bytes-hex");
    expect(cookieHeader?.toLowerCase()).toContain("httponly");
  });

  it("returns 403 with ACCOUNT_SUSPENDED when user status is SUSPENDED", async () => {
    mockUserFindUnique.mockResolvedValue(fakeUser({ status: "SUSPENDED" }));
    mockVerifyPassword.mockResolvedValue(true);

    const response = await POST(createRequest(validBody()));

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(json.error.message).toBe("Account is suspended.");
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
