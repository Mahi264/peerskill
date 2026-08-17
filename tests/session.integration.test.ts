import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only so Next.js server-only import doesn't fail in Vitest
vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-session-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-session-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});


import { prisma } from "@/lib/prisma";
import {
  createSession,
  findValidSession,
  hashSessionToken,
  revokeAllUserSessions,
  revokeSession,
} from "@/lib/session";

describe("Session Management (Integration - Real SQLite)", () => {
  let testUserId: string;

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

    const user = await prisma.user.create({
      data: {
        email: "sessionstudent@college.edu",
        passwordHash: "$argon2id$hash",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a database session and stores tokenHash, never rawToken", async () => {
    const { rawToken, session } = await createSession(testUserId);

    expect(rawToken).toBeTruthy();
    expect(session.userId).toBe(testUserId);
    expect(session.tokenHash).toBe(hashSessionToken(rawToken));
    expect(session.tokenHash).not.toBe(rawToken);

    // Verify row directly in SQLite
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });

    expect(dbSession).not.toBeNull();
    expect(dbSession?.tokenHash).toBe(hashSessionToken(rawToken));
    expect(dbSession?.tokenHash).not.toBe(rawToken);
  });

  it("finds a valid non-expired session using the raw token", async () => {
    const { rawToken } = await createSession(testUserId);

    const validSession = await findValidSession(rawToken);

    expect(validSession).not.toBeNull();
    expect(validSession?.userId).toBe(testUserId);
    expect(validSession?.user.email).toBe("sessionstudent@college.edu");
  });

  it("rejects and auto-cleans expired sessions", async () => {
    // Create an already-expired session
    const pastExpiration = new Date(Date.now() - 1000); // 1 sec in past
    const { rawToken, session } = await createSession(testUserId, pastExpiration);

    const validSession = await findValidSession(rawToken);

    expect(validSession).toBeNull();

    // Verify expired session was deleted from SQLite
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession).toBeNull();
  });

  it("revokes a session by raw token", async () => {
    const { rawToken, session } = await createSession(testUserId);

    await revokeSession(rawToken);

    const validSession = await findValidSession(rawToken);
    expect(validSession).toBeNull();

    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession).toBeNull();
  });

  it("revokes all sessions for a user", async () => {
    const { rawToken: token1 } = await createSession(testUserId);
    const { rawToken: token2 } = await createSession(testUserId);

    await revokeAllUserSessions(testUserId);

    expect(await findValidSession(token1)).toBeNull();
    expect(await findValidSession(token2)).toBeNull();

    const count = await prisma.session.count({ where: { userId: testUserId } });
    expect(count).toBe(0);
  });

  it("cascades session deletion when the parent User is deleted", async () => {
    const { session } = await createSession(testUserId);

    // Delete parent user
    await prisma.user.delete({ where: { id: testUserId } });

    // Verify session was cascade deleted in SQLite
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession).toBeNull();
  });
});
