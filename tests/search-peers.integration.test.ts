import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-search-peers-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-search-peers-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
});

import { GET } from "@/app/api/search/peers/route";
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

describe("GET /api/search/peers (Integration - Real SQLite)", () => {
  let viewerToken: string;

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
            department: "Civil Engineering",
            helpAvailable: false,
          },
        },
      },
    });

    const session = await createSession(viewer.id);
    viewerToken = session.rawToken;
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
            department: "Computer Science",
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
            department: "Information Technology",
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
    const skillReact = await prisma.skill.create({
      data: { name: "React", slug: "react" },
    });
    const skillCpp = await prisma.skill.create({
      data: { name: "C++", slug: "c-plus-plus" },
    });

    // User A: React • Advanced (Available)
    const userReactAdv = await prisma.user.create({
      data: {
        email: "userA@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Alice React",
            department: "Computer Science",
            helpAvailable: true,
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: userReactAdv.id, skillId: skillReact.id, level: "ADVANCED" },
    });

    // User B: React • Beginner (Unavailable)
    const userReactBeg = await prisma.user.create({
      data: {
        email: "userB@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Bob React",
            department: "Computer Science",
            helpAvailable: false,
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: userReactBeg.id, skillId: skillReact.id, level: "BEGINNER" },
    });

    // User C: C++ • Mentor (Available) -> Unrelated skill
    const userCppMentor = await prisma.user.create({
      data: {
        email: "userC@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Charlie Cpp",
            department: "Computer Science",
            helpAvailable: true,
          },
        },
      },
    });
    await prisma.userSkill.create({
      data: { userId: userCppMentor.id, skillId: skillCpp.id, level: "MENTOR" },
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

  it("filters peers by department and availability", async () => {
    // CSE + Available
    await prisma.user.create({
      data: {
        email: "cse_avail@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "CSE Available",
            department: "Computer Science",
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
            department: "Computer Science",
            helpAvailable: false,
          },
        },
      },
    });

    // IT + Available
    await prisma.user.create({
      data: {
        email: "it_avail@mitsgwl.ac.in",
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "IT Available",
            department: "Information Technology",
            helpAvailable: true,
          },
        },
      },
    });

    const req = createRequest(
      "http://localhost:3000/api/search/peers?department=Computer%20Science&available=true",
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
            department: "Computer Science",
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
            department: "Computer Science",
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
