import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-auth-helper-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-auth-helper-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

import { getAuthenticatedUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, revokeSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequestWithCookie(rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  return new Request("http://localhost:3000/api/some-protected-route", {
    method: "GET",
    headers,
  });
}

describe("getAuthenticatedUser (Integration - Real SQLite)", () => {
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

  it("resolves the authentic User record from SQLite for a valid session cookie", async () => {
    const email = "helperuser@college.edu";
    const passwordHash = await hashPassword("password123");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        status: "ACTIVE",
        role: "STUDENT",
      },
    });

    const { rawToken } = await createSession(user.id);

    const authenticatedUser = await getAuthenticatedUser(
      createRequestWithCookie(rawToken),
    );

    expect(authenticatedUser).not.toBeNull();
    expect(authenticatedUser?.id).toBe(user.id);
    expect(authenticatedUser?.email).toBe(email);
  });

  it("returns null for an invalid session token", async () => {
    const result = await getAuthenticatedUser(
      createRequestWithCookie("nonexistent-token"),
    );

    expect(result).toBeNull();
  });

  it("returns null for an expired session token and auto-cleans session in SQLite", async () => {
    const user = await prisma.user.create({
      data: {
        email: "expireduser@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });

    const expiredDate = new Date(Date.now() - 60 * 1000);
    const { rawToken, session } = await createSession(user.id, expiredDate);

    const result = await getAuthenticatedUser(createRequestWithCookie(rawToken));

    expect(result).toBeNull();

    // Verify session row was deleted from SQLite
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession).toBeNull();
  });

  it("returns null for a revoked session token", async () => {
    const user = await prisma.user.create({
      data: {
        email: "revokeduser@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });

    const { rawToken } = await createSession(user.id);
    await revokeSession(rawToken);

    const result = await getAuthenticatedUser(createRequestWithCookie(rawToken));

    expect(result).toBeNull();
  });
});
