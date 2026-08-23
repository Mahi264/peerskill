import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAuthenticatedUser, mockProfileUpsert, mockProfileFindUnique, mockSkillFindUnique, mockSkillFindFirst, mockSkillCreate, mockSkillUpsert, mockUserSkillDeleteMany, mockUserSkillCreateMany, mockUserSkillFindMany, mockUserUpdate, mockTransaction } = vi.hoisted(
  () => ({
    mockGetAuthenticatedUser: vi.fn(),
    mockProfileUpsert: vi.fn(),
    mockProfileFindUnique: vi.fn(),
    mockSkillFindUnique: vi.fn(),
    mockSkillFindFirst: vi.fn(),
    mockSkillCreate: vi.fn(),
    mockSkillUpsert: vi.fn(),
    mockUserSkillDeleteMany: vi.fn(),
    mockUserSkillCreateMany: vi.fn(),
    mockUserSkillFindMany: vi.fn(),
    mockUserUpdate: vi.fn(),
    mockTransaction: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: mockGetAuthenticatedUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      upsert: mockProfileUpsert,
      findUnique: mockProfileFindUnique,
    },
    skill: {
      findUnique: mockSkillFindUnique,
      findFirst: mockSkillFindFirst,
      create: mockSkillCreate,
      upsert: mockSkillUpsert,
    },
    userSkill: {
      deleteMany: mockUserSkillDeleteMany,
      createMany: mockUserSkillCreateMany,
      findMany: mockUserSkillFindMany,
    },
    user: {
      update: mockUserUpdate,
    },
    $transaction: mockTransaction,
  },
}));

import { PATCH } from "@/app/api/profiles/me/route";
import { PUT as PUT_SKILLS } from "@/app/api/profiles/me/skills/route";

function createRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-cuid-123",
    email: "student@college.edu",
    passwordHash: "$argon2id$secret",
    collegeEmailVerified: false,
    role: "STUDENT" as const,
    status: "PENDING" as const,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("PATCH /api/profiles/me (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAAUTHENTICATED when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PATCH(
      createRequest("http://localhost:3000/api/profiles/me", "PATCH", {
        fullName: "Aarav Mehta",
        branch: "Computer Science & Engineering (CSE)",
      }),
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("updates profile without requiring department (department completely removed)", async () => {
    const user = fakeUser();
    mockGetAuthenticatedUser.mockResolvedValue(user);

    mockProfileUpsert.mockResolvedValue({
      userId: user.id,
      fullName: "Aarav Mehta",
      avatarUrl: null,
      branch: "Computer Science & Engineering (CSE)",
      graduationYear: 2028,
      section: "A",
      bio: "Learning DSA and Web Dev",
      helpAvailable: true,
      contactVisibility: "CONNECTIONS",
      chatRequestVisibility: "CONNECTIONS",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const response = await PATCH(
      createRequest("http://localhost:3000/api/profiles/me", "PATCH", {
        branch: "Computer Science & Engineering (CSE)",
        graduationYear: 2028,
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.profile.branch).toBe("Computer Science & Engineering (CSE)");
    expect(json.data.profile).not.toHaveProperty("department");
  });

  it("returns 403 ACCOUNT_SUSPENDED when user status is SUSPENDED", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser({ status: "SUSPENDED" }));

    const response = await PATCH(
      createRequest("http://localhost:3000/api/profiles/me", "PATCH", {
        fullName: "Aarav Mehta",
        branch: "Computer Science & Engineering (CSE)",
      }),
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(json.error.message).toBe("Account is suspended.");
    expect(mockProfileUpsert).not.toHaveBeenCalled();
  });

  it("upserts profile for authenticated user and returns safe payload", async () => {

    const user = fakeUser();
    mockGetAuthenticatedUser.mockResolvedValue(user);

    mockProfileUpsert.mockResolvedValue({
      userId: user.id,
      fullName: "Aarav Mehta",
      avatarUrl: null,
      branch: "CSE",
      graduationYear: 2028,
      section: "A",
      bio: "Learning DSA and Web Dev",
      helpAvailable: true,
      contactVisibility: "CONNECTIONS",
      chatRequestVisibility: "CONNECTIONS",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const response = await PATCH(
      createRequest("http://localhost:3000/api/profiles/me", "PATCH", {
        fullName: "Aarav Mehta",
        branch: "CSE",
        graduationYear: 2028,
        section: "A",
        bio: "Learning DSA and Web Dev",
        userId: "attacker-user-id", // should be ignored
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.profile).toMatchObject({
      userId: "user-cuid-123",
      fullName: "Aarav Mehta",
      branch: "CSE",
    });

    expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-cuid-123" },
      }),
    );

    expect(json.data.user).not.toHaveProperty("passwordHash");
  });
});

describe("PUT /api/profiles/me/skills (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAAUTHENTICATED when unauthenticated", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const response = await PUT_SKILLS(
      createRequest("http://localhost:3000/api/profiles/me/skills", "PUT", {
        skills: [{ name: "React", level: "ADVANCED" }],
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 422 VALIDATION_ERROR when fewer than 3 skills are provided", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser());

    const response = await PUT_SKILLS(
      createRequest("http://localhost:3000/api/profiles/me/skills", "PUT", {
        skills: [
          { name: "React", level: "ADVANCED" },
          { name: "Node.js", level: "INTERMEDIATE" },
        ],
      }),
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 ACCOUNT_SUSPENDED when user status is SUSPENDED and does not activate user", async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser({ status: "SUSPENDED" }));

    const response = await PUT_SKILLS(
      createRequest("http://localhost:3000/api/profiles/me/skills", "PUT", {
        skills: [
          { name: "React", level: "ADVANCED" },
          { name: "Node.js", level: "INTERMEDIATE" },
          { name: "TypeScript", level: "BEGINNER" },
        ],
      }),
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(json.error.message).toBe("Account is suspended.");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("replaces user skills and transitions status to ACTIVE when profile exists and >= 3 skills provided", async () => {

    const user = fakeUser({ status: "PENDING" });
    mockGetAuthenticatedUser.mockResolvedValue(user);

    mockSkillFindFirst.mockImplementation(async ({ where }: { where?: { OR?: Array<{ slug?: string }> } }) => {
      const slug = where?.OR?.[0]?.slug;
      if (slug === "react") return { id: "skill-1", name: "React", slug: "react" };
      if (slug === "node-js") return { id: "skill-2", name: "Node.js", slug: "node-js" };
      if (slug === "typescript") return { id: "skill-3", name: "TypeScript", slug: "typescript" };
      return null;
    });

    mockTransaction.mockResolvedValue([{}, {}]);
    mockProfileFindUnique.mockResolvedValue({ userId: user.id, fullName: "Aarav" });
    mockUserUpdate.mockResolvedValue({ ...user, status: "ACTIVE" });

    mockUserSkillFindMany.mockResolvedValue([
      { id: "us-1", userId: user.id, skillId: "skill-1", level: "ADVANCED", skill: { name: "React", slug: "react" } },
      { id: "us-2", userId: user.id, skillId: "skill-2", level: "INTERMEDIATE", skill: { name: "Node.js", slug: "node-js" } },
      { id: "us-3", userId: user.id, skillId: "skill-3", level: "BEGINNER", skill: { name: "TypeScript", slug: "typescript" } },
    ]);

    const response = await PUT_SKILLS(
      createRequest("http://localhost:3000/api/profiles/me/skills", "PUT", {
        skills: [
          { name: "React", level: "ADVANCED" },
          { name: "Node.js", level: "INTERMEDIATE" },
          { name: "TypeScript", level: "BEGINNER" },
        ],
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.skills).toHaveLength(3);
    expect(json.data.user.status).toBe("ACTIVE");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { status: "ACTIVE" },
    });
  });
});
