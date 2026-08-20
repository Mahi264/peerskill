import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-search-knowledge-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-search-knowledge-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
});

import { GET } from "@/app/api/search/knowledge/route";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(url: string, rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }

  return new Request(url, {
    method: "GET",
    headers,
  });
}

describe("GET /api/search/knowledge (Integration - Real SQLite)", () => {
  let authToken: string;

  beforeAll(() => {
    execSync("npx prisma db push --skip-generate", {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: "ignore",
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.attachment.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.doubtSkill.deleteMany();
    await prisma.doubt.deleteMany();
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and session
    const user = await prisma.user.create({
      data: {
        email: "searchtest@mitsgwl.ac.in",
        googleId: "google-search-user",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Aarav Sharma",
            department: "Computer Science",
          },
        },
      },
    });

    const session = await createSession(user.id);
    authToken = session.rawToken;
  });

  it("returns 401 UNAUTHENTICATED when no session cookie is provided", async () => {
    const req = createRequest("http://localhost:3000/api/search/knowledge?q=React");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("searches doubts by title, body, skill name, and accepted answer", async () => {
    const author = await prisma.user.create({
      data: {
        email: "author@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Priya Verma",
            department: "Information Technology",
          },
        },
      },
    });

    const reactSkill = await prisma.skill.create({
      data: { name: "React", slug: "react" },
    });

    const doubt1 = await prisma.doubt.create({
      data: {
        authorId: author.id,
        title: "How to fix React useEffect re-render?",
        body: "Component keeps fetching data infinitely.",
        urgency: "ASSIGNMENT_STUCK",
        status: "OPEN",
        skills: {
          create: [{ skillId: reactSkill.id }],
        },
      },
    });

    const doubt2 = await prisma.doubt.create({
      data: {
        authorId: author.id,
        title: "Python Data Science Lab 2 Error",
        body: "Pandas dataframe indexing failed.",
        urgency: "EXAM_PREP",
        status: "RESOLVED",
        answers: {
          create: [
            {
              authorId: author.id,
              body: "Use .iloc[] instead of direct bracket access.",
              isAccepted: true,
            },
          ],
        },
      },
    });

    // Search by title keyword "React"
    const req1 = createRequest("http://localhost:3000/api/search/knowledge?q=React", authToken);
    const res1 = await GET(req1);
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.data.doubts.length).toBe(1);
    expect(json1.data.doubts[0].id).toBe(doubt1.id);

    // Search by accepted answer text ".iloc"
    const req2 = createRequest("http://localhost:3000/api/search/knowledge?q=iloc", authToken);
    const res2 = await GET(req2);
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.data.doubts.length).toBe(1);
    expect(json2.data.doubts[0].id).toBe(doubt2.id);
    expect(json2.data.doubts[0].acceptedAnswer.body).toContain(".iloc[]");
  });

  it("filters search results by status (RESOLVED vs OPEN)", async () => {
    const author = await prisma.user.create({
      data: {
        email: "author2@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: { fullName: "Rahul Gupta", department: "ECE" },
        },
      },
    });

    await prisma.doubt.create({
      data: {
        authorId: author.id,
        title: "DBMS Join Query Problem",
        body: "Inner join returns zero rows.",
        status: "OPEN",
      },
    });

    const resolvedDoubt = await prisma.doubt.create({
      data: {
        authorId: author.id,
        title: "DBMS Indexing Speedup",
        body: "B-Tree index resolved slow lookup.",
        status: "RESOLVED",
        answers: {
          create: [{ authorId: author.id, body: "Add index on foreign key.", isAccepted: true }],
        },
      },
    });

    const req = createRequest("http://localhost:3000/api/search/knowledge?q=DBMS&status=RESOLVED", authToken);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.doubts.length).toBe(1);
    expect(json.data.doubts[0].id).toBe(resolvedDoubt.id);
  });

  it("ranks RESOLVED doubts with accepted answers higher than OPEN doubts", async () => {
    const author = await prisma.user.create({
      data: {
        email: "author3@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: { create: { fullName: "Karan Patel", department: "ME" } },
      },
    });

    const openDoubt = await prisma.doubt.create({
      data: {
        authorId: author.id,
        title: "CAD SolidWorks Assembly Issue",
        body: "Parts are not aligning properly.",
        status: "OPEN",
        createdAt: new Date("2026-08-19T12:00:00Z"),
      },
    });

    const resolvedDoubt = await prisma.doubt.create({
      data: {
        authorId: author.id,
        title: "CAD SolidWorks Mate Constraints",
        body: "Fixed mate alignment issue.",
        status: "RESOLVED",
        createdAt: new Date("2026-08-19T10:00:00Z"), // Older timestamp, but RESOLVED
        answers: {
          create: [{ authorId: author.id, body: "Use concentric mate first.", isAccepted: true }],
        },
      },
    });

    const req = createRequest("http://localhost:3000/api/search/knowledge?q=SolidWorks", authToken);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.doubts.length).toBe(2);
    // RESOLVED doubt should be ranked first due to resolution bonus
    expect(json.data.doubts[0].id).toBe(resolvedDoubt.id);
    expect(json.data.doubts[1].id).toBe(openDoubt.id);
  });

  it("returns empty result array when query matches no doubts", async () => {
    const req = createRequest("http://localhost:3000/api/search/knowledge?q=NonExistentTermXYZ", authToken);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.doubts).toEqual([]);
    expect(json.data.pagination.total).toBe(0);
  });
});
