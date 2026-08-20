import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-doubts-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-doubts-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

import { GET, POST } from "@/app/api/doubts/route";
import { DELETE, GET as GET_DETAIL } from "@/app/api/doubts/[id]/route";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

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

describe("Doubts API (Integration - Real SQLite)", () => {
  beforeAll(() => {
    execSync("npx prisma db push --skip-generate", {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: "ignore",
    });
  });

  beforeEach(async () => {
    await prisma.doubtSkill.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.doubt.deleteMany();
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a doubt in real SQLite and queries it back via GET /api/doubts", async () => {
    const email = "asker@college.edu";
    const passwordHash = await hashPassword("password123");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Aarav Asker",
            department: "Computer Science",
          },
        },
      },
    });

    const { rawToken } = await createSession(user.id);

    // Create doubt via POST /api/doubts
    const createRes = await POST(
      createRequest(
        "http://localhost:3000/api/doubts",
        "POST",
        {
          title: "How to handle memory leaks in C++ smart pointers?",
          body: "I am using std::shared_ptr and std::weak_ptr but getting circular references.",
          urgency: "PROJECT_BLOCKED",
          skills: ["C++", "Memory Management"],
        },
        rawToken,
      ),
    );

    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    const doubtId = createJson.data.doubt.id;

    expect(createJson.data.doubt).toMatchObject({
      title: "How to handle memory leaks in C++ smart pointers?",
      urgency: "PROJECT_BLOCKED",
      status: "OPEN",
    });
    expect(createJson.data.doubt.skills.length).toBe(2);

    // Fetch list via GET /api/doubts
    const listRes = await GET(createRequest("http://localhost:3000/api/doubts?status=OPEN"));
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();

    expect(listJson.data.doubts.length).toBe(1);
    expect(listJson.data.doubts[0].id).toBe(doubtId);

    // Fetch detail via GET /api/doubts/[id]
    const detailRes = await GET_DETAIL(createRequest(`http://localhost:3000/api/doubts/${doubtId}`), {
      params: Promise.resolve({ id: doubtId }),
    });
    expect(detailRes.status).toBe(200);
    const detailJson = await detailRes.json();

    expect(detailJson.data.doubt.id).toBe(doubtId);
    expect(detailJson.data.doubt.author.fullName).toBe("Aarav Asker");
  });

  it("filters doubts by skill tag in real SQLite", async () => {
    const user = await prisma.user.create({
      data: {
        email: "filteruser@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    const { rawToken } = await createSession(user.id);

    await POST(
      createRequest(
        "http://localhost:3000/api/doubts",
        "POST",
        {
          title: "Python List Comprehensions Question",
          body: "How do I filter nested lists using Python list comprehension?",
          urgency: "CURIOUS",
          skills: ["Python"],
        },
        rawToken,
      ),
    );

    await POST(
      createRequest(
        "http://localhost:3000/api/doubts",
        "POST",
        {
          title: "React useEffect Infinite Loop Issue",
          body: "My useEffect dependency array keeps triggering continuous re-renders.",
          urgency: "ASSIGNMENT_STUCK",
          skills: ["React"],
        },
        rawToken,
      ),
    );

    const pyRes = await GET(createRequest("http://localhost:3000/api/doubts?skill=python"));
    const pyJson = await pyRes.json();
    expect(pyJson.data.doubts.length).toBe(1);
    expect(pyJson.data.doubts[0].title).toContain("Python List");

    const reactRes = await GET(createRequest("http://localhost:3000/api/doubts?skill=react"));
    const reactJson = await reactRes.json();
    expect(reactJson.data.doubts.length).toBe(1);
    expect(reactJson.data.doubts[0].title).toContain("React useEffect");
  });

  it("deletes an open doubt with zero answers in real SQLite and cleans up DoubtSkill rows", async () => {
    const user = await prisma.user.create({
      data: {
        email: "deleteuser@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    const { rawToken } = await createSession(user.id);

    const createRes = await POST(
      createRequest(
        "http://localhost:3000/api/doubts",
        "POST",
        {
          title: "Temporary Doubt to Delete",
          body: "This is a temporary doubt that will be deleted by the author.",
          urgency: "CURIOUS",
          skills: ["Testing"],
        },
        rawToken,
      ),
    );
    const createJson = await createRes.json();
    const doubtId = createJson.data.doubt.id;

    const skillCountBefore = await prisma.doubtSkill.count({ where: { doubtId } });
    expect(skillCountBefore).toBe(1);

    const deleteRes = await DELETE(createRequest(`http://localhost:3000/api/doubts/${doubtId}`, "DELETE", undefined, rawToken), {
      params: Promise.resolve({ id: doubtId }),
    });

    expect(deleteRes.status).toBe(200);

    const doubtInDb = await prisma.doubt.findUnique({ where: { id: doubtId } });
    expect(doubtInDb).toBeNull();

    const skillCountAfter = await prisma.doubtSkill.count({ where: { doubtId } });
    expect(skillCountAfter).toBe(0);
  });

  it("persists both existing skill (C++) and custom skill (C) on doubt creation", async () => {
    const user = await prisma.user.create({
      data: {
        email: "customskilluser@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });
    const { rawToken } = await createSession(user.id);

    const postRes = await POST(
      createRequest(
        "http://localhost:3000/api/doubts",
        "POST",
        {
          title: "Pointers in C vs References in C++",
          body: "What are the exact memory management differences between C and C++?",
          urgency: "ASSIGNMENT_STUCK",
          skills: ["C++", "C"],
        },
        rawToken,
      ),
    );

    expect(postRes.status).toBe(201);
    const json = await postRes.json();
    const doubt = json.data.doubt;

    expect(doubt.skills).toHaveLength(2);
    const skillNames = doubt.skills.map((s: { name: string }) => s.name);
    expect(skillNames).toContain("C++");
    expect(skillNames).toContain("C");

    // Verify detail fetch GET /api/doubts/[id]
    const getRes = await GET_DETAIL(
      createRequest(`http://localhost:3000/api/doubts/${doubt.id}`),
      { params: Promise.resolve({ id: doubt.id }) },
    );

    const getJson = await getRes.json();
    const fetchedSkills = getJson.data.doubt.skills.map((s: { name: string }) => s.name);
    expect(fetchedSkills).toContain("C++");
    expect(fetchedSkills).toContain("C");
  });
});
