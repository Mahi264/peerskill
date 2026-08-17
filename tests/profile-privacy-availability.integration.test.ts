import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-privacy-availability-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-privacy-availability-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

import { PATCH as PATCH_PRIVACY } from "@/app/api/profiles/me/privacy/route";
import { PATCH as PATCH_AVAILABILITY } from "@/app/api/profiles/me/availability/route";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequestWithCookie(
  url: string,
  method: string,
  body: unknown,
  rawToken?: string,
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  return new Request(url, {
    method,
    headers,
    body: JSON.stringify(body),
  });
}

describe("Privacy & Availability API (Integration - Real SQLite)", () => {
  let userId: string;
  let rawToken: string;

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
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: {
        email: "privacyuser@college.edu",
        passwordHash,
        status: "ACTIVE",
      },
    });

    userId = user.id;

    await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: "Aarav Mehta",
        department: "Computer Science",
        helpAvailable: true,
        helpStatus: "Free after 4pm",
        contactVisibility: "CONNECTIONS",
        chatRequestVisibility: "CONNECTIONS",
      },
    });

    const sessionRes = await createSession(user.id);
    rawToken = sessionRes.rawToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ----- Privacy Integration Tests -----

  it("updates contactVisibility in real SQLite and preserves chatRequestVisibility", async () => {
    const response = await PATCH_PRIVACY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/privacy",
        "PATCH",
        { contactVisibility: "COLLEGE" },
        rawToken,
      ),
    );

    expect(response.status).toBe(200);

    const dbProfile = await prisma.profile.findUnique({ where: { userId } });
    expect(dbProfile?.contactVisibility).toBe("COLLEGE");
    expect(dbProfile?.chatRequestVisibility).toBe("CONNECTIONS");
  });

  it("updates chatRequestVisibility in real SQLite and preserves contactVisibility", async () => {
    const response = await PATCH_PRIVACY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/privacy",
        "PATCH",
        { chatRequestVisibility: "NOBODY" },
        rawToken,
      ),
    );

    expect(response.status).toBe(200);

    const dbProfile = await prisma.profile.findUnique({ where: { userId } });
    expect(dbProfile?.chatRequestVisibility).toBe("NOBODY");
    expect(dbProfile?.contactVisibility).toBe("CONNECTIONS");
  });

  // ----- Availability Integration Tests -----

  it("updates helpAvailable in real SQLite and preserves helpStatus", async () => {
    const response = await PATCH_AVAILABILITY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/availability",
        "PATCH",
        { helpAvailable: false },
        rawToken,
      ),
    );

    expect(response.status).toBe(200);

    const dbProfile = await prisma.profile.findUnique({ where: { userId } });
    expect(dbProfile?.helpAvailable).toBe(false);
    expect(dbProfile?.helpStatus).toBe("Free after 4pm");
  });

  it("updates helpStatus in real SQLite and clears helpStatus when null is passed", async () => {
    // 1. Update helpStatus text
    const response1 = await PATCH_AVAILABILITY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/availability",
        "PATCH",
        { helpStatus: "Available on weekends" },
        rawToken,
      ),
    );

    expect(response1.status).toBe(200);

    let dbProfile = await prisma.profile.findUnique({ where: { userId } });
    expect(dbProfile?.helpStatus).toBe("Available on weekends");

    // 2. Set helpStatus to null to clear
    const response2 = await PATCH_AVAILABILITY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/availability",
        "PATCH",
        { helpStatus: null },
        rawToken,
      ),
    );

    expect(response2.status).toBe(200);

    dbProfile = await prisma.profile.findUnique({ where: { userId } });
    expect(dbProfile?.helpStatus).toBeNull();
  });

  // ----- Security Integration Tests -----

  it("rejects SUSPENDED user with HTTP 403 and does not modify SQLite", async () => {
    const suspendedUser = await prisma.user.create({
      data: {
        email: "suspended@college.edu",
        passwordHash: "hash",
        status: "SUSPENDED",
      },
    });

    await prisma.profile.create({
      data: {
        userId: suspendedUser.id,
        fullName: "Suspended User",
        department: "CS",
        contactVisibility: "CONNECTIONS",
      },
    });

    const suspendedSession = await createSession(suspendedUser.id);

    const response = await PATCH_PRIVACY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/privacy",
        "PATCH",
        { contactVisibility: "COLLEGE" },
        suspendedSession.rawToken,
      ),
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("ACCOUNT_SUSPENDED");

    const dbProfile = await prisma.profile.findUnique({
      where: { userId: suspendedUser.id },
    });
    expect(dbProfile?.contactVisibility).toBe("CONNECTIONS");
  });

  it("ignores client-supplied userId attempting to modify another user's profile", async () => {
    const victimUser = await prisma.user.create({
      data: {
        email: "victim@college.edu",
        passwordHash: "hash",
        status: "ACTIVE",
      },
    });

    await prisma.profile.create({
      data: {
        userId: victimUser.id,
        fullName: "Victim User",
        department: "CS",
        contactVisibility: "CONNECTIONS",
      },
    });

    // Attacker sends request with victim's userId in payload, but attacker's rawToken
    const response = await PATCH_PRIVACY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/privacy",
        "PATCH",
        { contactVisibility: "NOBODY", userId: victimUser.id },
        rawToken,
      ),
    );

    expect(response.status).toBe(200);

    // Victim profile remains untouched
    const victimProfile = await prisma.profile.findUnique({
      where: { userId: victimUser.id },
    });
    expect(victimProfile?.contactVisibility).toBe("CONNECTIONS");

    // Attacker profile was updated instead
    const attackerProfile = await prisma.profile.findUnique({
      where: { userId },
    });
    expect(attackerProfile?.contactVisibility).toBe("NOBODY");
  });

  it("does not alter User.status or create/delete sessions", async () => {
    const sessionCountBefore = await prisma.session.count();
    const userBefore = await prisma.user.findUnique({ where: { id: userId } });

    await PATCH_AVAILABILITY(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/availability",
        "PATCH",
        { helpAvailable: false },
        rawToken,
      ),
    );

    const sessionCountAfter = await prisma.session.count();
    const userAfter = await prisma.user.findUnique({ where: { id: userId } });

    expect(sessionCountAfter).toBe(sessionCountBefore);
    expect(userAfter?.status).toBe(userBefore?.status);
  });
});
