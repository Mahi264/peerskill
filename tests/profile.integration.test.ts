import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-profile-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-profile-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

import { PATCH } from "@/app/api/profiles/me/route";
import { PUT as PUT_SKILLS } from "@/app/api/profiles/me/skills/route";

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

describe("Profile & Skills API (Integration - Real SQLite)", () => {
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
        email: "profilestudent@college.edu",
        passwordHash,
        status: "PENDING",
      },
    });

    userId = user.id;

    const sessionRes = await createSession(user.id);
    rawToken = sessionRes.rawToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists profile metadata in real SQLite via PATCH /api/profiles/me", async () => {
    const payload = {
      fullName: "Aarav Mehta",
      department: "Computer Science",
      branch: "CSE",
      graduationYear: 2027,
      section: "A",
      bio: "Aspiring Software Engineer",
    };

    const response = await PATCH(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me",
        "PATCH",
        payload,
        rawToken,
      ),
    );

    expect(response.status).toBe(200);

    // Verify directly in SQLite
    const dbProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    expect(dbProfile).not.toBeNull();
    expect(dbProfile?.fullName).toBe("Aarav Mehta");
    expect(dbProfile?.department).toBe("Computer Science");
    expect(dbProfile?.branch).toBe("CSE");
    expect(dbProfile?.graduationYear).toBe(2027);
  });

  it("persists skills and transitions status to ACTIVE when profile and 3+ skills exist", async () => {
    // 1. Create Profile
    await PATCH(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me",
        "PATCH",
        {
          fullName: "Aarav Mehta",
          department: "Computer Science",
        },
        rawToken,
      ),
    );

    // 2. Put Skills
    const skillsPayload = {
      skills: [
        { name: "React", level: "ADVANCED" },
        { name: "Node.js", level: "INTERMEDIATE" },
        { name: "Python", level: "BEGINNER" },
      ],
    };

    const response = await PUT_SKILLS(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/skills",
        "PUT",
        skillsPayload,
        rawToken,
      ),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.skills).toHaveLength(3);
    expect(json.data.user.status).toBe("ACTIVE");

    // Verify Skills and UserSkills in SQLite
    const dbUserSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    expect(dbUserSkills).toHaveLength(3);
    const skillNames = dbUserSkills.map((us) => us.skill.name);
    expect(skillNames).toContain("React");
    expect(skillNames).toContain("Node.js");
    expect(skillNames).toContain("Python");

    // Verify User status in SQLite
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser?.status).toBe("ACTIVE");
  });

  it("replaces existing skills on subsequent PUT /api/profiles/me/skills calls", async () => {
    // Initial 3 skills
    await PUT_SKILLS(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/skills",
        "PUT",
        {
          skills: [
            { name: "React", level: "ADVANCED" },
            { name: "Node.js", level: "INTERMEDIATE" },
            { name: "Python", level: "BEGINNER" },
          ],
        },
        rawToken,
      ),
    );

    // Replace with 3 new skills
    const response = await PUT_SKILLS(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/skills",
        "PUT",
        {
          skills: [
            { name: "Rust", level: "MENTOR" },
            { name: "Go", level: "ADVANCED" },
            { name: "Docker", level: "INTERMEDIATE" },
          ],
        },
        rawToken,
      ),
    );

    expect(response.status).toBe(200);

    const dbUserSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    expect(dbUserSkills).toHaveLength(3);
    const skillNames = dbUserSkills.map((us) => us.skill.name);
    expect(skillNames).toContain("Rust");
    expect(skillNames).toContain("Go");
    expect(skillNames).not.toContain("React");
  });

  it("persists 3 existing skills + 1 custom skill (C) as 4 distinct skills without overwriting C++", async () => {
    // 1. Create Profile
    await PATCH(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me",
        "PATCH",
        { fullName: "Aarav Mehta", department: "Computer Science" },
        rawToken,
      ),
    );

    // 2. Add 3 initial skills including C++
    await PUT_SKILLS(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/skills",
        "PUT",
        {
          skills: [
            { name: "C++", level: "ADVANCED" },
            { name: "Python", level: "INTERMEDIATE" },
            { name: "JavaScript", level: "BEGINNER" },
          ],
        },
        rawToken,
      ),
    );

    // 3. Add custom skill "C" with level "BEGINNER", keeping the 3 existing skills
    const putResponse = await PUT_SKILLS(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/skills",
        "PUT",
        {
          skills: [
            { name: "C++", level: "ADVANCED" },
            { name: "Python", level: "INTERMEDIATE" },
            { name: "JavaScript", level: "BEGINNER" },
            { name: "C", level: "BEGINNER" },
          ],
        },
        rawToken,
      ),
    );

    expect(putResponse.status).toBe(200);
    const putJson = await putResponse.json();
    expect(putJson.data.skills).toHaveLength(4);

    // 4. Verify directly in SQLite database
    const dbUserSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    expect(dbUserSkills).toHaveLength(4);
    const skillNames = dbUserSkills.map((us) => us.skill.name);
    expect(skillNames).toContain("C++");
    expect(skillNames).toContain("C");
    expect(skillNames).toContain("Python");
    expect(skillNames).toContain("JavaScript");

    // Verify proficiency for custom skill C
    const cSkill = dbUserSkills.find((us) => us.skill.name === "C");
    expect(cSkill?.level).toBe("BEGINNER");
  });

  it("rejects unauthenticated requests and does not modify database", async () => {
    const response = await PATCH(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me",
        "PATCH",
        {
          fullName: "Attacker Name",
          department: "Hacking",
        },
        "invalid-token",
      ),
    );

    expect(response.status).toBe(401);

    const count = await prisma.profile.count({ where: { userId } });
    expect(count).toBe(0);
  });

  it("rejects SUSPENDED user with HTTP 403 and never activates suspended status in SQLite", async () => {
    const suspendedUser = await prisma.user.create({
      data: {
        email: "suspendedstudent@college.edu",
        passwordHash: "hash",
        status: "SUSPENDED",
      },
    });

    const suspendedSession = await createSession(suspendedUser.id);

    // Try PATCH profile
    const patchResponse = await PATCH(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me",
        "PATCH",
        { fullName: "Suspended User", department: "Computer Science" },
        suspendedSession.rawToken,
      ),
    );

    expect(patchResponse.status).toBe(403);
    const patchJson = await patchResponse.json();
    expect(patchJson.error.code).toBe("ACCOUNT_SUSPENDED");

    // Try PUT skills
    const putSkillsResponse = await PUT_SKILLS(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me/skills",
        "PUT",
        {
          skills: [
            { name: "React", level: "ADVANCED" },
            { name: "Node.js", level: "INTERMEDIATE" },
            { name: "Python", level: "BEGINNER" },
          ],
        },
        suspendedSession.rawToken,
      ),
    );

    expect(putSkillsResponse.status).toBe(403);
    const putJson = await putSkillsResponse.json();
    expect(putJson.error.code).toBe("ACCOUNT_SUSPENDED");

    // Verify user in SQLite remains SUSPENDED
    const dbUser = await prisma.user.findUnique({
      where: { id: suspendedUser.id },
    });
    expect(dbUser?.status).toBe("SUSPENDED");
  });

  it("preserves Google-verified fullName when client sends profile update", async () => {
    // Set initial Google-verified profile
    await prisma.profile.create({
      data: {
        userId,
        fullName: "Verified Google Name",
        department: "",
      },
    });

    const patchResponse = await PATCH(
      createRequestWithCookie(
        "http://localhost:3000/api/profiles/me",
        "PATCH",
        {
          fullName: "Attacker Malicious Name",
          department: "Electrical Engineering",
          branch: "EE",
        },
        rawToken,
      ),
    );

    expect(patchResponse.status).toBe(200);

    const dbProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    // Verified Google Name MUST NOT be overridden by client
    expect(dbProfile?.fullName).toBe("Verified Google Name");
    expect(dbProfile?.department).toBe("Electrical Engineering");
    expect(dbProfile?.branch).toBe("EE");
  });
});

