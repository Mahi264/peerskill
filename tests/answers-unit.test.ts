import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindValidSession,
  mockDoubtFindUnique,
  mockAnswerCreate,
  mockDoubtUpdate,
  mockTransaction,
  mockAnswerFindFirst,
  mockAnswerUpdateMany,
  mockAnswerUpdate,
} = vi.hoisted(() => ({
  mockFindValidSession: vi.fn(),
  mockDoubtFindUnique: vi.fn(),
  mockAnswerCreate: vi.fn(),
  mockDoubtUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockAnswerFindFirst: vi.fn(),
  mockAnswerUpdateMany: vi.fn(),
  mockAnswerUpdate: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doubt: {
      findUnique: mockDoubtFindUnique,
      update: mockDoubtUpdate,
    },
    answer: {
      create: mockAnswerCreate,
      findFirst: mockAnswerFindFirst,
      updateMany: mockAnswerUpdateMany,
      update: mockAnswerUpdate,
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

import { POST as POST_ACCEPT } from "@/app/api/doubts/[id]/accept/route";
import { POST as POST_ANSWER } from "@/app/api/doubts/[id]/answers/route";
import { SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(url: string, method = "POST", body?: unknown, rawToken?: string): Request {
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

function fakeSession(userId = "user-2", status: "PENDING" | "ACTIVE" | "SUSPENDED" = "ACTIVE") {
  return {
    id: "sess-1",
    userId,
    tokenHash: "hash-1",
    expiresAt: new Date(Date.now() + 10000),
    user: {
      id: userId,
      email: "helper@college.edu",
      role: "STUDENT",
      status,
      createdAt: new Date(),
    },
  };
}

describe("Answers & Accept API (Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/doubts/[id]/answers", () => {
    it("returns 401 when session cookie is missing", async () => {
      const res = await POST_ANSWER(createRequest("http://localhost:3000/api/doubts/doubt-1/answers", "POST", { body: "Use std::reverse" }), {
        params: Promise.resolve({ id: "doubt-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 404 when doubt is not found", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("user-2", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue(null);

      const res = await POST_ANSWER(createRequest("http://localhost:3000/api/doubts/doubt-1/answers", "POST", { body: "Use std::reverse" }, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("DOUBT_NOT_FOUND");
    });

    it("returns 400 when body is less than 5 characters", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("user-2", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", status: "OPEN" });

      const res = await POST_ANSWER(createRequest("http://localhost:3000/api/doubts/doubt-1/answers", "POST", { body: "no" }, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_BODY");
    });

    it("allows answering an OPEN doubt", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("user-2", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", status: "OPEN", authorId: "asker-1" });
      mockTransaction.mockResolvedValue([
        {
          id: "ans-1",
          doubtId: "doubt-1",
          authorId: "user-2",
          body: "Here is the solution to your problem.",
          isAccepted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: "user-2", email: "helper@college.edu", profile: { fullName: "Helper", department: "CS", avatarUrl: null } },
        },
        { id: "doubt-1", answerCount: 1 },
      ]);

      const res = await POST_ANSWER(createRequest("http://localhost:3000/api/doubts/doubt-1/answers", "POST", { body: "Here is the solution to your problem." }, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.answer.id).toBe("ans-1");
    });

    it("allows answering a RESOLVED doubt", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("user-2", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", status: "RESOLVED", authorId: "asker-1" });
      mockTransaction.mockResolvedValue([
        {
          id: "ans-2",
          doubtId: "doubt-1",
          authorId: "user-2",
          body: "Here is an alternative solution.",
          isAccepted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: "user-2", email: "helper@college.edu", profile: { fullName: "Helper", department: "CS", avatarUrl: null } },
        },
        { id: "doubt-1", answerCount: 2 },
      ]);

      const res = await POST_ANSWER(createRequest("http://localhost:3000/api/doubts/doubt-1/answers", "POST", { body: "Here is an alternative solution." }, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.answer.id).toBe("ans-2");
    });

    it("rejects answers on CLOSED doubts with 400 DOUBT_CLOSED", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("user-2", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", status: "CLOSED", authorId: "asker-1" });

      const res = await POST_ANSWER(createRequest("http://localhost:3000/api/doubts/doubt-1/answers", "POST", { body: "Attempting to answer a closed doubt." }, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("DOUBT_CLOSED");
    });

    it("allows the doubt author to answer their own doubt", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("asker-1", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", status: "OPEN", authorId: "asker-1" });
      mockTransaction.mockResolvedValue([
        {
          id: "ans-self",
          doubtId: "doubt-1",
          authorId: "asker-1",
          body: "I solved it myself using this approach.",
          isAccepted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: "asker-1", email: "asker@college.edu", profile: { fullName: "Asker", department: "CS", avatarUrl: null } },
        },
        { id: "doubt-1", answerCount: 1 },
      ]);

      const res = await POST_ANSWER(createRequest("http://localhost:3000/api/doubts/doubt-1/answers", "POST", { body: "I solved it myself using this approach." }, "token"), {
        params: Promise.resolve({ id: "doubt-1" }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.answer.authorId).toBe("asker-1");
    });
  });

  describe("POST /api/doubts/[id]/accept", () => {
    it("returns 403 when user is NOT the doubt author", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("helper-user", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "original-asker-id", status: "OPEN" });

      const res = await POST_ACCEPT(
        createRequest("http://localhost:3000/api/doubts/doubt-1/accept", "POST", { answerId: "ans-1" }, "token"),
        { params: Promise.resolve({ id: "doubt-1" }) },
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe("FORBIDDEN");
    });

    it("returns 404 when target answer is not found for the doubt", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("original-asker-id", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "original-asker-id", status: "OPEN" });
      mockAnswerFindFirst.mockResolvedValue(null);

      const res = await POST_ACCEPT(
        createRequest("http://localhost:3000/api/doubts/doubt-1/accept", "POST", { answerId: "nonexistent-answer" }, "token"),
        { params: Promise.resolve({ id: "doubt-1" }) },
      );

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("ANSWER_NOT_FOUND");
    });

    it("allows doubt author to accept their own answer", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("asker-1", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "asker-1", status: "OPEN" });
      mockAnswerFindFirst.mockResolvedValue({ id: "ans-self", doubtId: "doubt-1", authorId: "asker-1" });
      mockTransaction.mockResolvedValue([
        { count: 0 },
        {
          id: "ans-self",
          doubtId: "doubt-1",
          authorId: "asker-1",
          body: "Self answer",
          isAccepted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: "asker-1", email: "asker@college.edu", profile: { fullName: "Asker", department: "CS", avatarUrl: null } },
        },
        { id: "doubt-1", status: "RESOLVED", acceptedAnswerId: "ans-self", updatedAt: new Date() },
      ]);

      const res = await POST_ACCEPT(
        createRequest("http://localhost:3000/api/doubts/doubt-1/accept", "POST", { answerId: "ans-self" }, "token"),
        { params: Promise.resolve({ id: "doubt-1" }) },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.doubt.acceptedAnswerId).toBe("ans-self");
    });

    it("allows author to change the accepted answer later", async () => {
      mockFindValidSession.mockResolvedValue(fakeSession("asker-1", "ACTIVE"));
      mockDoubtFindUnique.mockResolvedValue({ id: "doubt-1", authorId: "asker-1", status: "RESOLVED", acceptedAnswerId: "ans-1" });
      mockAnswerFindFirst.mockResolvedValue({ id: "ans-2", doubtId: "doubt-1", authorId: "helper-2" });
      mockTransaction.mockResolvedValue([
        { count: 1 },
        {
          id: "ans-2",
          doubtId: "doubt-1",
          authorId: "helper-2",
          body: "Better solution",
          isAccepted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: "helper-2", email: "helper2@college.edu", profile: { fullName: "Helper 2", department: "CS", avatarUrl: null } },
        },
        { id: "doubt-1", status: "RESOLVED", acceptedAnswerId: "ans-2", updatedAt: new Date() },
      ]);

      const res = await POST_ACCEPT(
        createRequest("http://localhost:3000/api/doubts/doubt-1/accept", "POST", { answerId: "ans-2" }, "token"),
        { params: Promise.resolve({ id: "doubt-1" }) },
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.doubt.acceptedAnswerId).toBe("ans-2");
    });
  });
});
