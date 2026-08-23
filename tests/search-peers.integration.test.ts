import { execSync } from "node:child_process";
import { describe, expect, it, beforeAll, beforeEach, afterAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-search-peers-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-search-peers-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
});

import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";
import { GET } from "@/app/api/search/peers/route";

function createRequest(url: string, token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
  }
  return new Request(url, { headers });
}

describe("GET /api/search/peers (Integration Tests)", () => {
  let viewerToken: string;

  beforeAll(() => {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: "ignore",
    });
  });

  beforeEach(async () => {
    await prisma.answer.deleteMany();
    await prisma.doubtSkill.deleteMany();
    await prisma.doubt.deleteMany();
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();

    // Create viewer
    const viewer = await prisma.user.create({
      data: {
        email: "viewer@mitsgwl.ac.in",
        googleId: "google-viewer",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Viewer Student",
            branch: "Civil Engineering",
            helpAvailable: false,
          },
        },
      },
    });

    const session = await createSession(viewer.id);
    viewerToken = session.rawToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 UNAUTHENTICATED without session cookie", async () => {
    const req = createRequest("http://localhost:3000/api/search/peers?q=React");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("searches peers by student name", async () => {
    await prisma.user.create({
      data: {
        email: "rohit@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Rohit Sharma",
            branch: "Computer Science & Engineering (CSE)",
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        email: "priya@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Priya Verma",
            branch: "Information Technology (IT)",
          },
        },
      },
    });

    const req = createRequest("http://localhost:3000/api/search/peers?q=Rohit", viewerToken);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.peers).toHaveLength(1);
    expect(json.data.peers[0].fullName).toBe("Rohit Sharma");
  });

  it("enforces skill dominance rule: relevant skill matches rank above unrelated higher proficiency", async () => {
    const reactSkill = await prisma.skill.create({
      data: { name: "React", slug: "react" },
    });
    const rustSkill = await prisma.skill.create({
      data: { name: "Rust", slug: "rust" },
    });

    // User A: React Advanced + Available
    const userA = await prisma.user.create({
      data: {
        email: "alice@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Alice React",
            branch: "CSE",
            helpAvailable: true,
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: userA.id, skillId: reactSkill.id, level: "ADVANCED" },
    });

    // User B: React Intermediate + Busy
    const userB = await prisma.user.create({
      data: {
        email: "bob@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Bob React",
            branch: "CSE",
            helpAvailable: false,
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: userB.id, skillId: reactSkill.id, level: "INTERMEDIATE" },
    });

    // User C: Rust Mentor (High level, but unrelated to React query)
    const userC = await prisma.user.create({
      data: {
        email: "charlie@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Charlie Rust",
            branch: "CSE",
            helpAvailable: true,
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: userC.id, skillId: rustSkill.id, level: "MENTOR" },
    });

    // Query specifically for "React"
    const req = createRequest("http://localhost:3000/api/search/peers?q=React", viewerToken);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    const peerNames = json.data.peers.map((p: { fullName: string }) => p.fullName);

    // Alice React (Advanced + Available) should rank #1, Bob React #2
    expect(peerNames[0]).toBe("Alice React");
    expect(peerNames[1]).toBe("Bob React");
  });

  it("filters peers by availability", async () => {
    // CSE + Available
    await prisma.user.create({
      data: {
        email: "cse_avail@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "CSE Available",
            branch: "Computer Science & Engineering (CSE)",
            helpAvailable: true,
          },
        },
      },
    });

    // CSE + Busy
    await prisma.user.create({
      data: {
        email: "cse_busy@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "CSE Busy",
            branch: "Computer Science & Engineering (CSE)",
            helpAvailable: false,
          },
        },
      },
    });

    const req = createRequest(
      "http://localhost:3000/api/search/peers?q=CSE&available=true",
      viewerToken,
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.peers).toHaveLength(1);
    expect(json.data.peers[0].fullName).toBe("CSE Available");
  });

  it("filters peers by minimum proficiency level", async () => {
    const python = await prisma.skill.create({
      data: { name: "Python", slug: "python" },
    });

    const beginner = await prisma.user.create({
      data: {
        email: "py_beg@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Python Beginner",
            branch: "CSE",
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: beginner.id, skillId: python.id, level: "BEGINNER" },
    });

    const mentor = await prisma.user.create({
      data: {
        email: "py_mentor@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Python Mentor",
            branch: "CSE",
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: mentor.id, skillId: python.id, level: "MENTOR" },
    });

    const req = createRequest(
      `http://localhost:3000/api/search/peers?skillId=${python.id}&level=ADVANCED`,
      viewerToken,
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.peers).toHaveLength(1);
    expect(json.data.peers[0].fullName).toBe("Python Mentor");
  });
});
