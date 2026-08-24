import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-admin-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-admin-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
  process.env.PEERSKILL_INITIAL_ADMIN_EMAIL = "initial.admin@gmail.com";
});

import { GET as GET_OWNERSHIP } from "@/app/api/admin/ownership/route";
import { POST as POST_TRANSFER_OWNERSHIP } from "@/app/api/admin/ownership/transfer/route";
import { GET as GET_OVERVIEW } from "@/app/api/admin/overview/route";
import { GET as GET_SETTINGS, PATCH as PATCH_SETTINGS } from "@/app/api/admin/settings/route";
import { PATCH as PATCH_SKILL } from "@/app/api/admin/skills/[id]/route";
import { GET as GET_SKILLS, POST as POST_SKILL } from "@/app/api/admin/skills/route";
import { GET as GET_STUDENTS } from "@/app/api/admin/students/route";
import { GET as GET_AUTH_ME } from "@/app/api/auth/me/route";
import { checkAndBootstrapInitialAdmin, createAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(
  url: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Request {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Cookie", `${SESSION_COOKIE_NAME}=${token}`);
  }

  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Admin & Platform Ownership API (Integration - Real SQLite)", () => {
  let studentUserId: string;
  let studentToken: string;
  let adminAccountId: string;
  let adminToken: string;

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
    await prisma.adminAuditLog.deleteMany();
    await prisma.adminSession.deleteMany();
    await prisma.adminAccount.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.connection.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.doubtSkill.deleteMany();
    await prisma.doubt.deleteMany();
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.appMetadata.deleteMany();

    // Create a student account
    const student = await prisma.user.create({
      data: {
        email: "alice@mitsgwl.ac.in",
        googleId: "google-alice-123",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Alice Sharma",
            branch: "Computer Science & Engineering (CSE)",
            section: "A",
            graduationYear: 2028,
            helpAvailable: true,
          },
        },
      },
    });
    studentUserId = student.id;
    const studentSession = await createSession(student.id);
    studentToken = studentSession.rawToken;

    // Bootstrap initial administrator
    const admin = await checkAndBootstrapInitialAdmin(
      "initial.admin@gmail.com",
      "google-admin-1",
      "Lead Administrator",
    );
    if (!admin) throw new Error("Failed to bootstrap admin in test setup.");
    adminAccountId = admin.id;

    const adminSession = await createAdminSession(admin.id);
    adminToken = adminSession.rawToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("identifies STUDENT vs ADMIN principals via GET /api/auth/me", async () => {
    // 1. Check Student
    const studentReq = createRequest("http://localhost:3000/api/auth/me", "GET", undefined, studentToken);
    const studentRes = await GET_AUTH_ME(studentReq);
    expect(studentRes.status).toBe(200);
    const studentJson = await studentRes.json();
    expect(studentJson.data.principalType).toBe("STUDENT");
    expect(studentJson.data.user.email).toBe("alice@mitsgwl.ac.in");

    // 2. Check Admin
    const adminReq = createRequest("http://localhost:3000/api/auth/me", "GET", undefined, adminToken);
    const adminRes = await GET_AUTH_ME(adminReq);
    expect(adminRes.status).toBe(200);
    const adminJson = await adminRes.json();
    expect(adminJson.data.principalType).toBe("ADMIN");
    expect(adminJson.data.admin.email).toBe("initial.admin@gmail.com");
  });

  it("enforces Single Admin Invariant and prevents duplicate admin creation", async () => {
    // Repeated bootstrap attempt with same email returns existing singleton admin
    const repeat = await checkAndBootstrapInitialAdmin(
      "initial.admin@gmail.com",
      "google-admin-1",
    );
    expect(repeat?.id).toBe(adminAccountId);

    const totalAdmins = await prisma.adminAccount.count();
    expect(totalAdmins).toBe(1);

    // Attempting to bootstrap another email when admin already exists returns null
    const second = await checkAndBootstrapInitialAdmin("other.admin@gmail.com");
    expect(second).toBeNull();
  });

  it("rejects non-admin student from accessing /api/admin/* endpoints (403 FORBIDDEN)", async () => {
    const req = createRequest("http://localhost:3000/api/admin/overview", "GET", undefined, studentToken);
    const res = await GET_OVERVIEW(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("provides operational metrics via GET /api/admin/overview without counting Admin", async () => {
    // Create another doubt and answer by student
    const doubt = await prisma.doubt.create({
      data: {
        authorId: studentUserId,
        title: "How does Dijkstra algorithm work?",
        body: "Need explanation for shortest path.",
      },
    });

    await prisma.answer.create({
      data: {
        doubtId: doubt.id,
        authorId: studentUserId,
        body: "It uses a priority queue.",
      },
    });

    const req = createRequest("http://localhost:3000/api/admin/overview", "GET", undefined, adminToken);
    const res = await GET_OVERVIEW(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.stats.totalStudents).toBe(1);
    expect(json.data.stats.activeStudents).toBe(1);
    expect(json.data.stats.totalDoubts).toBe(1);
    expect(json.data.stats.totalAnswers).toBe(1);
  });

  it("lists student roster safely via GET /api/admin/students", async () => {
    const req = createRequest("http://localhost:3000/api/admin/students?q=Alice", "GET", undefined, adminToken);
    const res = await GET_STUDENTS(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.students).toHaveLength(1);
    expect(json.data.students[0].fullName).toBe("Alice Sharma");
    expect(json.data.students[0].email).toBe("alice@mitsgwl.ac.in");
    expect(json.data.students[0].branch).toBe("Computer Science & Engineering (CSE)");
  });

  it("allows Admin to manage predefined skills taxonomy via GET, POST, and PATCH /api/admin/skills", async () => {
    // 1. Create predefined skill
    const createReq = createRequest(
      "http://localhost:3000/api/admin/skills",
      "POST",
      { name: "Computer Graphics", category: "Computer Science" },
      adminToken,
    );
    const createRes = await POST_SKILL(createReq);
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    const skillId = createJson.data.skill.id;
    expect(createJson.data.skill.name).toBe("Computer Graphics");
    expect(createJson.data.skill.slug).toBe("computer-graphics");

    // 2. Edit predefined skill
    const patchReq = createRequest(
      `http://localhost:3000/api/admin/skills/${skillId}`,
      "PATCH",
      { name: "Advanced Computer Graphics", category: "Visual Computing" },
      adminToken,
    );
    const patchRes = await PATCH_SKILL(patchReq, { params: Promise.resolve({ id: skillId }) });
    expect(patchRes.status).toBe(200);

    // 3. List skills
    const listReq = createRequest("http://localhost:3000/api/admin/skills", "GET", undefined, adminToken);
    const listRes = await GET_SKILLS(listReq);
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.data.skills.some((s: { name: string }) => s.name === "Advanced Computer Graphics")).toBe(true);
  });

  it("updates safe platform settings via GET and PATCH /api/admin/settings", async () => {
    const patchReq = createRequest(
      "http://localhost:3000/api/admin/settings",
      "PATCH",
      {
        platformName: "PeerSkill MITS",
        collegeDisplayName: "Madhav Institute of Technology & Science, Gwalior",
        supportEmail: "support@mitsgwl.ac.in",
        allowCustomSkills: false,
      },
      adminToken,
    );
    const patchRes = await PATCH_SETTINGS(patchReq);
    expect(patchRes.status).toBe(200);

    const getReq = createRequest("http://localhost:3000/api/admin/settings", "GET", undefined, adminToken);
    const getRes = await GET_SETTINGS(getReq);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.data.settings.platformName).toBe("PeerSkill MITS");
    expect(getJson.data.settings.allowCustomSkills).toBe(false);
  });

  it("atomically transfers ownership to new email, revokes sessions, and preserves singleton invariant", async () => {
    // Check initial ownership
    const ownReq = createRequest("http://localhost:3000/api/admin/ownership", "GET", undefined, adminToken);
    const ownRes = await GET_OWNERSHIP(ownReq);
    expect(ownRes.status).toBe(200);
    const ownJson = await ownRes.json();
    expect(ownJson.data.currentAdmin.email).toBe("initial.admin@gmail.com");

    // Current admin transfers ownership to successor.admin@gmail.com
    const transferReq = createRequest(
      "http://localhost:3000/api/admin/ownership/transfer",
      "POST",
      { targetEmail: "successor.admin@gmail.com" },
      adminToken,
    );
    const transferRes = await POST_TRANSFER_OWNERSHIP(transferReq);
    expect(transferRes.status).toBe(200);

    // 1. Verify singleton AdminAccount was updated (total count is still 1)
    const adminCount = await prisma.adminAccount.count();
    expect(adminCount).toBe(1);

    const updatedAdmin = await prisma.adminAccount.findFirst();
    expect(updatedAdmin?.email).toBe("successor.admin@gmail.com");
    expect(updatedAdmin?.googleId).toBeNull(); // Reset until new admin signs in

    // 2. Verify all previous AdminSessions are revoked
    const sessionCount = await prisma.adminSession.count();
    expect(sessionCount).toBe(0);

    // 3. Verify old adminToken is rejected
    const testOldTokenReq = createRequest("http://localhost:3000/api/admin/overview", "GET", undefined, adminToken);
    const testOldTokenRes = await GET_OVERVIEW(testOldTokenReq);
    expect(testOldTokenRes.status).toBe(403);

    // 4. Verify audit log was recorded
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: { action: "OWNERSHIP_TRANSFERRED" },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toContain("successor.admin@gmail.com");
  });
});
