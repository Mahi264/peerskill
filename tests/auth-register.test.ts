import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — values declared here are available inside vi.mock factories
// because vi.mock calls are hoisted above all other module-level code.
// ---------------------------------------------------------------------------

const {
  mockUserFindUnique,
  mockUserCreate,
  mockCreateSession,
  MockPrismaClientKnownRequestError,
} = vi.hoisted(() => {
  class _MockPrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    constructor(
      message: string,
      { code, meta }: { code: string; meta?: Record<string, unknown> },
    ) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = code;
      this.meta = meta;
    }
  }

  return {
    mockUserFindUnique: vi.fn(),
    mockUserCreate: vi.fn(),
    mockCreateSession: vi.fn(),
    MockPrismaClientKnownRequestError: _MockPrismaClientKnownRequestError,
  };
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("server-only", () => ({}));

vi.mock("@prisma/client/runtime/library", () => ({
  PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
  },
}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    createSession: mockCreateSession,
  };
});

vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "file:./test.db",
    COLLEGE_EMAIL_DOMAIN: "college.edu",
  },
}));

// ---------------------------------------------------------------------------
// Import the handler under test AFTER mocks are registered.
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/auth/register/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return { email: "student@college.edu", password: "securepassword123" };
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-cuid",
    email: "student@college.edu",
    passwordHash: "$argon2id$fake-hash",
    collegeEmailVerified: false,
    role: "STUDENT",
    status: "PENDING",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockResolvedValue({
      rawToken: "raw-session-token-for-register",
      session: {
        id: "session-id-1",
        userId: "test-cuid",
        tokenHash: "token-hash",
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    });
  });

  // ----- Success -----

  it("returns 201, creates a user, and issues a session cookie on valid registration", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) =>
        fakeUser({ email: data.email, passwordHash: data.passwordHash }),
    );

    const response = await POST(createRequest(validBody()));

    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.data.user).toMatchObject({
      email: "student@college.edu",
      collegeEmailVerified: false,
      role: "STUDENT",
      status: "PENDING",
    });
    expect(json.data.user).toHaveProperty("id");
    expect(json.data.user).toHaveProperty("createdAt");

    // Verify session was created
    expect(mockCreateSession).toHaveBeenCalledWith("test-cuid");

    // Verify HTTP-only session cookie is set
    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain("peerskill_session=raw-session-token-for-register");
    expect(cookieHeader?.toLowerCase()).toContain("httponly");
    expect(cookieHeader?.toLowerCase()).toContain("path=/");
    expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");
  });

  it("does not include passwordHash or raw session token in the response", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) =>
        fakeUser({ passwordHash: data.passwordHash }),
    );

    const response = await POST(createRequest(validBody()));
    const json = await response.json();

    expect(json.data.user).not.toHaveProperty("passwordHash");
    expect(json.data).not.toHaveProperty("token");
    expect(json.data).not.toHaveProperty("rawToken");
    expect(json.data.user).not.toHaveProperty("rawToken");
  });

  it("normalizes email to lowercase before storing", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) =>
        fakeUser({ email: data.email }),
    );

    await POST(
      createRequest({ email: "Student@College.EDU", password: "securepassword123" }),
    );

    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "student@college.edu" }),
      }),
    );
  });

  // ----- Validation: invalid email format -----

  it("returns 422 for an invalid email format", async () => {
    const response = await POST(
      createRequest({ email: "not-an-email", password: "securepassword123" }),
    );

    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details).toHaveProperty("email");
  });

  it("returns 422 when email is missing", async () => {
    const response = await POST(
      createRequest({ password: "securepassword123" }),
    );

    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  // ----- Validation: non-college email -----

  it("returns 422 for a valid email that is not from the college domain", async () => {
    const response = await POST(
      createRequest({ email: "user@gmail.com", password: "securepassword123" }),
    );

    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.error.code).toBe("INVALID_COLLEGE_EMAIL");
  });

  // ----- Validation: password too short -----

  it("returns 422 when the password is shorter than 8 characters", async () => {
    const response = await POST(
      createRequest({ email: "student@college.edu", password: "short" }),
    );

    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(json.error.details).toHaveProperty("password");
  });

  it("returns 422 when the password is missing", async () => {
    const response = await POST(
      createRequest({ email: "student@college.edu" }),
    );

    expect(response.status).toBe(422);

    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  // ----- Duplicate email -----

  it("returns 409 when the email already exists", async () => {
    mockUserFindUnique.mockResolvedValue(fakeUser());

    const response = await POST(createRequest(validBody()));

    expect(response.status).toBe(409);

    const json = await response.json();
    expect(json.error.code).toBe("DUPLICATE_EMAIL");
  });

  // ----- Password is stored hashed, never plaintext -----

  it("stores the password as an Argon2id hash, not plaintext", async () => {
    const plaintext = "securepassword123";

    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) =>
        fakeUser({ passwordHash: data.passwordHash }),
    );

    await POST(createRequest({ email: "student@college.edu", password: plaintext }));

    expect(mockUserCreate).toHaveBeenCalledOnce();

    const createCall = mockUserCreate.mock.calls[0][0] as {
      data: { passwordHash: string };
    };
    const storedHash = createCall.data.passwordHash;

    expect(storedHash).not.toBe(plaintext);
    expect(storedHash).toContain("$argon2id$");
  });

  // ----- New account is unverified and PENDING -----

  it("creates the account with collegeEmailVerified false and status PENDING", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => fakeUser(data),
    );

    await POST(createRequest(validBody()));

    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collegeEmailVerified: false,
          status: "PENDING",
          role: "STUDENT",
        }),
      }),
    );
  });

  // ----- Prisma P2002 unique constraint race condition -----

  it("returns 409 when Prisma create throws a P2002 unique constraint error", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockRejectedValue(
      new MockPrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`email`)",
        { code: "P2002", meta: { target: ["email"] } },
      ),
    );

    const response = await POST(createRequest(validBody()));

    expect(response.status).toBe(409);

    const json = await response.json();
    expect(json.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("re-throws non-P2002 Prisma errors", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockRejectedValue(new Error("Unexpected database error"));

    await expect(POST(createRequest(validBody()))).rejects.toThrow(
      "Unexpected database error",
    );
  });

  // ----- Malformed JSON body -----

  it("returns 400 for a non-JSON request body", async () => {
    const request = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error.code).toBe("INVALID_JSON");
  });
});
