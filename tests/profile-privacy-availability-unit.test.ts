import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAuthenticatedUser, mockProfileFindUnique, mockProfileUpdate } = vi.hoisted(
  () => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockProfileFindUnique: vi.fn(),
    mockProfileUpdate: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: mockProfileFindUnique,
      update: mockProfileUpdate,
    },
  },
}));

import { PATCH as PATCH_PRIVACY } from "@/app/api/profiles/me/privacy/route";
import { PATCH as PATCH_AVAILABILITY } from "@/app/api/profiles/me/availability/route";

function createRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-cuid-123",
    email: "student@college.edu",
    passwordHash: "$argon2id$secret",
    collegeEmailVerified: true,
    role: "STUDENT" as const,
    status: "ACTIVE" as const,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function fakeProfile(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-cuid-123",
    fullName: "Aarav Mehta",
    avatarUrl: null,
    department: "Computer Science",
    branch: "CSE",
    graduationYear: 2027,
    section: "A",
    bio: "Web Dev student",
    helpAvailable: true,
    helpStatus: "Available for DSA questions",
    contactVisibility: "CONNECTIONS" as const,
    chatRequestVisibility: "CONNECTIONS" as const,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("PATCH /api/profiles/me/privacy (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAAUTHENTICATED when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PATCH_PRIVACY(
      createRequest("http://localhost:3000/api/profiles/me/privacy", "PATCH", {
        contactVisibility: "COLLEGE",
      }),
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 ACCOUNT_SUSPENDED when user status is SUSPENDED", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser({ status: "SUSPENDED" }));

    const response = await PATCH_PRIVACY(
      createRequest("http://localhost:3000/api/profiles/me/privacy", "PATCH", {
        contactVisibility: "COLLEGE",
      }),
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_JSON for malformed JSON request body", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser());

    const request = new Request("http://localhost:3000/api/profiles/me/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    });

    const response = await PATCH_PRIVACY(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_JSON");
  });

  it("returns 422 VALIDATION_ERROR for empty object", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser());

    const response = await PATCH_PRIVACY(
      createRequest("http://localhost:3000/api/profiles/me/privacy", "PATCH", {}),
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR for invalid enum value", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser());

    const response = await PATCH_PRIVACY(
      createRequest("http://localhost:3000/api/profiles/me/privacy", "PATCH", {
        contactVisibility: "INVALID_VALUE",
      }),
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates contactVisibility, ignores client-supplied userId, and preserves chatRequestVisibility", async () => {
    const user = fakeUser();
    mockGetAuthenticatedUser.mockResolvedValue(user);
    mockProfileFindUnique.mockResolvedValue(fakeProfile());

    mockProfileUpdate.mockResolvedValue(
      fakeProfile({ contactVisibility: "COLLEGE" }),
    );

    const response = await PATCH_PRIVACY(
      createRequest("http://localhost:3000/api/profiles/me/privacy", "PATCH", {
        contactVisibility: "COLLEGE",
        userId: "hacker-id",
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.profile.contactVisibility).toBe("COLLEGE");
    expect(json.data.profile.chatRequestVisibility).toBe("CONNECTIONS");
    expect(json.data.user.status).toBe("ACTIVE");

    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: user.id },
      data: { contactVisibility: "COLLEGE" },
    });

    expect(json.data.user).not.toHaveProperty("passwordHash");
  });

  it("updates chatRequestVisibility independently", async () => {
    const user = fakeUser();
    mockGetAuthenticatedUser.mockResolvedValue(user);
    mockProfileFindUnique.mockResolvedValue(fakeProfile());

    mockProfileUpdate.mockResolvedValue(
      fakeProfile({ chatRequestVisibility: "NOBODY" }),
    );

    const response = await PATCH_PRIVACY(
      createRequest("http://localhost:3000/api/profiles/me/privacy", "PATCH", {
        chatRequestVisibility: "NOBODY",
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.profile.chatRequestVisibility).toBe("NOBODY");
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: user.id },
      data: { chatRequestVisibility: "NOBODY" },
    });
  });
});

describe("PATCH /api/profiles/me/availability (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAAUTHENTICATED when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PATCH_AVAILABILITY(
      createRequest("http://localhost:3000/api/profiles/me/availability", "PATCH", {
        helpAvailable: false,
      }),
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 ACCOUNT_SUSPENDED when user status is SUSPENDED", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser({ status: "SUSPENDED" }));

    const response = await PATCH_AVAILABILITY(
      createRequest("http://localhost:3000/api/profiles/me/availability", "PATCH", {
        helpAvailable: false,
      }),
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(mockProfileUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_JSON for malformed JSON request body", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser());

    const request = new Request("http://localhost:3000/api/profiles/me/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    });

    const response = await PATCH_AVAILABILITY(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_JSON");
  });

  it("returns 422 VALIDATION_ERROR for empty object", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser());

    const response = await PATCH_AVAILABILITY(
      createRequest("http://localhost:3000/api/profiles/me/availability", "PATCH", {}),
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 VALIDATION_ERROR for invalid helpAvailable type", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser());

    const response = await PATCH_AVAILABILITY(
      createRequest("http://localhost:3000/api/profiles/me/availability", "PATCH", {
        helpAvailable: "not-a-boolean",
      }),
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates helpAvailable, ignores client-supplied userId, and preserves helpStatus", async () => {
    const user = fakeUser();
    mockGetAuthenticatedUser.mockResolvedValue(user);
    mockProfileFindUnique.mockResolvedValue(fakeProfile());

    mockProfileUpdate.mockResolvedValue(
      fakeProfile({ helpAvailable: false }),
    );

    const response = await PATCH_AVAILABILITY(
      createRequest("http://localhost:3000/api/profiles/me/availability", "PATCH", {
        helpAvailable: false,
        userId: "hacker-id",
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.profile.helpAvailable).toBe(false);
    expect(json.data.user.status).toBe("ACTIVE");

    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: user.id },
      data: { helpAvailable: false },
    });

    expect(json.data.user).not.toHaveProperty("passwordHash");
  });

  it("clears helpStatus when null is supplied", async () => {
    const user = fakeUser();
    mockGetAuthenticatedUser.mockResolvedValue(user);
    mockProfileFindUnique.mockResolvedValue(fakeProfile());

    mockProfileUpdate.mockResolvedValue(
      fakeProfile({ helpStatus: null }),
    );

    const response = await PATCH_AVAILABILITY(
      createRequest("http://localhost:3000/api/profiles/me/availability", "PATCH", {
        helpStatus: null,
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.profile.helpStatus).toBeNull();
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      where: { userId: user.id },
      data: { helpStatus: null },
    });
  });
});
