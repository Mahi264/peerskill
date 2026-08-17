import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-logout-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-logout-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

import { POST } from "@/app/api/auth/logout/route";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequestWithCookie(rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  return new Request("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers,
  });
}

describe("POST /api/auth/logout (Integration - Real SQLite)", () => {
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

  it("revokes real session in SQLite and sends cookie clearing header", async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: {
        email: "logoutstudent@college.edu",
        passwordHash,
        status: "ACTIVE",
      },
    });

    const { rawToken, session } = await createSession(user.id);

    // Verify session row exists before logout
    const existingSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(existingSession).not.toBeNull();

    // Perform logout
    const response = await POST(createRequestWithCookie(rawToken));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ data: { success: true } });

    // Verify cookie clearance header
    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookieHeader?.toLowerCase()).toContain("httponly");
    expect(cookieHeader?.toLowerCase()).toContain("path=/");
    expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");
    expect(cookieHeader).toContain("Max-Age=0");

    // Verify session row was deleted from SQLite
    const deletedSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(deletedSession).toBeNull();
  });

  it("is idempotent: calling logout a second time returns 200", async () => {
    const user = await prisma.user.create({
      data: {
        email: "idempotentstudent@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });

    const { rawToken } = await createSession(user.id);

    const firstResponse = await POST(createRequestWithCookie(rawToken));
    expect(firstResponse.status).toBe(200);

    // Second call with same token
    const secondResponse = await POST(createRequestWithCookie(rawToken));
    expect(secondResponse.status).toBe(200);
    const secondJson = await secondResponse.json();
    expect(secondJson).toEqual({ data: { success: true } });
  });

  it("handles invalid token without creating or modifying SQLite sessions", async () => {
    const initialSessionCount = await prisma.session.count();

    const response = await POST(createRequestWithCookie("invalid-raw-token"));

    expect(response.status).toBe(200);

    const finalSessionCount = await prisma.session.count();
    expect(finalSessionCount).toBe(initialSessionCount);
  });
});
