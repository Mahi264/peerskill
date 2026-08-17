import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-login-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-login-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});


import { POST } from "@/app/api/auth/login/route";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login (Integration - Real SQLite)", () => {
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

  it("authenticates an active user against SQLite and creates a hashed session row & HTTP-only cookie", async () => {
    const email = "activeuser@college.edu";
    const password = "mysecretpassword123";

    const realPasswordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: realPasswordHash,
        status: "ACTIVE",
        collegeEmailVerified: false,
      },
    });

    const response = await POST(createRequest({ email, password }));

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data.user).toMatchObject({
      id: user.id,
      email,
      collegeEmailVerified: false,
      status: "ACTIVE",
      role: "STUDENT",
    });

    // 1. Verify Set-Cookie header content and attributes
    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookieHeader?.toLowerCase()).toContain("httponly");
    expect(cookieHeader?.toLowerCase()).toContain("path=/");
    expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");
    expect(cookieHeader).toContain("Max-Age=1209600"); // 14 days in seconds


    // Extract raw token from cookie header
    const match = cookieHeader?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    expect(match).toBeTruthy();
    const rawToken = match?.[1];
    expect(rawToken).toBeTruthy();

    // 2. Verify Session row exists in SQLite and token is hashed
    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
    });

    expect(sessions).toHaveLength(1);

    const dbSession = sessions[0];
    const expectedTokenHash = hashSessionToken(rawToken!);

    expect(dbSession.tokenHash).toBe(expectedTokenHash);
    expect(dbSession.tokenHash).not.toBe(rawToken);
  });

  it("rejects invalid password for existing ACTIVE user and creates no session in SQLite", async () => {
    const email = "activeuser2@college.edu";
    const password = "correctpassword123";
    const realPasswordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: realPasswordHash,
        status: "ACTIVE",
      },
    });

    const response = await POST(
      createRequest({ email, password: "wrongpassword123" }),
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_CREDENTIALS");

    // Verify set-cookie header is NOT present
    expect(response.headers.get("set-cookie")).toBeNull();

    // Verify 0 session records in SQLite
    const count = await prisma.session.count({ where: { userId: user.id } });
    expect(count).toBe(0);
  });

  it("rejects valid password for PENDING user with 403 and creates no session in SQLite", async () => {
    const email = "pendinguser@college.edu";
    const password = "correctpassword123";
    const realPasswordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: realPasswordHash,
        status: "PENDING",
      },
    });

    const response = await POST(createRequest({ email, password }));

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_NOT_ACTIVE");

    expect(response.headers.get("set-cookie")).toBeNull();

    const count = await prisma.session.count({ where: { userId: user.id } });
    expect(count).toBe(0);
  });
});
