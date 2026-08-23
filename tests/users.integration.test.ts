import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-users-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-users-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
});

import { GET } from "@/app/api/users/[id]/route";
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

describe("GET /api/users/[id] (Integration - Real SQLite)", () => {
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
          },
        },
      },
    });

    const session = await createSession(viewer.id);
    viewerToken = session.rawToken;
  });

  it("returns 401 UNAUTHENTICATED without session cookie", async () => {
    const req = createRequest("http://localhost:3000/api/users/any-id");
    const res = await GET(req, { params: Promise.resolve({ id: "any-id" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 USER_NOT_FOUND if user does not exist", async () => {
    const req = createRequest("http://localhost:3000/api/users/non-existent", viewerToken);
    const res = await GET(req, { params: Promise.resolve({ id: "non-existent" }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("USER_NOT_FOUND");
  });

  it("returns 404 USER_NOT_FOUND if target user is PENDING", async () => {
    const pendingUser = await prisma.user.create({
      data: {
        email: "pending@mitsgwl.ac.in",
        status: "PENDING",
      },
    });

    const req = createRequest(`http://localhost:3000/api/users/${pendingUser.id}`, viewerToken);
    const res = await GET(req, { params: Promise.resolve({ id: pendingUser.id }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 and sanitized campus peer profile with skills and activity counts", async () => {
    const targetUser = await prisma.user.create({
      data: {
        email: "mohit@mitsgwl.ac.in",
        status: "ACTIVE",
        googleId: "google-mohit",
        profile: {
          create: {
            fullName: "Mohit Sharma",
            branch: "CSE",
            graduationYear: 2028,
            section: "A",
            bio: "Passionate about Next.js and systems programming.",
            helpAvailable: true,
            helpStatus: "Free after 5 PM",
          },
        },
      },
    });

    const skillCpp = await prisma.skill.create({
      data: { name: "C++", slug: "c-plus-plus" },
    });
    const skillReact = await prisma.skill.create({
      data: { name: "React", slug: "react" },
    });

    await prisma.userSkill.create({
      data: { userId: targetUser.id, skillId: skillCpp.id, level: "ADVANCED" },
    });
    await prisma.userSkill.create({
      data: { userId: targetUser.id, skillId: skillReact.id, level: "INTERMEDIATE" },
    });

    // Create 2 doubts asked by targetUser
    await prisma.doubt.create({
      data: {
        authorId: targetUser.id,
        title: "Doubt 1",
        body: "Doubt body 1",
      },
    });
    await prisma.doubt.create({
      data: {
        authorId: targetUser.id,
        title: "Doubt 2",
        body: "Doubt body 2",
      },
    });

    // Create 1 doubt and 1 answer submitted by targetUser
    const otherDoubt = await prisma.doubt.create({
      data: {
        authorId: targetUser.id,
        title: "Other Doubt",
        body: "Other Doubt body",
      },
    });
    await prisma.answer.create({
      data: {
        doubtId: otherDoubt.id,
        authorId: targetUser.id,
        body: "Answer from target user",
      },
    });

    const req = createRequest(`http://localhost:3000/api/users/${targetUser.id}`, viewerToken);
    const res = await GET(req, { params: Promise.resolve({ id: targetUser.id }) });

    expect(res.status).toBe(200);
    const json = await res.json();

    const u = json.data.user;
    expect(u.id).toBe(targetUser.id);
    expect(u.status).toBe("ACTIVE");

    // Profile data verification
    expect(u.profile.fullName).toBe("Mohit Sharma");
    expect(u.profile).not.toHaveProperty("department");
    expect(u.profile.branch).toBe("CSE");
    expect(u.profile.graduationYear).toBe(2028);
    expect(u.profile.bio).toBe("Passionate about Next.js and systems programming.");
    expect(u.profile.helpAvailable).toBe(true);
    expect(u.profile.helpStatus).toBe("Free after 5 PM");

    expect(u.profile.section).toBe("A");
    expect(u.email).toBeUndefined();
    expect(u.profile.email).toBeUndefined();
    expect(u.googleId).toBeUndefined();
    expect(u.passwordHash).toBeUndefined();

    // Skills verification
    expect(u.skills).toHaveLength(2);
    expect(u.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "C++", slug: "c-plus-plus", level: "ADVANCED" }),
        expect.objectContaining({ name: "React", slug: "react", level: "INTERMEDIATE" }),
      ]),
    );

    // Neutral stats verification (doubtsCount = 3, answersCount = 1)
    expect(u.stats.doubtsCount).toBe(3);
    expect(u.stats.answersCount).toBe(1);
    expect(u.stats.acceptedAnswersCount).toBeUndefined();
  });
});
