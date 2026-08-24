import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindValidSession,
  mockDoubtCreate,
  mockDoubtFindMany,
  mockDoubtCount,
  mockDoubtFindUnique,
  mockDoubtDelete,
  mockDoubtSkillDeleteMany,
  mockSkillFindFirst,
  mockSkillCreate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockFindValidSession: vi.fn(),
  mockDoubtCreate: vi.fn(),
  mockDoubtFindMany: vi.fn(),
  mockDoubtCount: vi.fn(),
  mockDoubtFindUnique: vi.fn(),
  mockDoubtDelete: vi.fn(),
  mockDoubtSkillDeleteMany: vi.fn(),
  mockSkillFindFirst: vi.fn(),
  mockSkillCreate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doubt: {
      create: mockDoubtCreate,
      findMany: mockDoubtFindMany,
      count: mockDoubtCount,
      findUnique: mockDoubtFindUnique,
      delete: mockDoubtDelete,
    },
    doubtSkill: {
      deleteMany: mockDoubtSkillDeleteMany,
    },
    skill: {
      findFirst: mockSkillFindFirst,
      create: mockSkillCreate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    findValidSession: mockFindValidSession,
  };
});

import { GET, POST } from "@/app/api/doubts/route";
import { DELETE, GET as GET_DETAIL } from "@/app/api/doubts/[id]/route";
import { SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(url: string, method = "GET", body?: unknown, rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function fakeSession(status: "PENDING" | "ACTIVE" | "SUSPENDED" = "ACTIVE") {
  return {
    id: "sess-1",
    userId: "user-1",
    tokenHash: "hash-1",
    expiresAt: new Date(Date.now() + 10000),
    user: {
      id: "user-1",
      email: "student@college.edu",
      status,
      createdAt: new Date(),
    },
  };
}

describe("Doubts API (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/doubts", () => {
    it("returns 401 UNAAUTHENTICATED when session cookie is missing", async () => {
      const res = await POST(createRequest("http://localhost:3000/api/doubts", "POST", { title: "Valid Title Here" }));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 403 FORBIDDEN when user is PENDING", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("PENDING"));
      const res = await POST(createRequest("http://localhost:3000/api/doubts", "POST", { title: "Valid Title Here" }, "token"));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("returns 400 when title is missing or less than 5 characters", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      const res = await POST(createRequest("http://localhost:3000/api/doubts", "POST", { title: "Hey" }, "token"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_TITLE");
    });

    it("returns 400 when body is missing or less than 10 characters", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      const res = await POST(
        createRequest("http://localhost:3000/api/doubts", "POST", { title: "How to reverse array in C++?", body: "short" }, "token"),
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_BODY");
    });

    it("returns 400 when skills array is empty", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      const res = await POST(
        createRequest(
          "http://localhost:3000/api/doubts",
          "POST",
          { title: "How to reverse array in C++?", body: "I am trying to reverse an array using std::reverse.", skills: [] },
          "token",
        ),
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("SKILLS_REQUIRED");
    });

    it("creates doubt successfully and returns 201 Created", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      mockSkillFindFirst.mockResolvedValue({ id: "skill-1", name: "C++", slug: "cpp" });
      mockDoubtCreate.mockResolvedValue({
        id: "doubt-1",
        authorId: "user-1",
        title: "How to reverse array in C++?",
        body: "I am trying to reverse an array using std::reverse in C++.",
        urgency: "ASSIGNMENT_STUCK",
        status: "OPEN",
        answerCount: 0,
        acceptedAnswerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: "user-1",
          email: "student@college.edu",
          profile: { fullName: "Aarav Sharma", branch: "Computer Science & Engineering (CSE)", avatarUrl: null },
        },
        skills: [{ skill: { id: "skill-1", name: "C++", slug: "cpp" } }],
      });

      const res = await POST(
        createRequest(
          "http://localhost:3000/api/doubts",
          "POST",
          {
            title: "How to reverse array in C++?",
            body: "I am trying to reverse an array using std::reverse in C++.",
            urgency: "ASSIGNMENT_STUCK",
            skills: ["C++"],
          },
          "token",
        ),
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.doubt).toMatchObject({
        id: "doubt-1",
        title: "How to reverse array in C++?",
        urgency: "ASSIGNMENT_STUCK",
        status: "OPEN",
      });
    });
  });

  describe("GET /api/doubts", () => {
    it("returns doubts list and 200 OK", async () => {
      mockDoubtFindMany.mockResolvedValue([]);
      mockDoubtCount.mockResolvedValue(0);

      const res = await GET(createRequest("http://localhost:3000/api/doubts?status=OPEN"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.doubts).toEqual([]);
      expect(json.data.total).toBe(0);
    });
  });

  describe("DELETE /api/doubts/[id]", () => {
    it("returns 401 when session cookie is missing", async () => {
      const res = await DELETE(createRequest("http://localhost:3000/api/doubts/doubt-1", "DELETE"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 404 when doubt is not found", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue(null);

      const res = await DELETE(createRequest("http://localhost:3000/api/doubts/doubt-1", "DELETE", undefined, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 403 when user is NOT the doubt author", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "other-user-id", status: "OPEN", answerCount: 0, answers: [] });

      const res = await DELETE(createRequest("http://localhost:3000/api/doubts/doubt-1", "DELETE", undefined, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("returns 400 when doubt has one or more answers", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "user-1", status: "OPEN", answerCount: 1, answers: [{ id: "ans-1" }] });

      const res = await DELETE(createRequest("http://localhost:3000/api/doubts/doubt-1", "DELETE", undefined, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("DOUBT_HAS_ANSWERS");
    });

    it("returns 400 when doubt is RESOLVED or CLOSED", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "user-1", status: "RESOLVED", answerCount: 0, answers: [] });

      const res = await DELETE(createRequest("http://localhost:3000/api/doubts/doubt-1", "DELETE", undefined, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("DOUBT_NOT_OPEN");
    });

    it("deletes doubt successfully when author, OPEN, and 0 answers", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "user-1", status: "OPEN", answerCount: 0, answers: [] });
      mockTransaction.mockResolvedValue([{}, {}]);

      const res = await DELETE(createRequest("http://localhost:3000/api/doubts/doubt-1", "DELETE", undefined, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(true);
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe("GET /api/doubts/[id]", () => {
    it("returns 404 when doubt is not found", async () => {
      mockDoubtFindUnique.mockResolvedValue(null);
      const res = await GET_DETAIL(createRequest("http://localhost:3000/api/doubts/nonexistent"), {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("DOUBT_NOT_FOUND");
    });
  });
});
