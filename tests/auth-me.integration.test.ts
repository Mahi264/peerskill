import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-me-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-me-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

import { GET } from "@/app/api/auth/me/route";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequestWithCookie(rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  return new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers,
  });
}

describe("GET /api/auth/me (Integration - Real SQLite)", () => {
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
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns authentic user from real SQLite session cookie", async () => {
    const email = "mestudent@college.edu";
    const passwordHash = await hashPassword("password123");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        status: "ACTIVE",
        collegeEmailVerified: true,
      },
    });

    const { rawToken } = await createSession(user.id);

    const response = await GET(createRequestWithCookie(rawToken));

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data.user).toMatchObject({
      id: user.id,
      email,
      collegeEmailVerified: true,
      role: "STUDENT",
      status: "ACTIVE",
      profile: null,
      userSkills: [],
    });

    expect(json.data.user).not.toHaveProperty("passwordHash");
    expect(json.data).not.toHaveProperty("tokenHash");
    expect(json.data).not.toHaveProperty("rawToken");
  });

  it("returns profile and userSkills records from SQLite when present", async () => {
    const email = "mewithprofile@college.edu";
    const passwordHash = await hashPassword("password123");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Integration Student",
            department: "Computer Science",
            bio: "Integration test bio",
          },
        },
      },
    });

    const { rawToken } = await createSession(user.id);
    const response = await GET(createRequestWithCookie(rawToken));

    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.data.user.profile).toMatchObject({
      fullName: "Integration Student",
      department: "Computer Science",
      bio: "Integration test bio",
    });
  });

  it("returns 401 UNAAUTHENTICATED for an invalid session token", async () => {
    const response = await GET(createRequestWithCookie("nonexistent-raw-token"));

    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 UNAAUTHENTICATED for an expired session", async () => {
    const user = await prisma.user.create({
      data: {
        email: "expiredstudent@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });

    // Create a session in the past (expired)
    const expiredDate = new Date(Date.now() - 60 * 1000);
    const { rawToken } = await createSession(user.id, expiredDate);

    const response = await GET(createRequestWithCookie(rawToken));

    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});
