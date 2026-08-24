import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-connections-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-connections-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
});

import { POST as POST_ACCEPT } from "@/app/api/connections/[id]/accept/route";
import { POST as POST_DECLINE } from "@/app/api/connections/[id]/decline/route";
import { DELETE as DELETE_CONNECTION } from "@/app/api/connections/[id]/route";
import { GET as GET_CONNECTIONS, POST as POST_CONNECTIONS } from "@/app/api/connections/route";
import { GET as GET_USER } from "@/app/api/users/[id]/route";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(
  url: string,
  method = "GET",
  body?: unknown,
  token?: string
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

describe("Connections API (Integration - Real SQLite)", () => {
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  let userCId: string;
  let userCToken: string;

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
    await prisma.connection.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.doubtSkill.deleteMany();
    await prisma.doubt.deleteMany();
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();

    // Create User A
    const userA = await prisma.user.create({
      data: {
        email: "student_a@mitsgwl.ac.in",
        googleId: "google-a",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Student A",
            branch: "Computer Science & Engineering (CSE)",
            helpAvailable: true,
          },
        },
      },
    });
    userAId = userA.id;
    const sessionA = await createSession(userA.id);
    userAToken = sessionA.rawToken;

    // Create User B
    const userB = await prisma.user.create({
      data: {
        email: "student_b@mitsgwl.ac.in",
        googleId: "google-b",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Student B",
            branch: "Information Technology (IT)",
            helpAvailable: true,
          },
        },
      },
    });
    userBId = userB.id;
    const sessionB = await createSession(userB.id);
    userBToken = sessionB.rawToken;

    // Create User C (3rd party)
    const userC = await prisma.user.create({
      data: {
        email: "student_c@mitsgwl.ac.in",
        googleId: "google-c",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Student C",
            branch: "Civil Engineering",
            helpAvailable: true,
          },
        },
      },
    });
    userCId = userC.id;
    const sessionC = await createSession(userC.id);
    userCToken = sessionC.rawToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sends a connection request from User A to User B", async () => {
    const req = createRequest(
      "http://localhost:3000/api/connections",
      "POST",
      { receiverId: userBId },
      userAToken
    );
    const res = await POST_CONNECTIONS(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.connection.requesterId).toBe(userAId);
    expect(json.data.connection.receiverId).toBe(userBId);
    expect(json.data.connection.status).toBe("PENDING");
    expect(json.data.autoAccepted).toBe(false);

    // Verify GET /api/users/[id] reflects PENDING_OUTGOING for A and PENDING_INCOMING for B
    const getResA = await GET_USER(
      createRequest(`http://localhost:3000/api/users/${userBId}`, "GET", undefined, userAToken),
      { params: Promise.resolve({ id: userBId }) }
    );
    const userAView = await getResA.json();
    expect(userAView.data.user.viewerConnection.state).toBe("PENDING_OUTGOING");

    const getResB = await GET_USER(
      createRequest(`http://localhost:3000/api/users/${userAId}`, "GET", undefined, userBToken),
      { params: Promise.resolve({ id: userAId }) }
    );
    const userBView = await getResB.json();
    expect(userBView.data.user.viewerConnection.state).toBe("PENDING_INCOMING");
  });

  it("rejects self-connection attempt", async () => {
    const req = createRequest(
      "http://localhost:3000/api/connections",
      "POST",
      { receiverId: userAId },
      userAToken
    );
    const res = await POST_CONNECTIONS(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("SELF_CONNECTION_NOT_ALLOWED");
  });

  it("rejects duplicate connection request in the same direction", async () => {
    await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "PENDING",
      },
    });

    const req = createRequest(
      "http://localhost:3000/api/connections",
      "POST",
      { receiverId: userBId },
      userAToken
    );
    const res = await POST_CONNECTIONS(req);
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error.code).toBe("REQUEST_ALREADY_PENDING");
  });

  it("automatically resolves reverse pending request to ACCEPTED without duplicate rows", async () => {
    // User A sent pending request to User B
    const conn = await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "PENDING",
      },
    });

    // User B attempts to send request to User A -> Auto-accepts!
    const req = createRequest(
      "http://localhost:3000/api/connections",
      "POST",
      { receiverId: userAId },
      userBToken
    );
    const res = await POST_CONNECTIONS(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.autoAccepted).toBe(true);
    expect(json.data.connection.status).toBe("ACCEPTED");
    expect(json.data.connection.id).toBe(conn.id);

    // Verify only 1 connection row exists in DB
    const count = await prisma.connection.count();
    expect(count).toBe(1);
  });

  it("accepts incoming connection request by recipient", async () => {
    const conn = await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "PENDING",
      },
    });

    const req = createRequest(
      `http://localhost:3000/api/connections/${conn.id}/accept`,
      "POST",
      undefined,
      userBToken
    );
    const res = await POST_ACCEPT(req, { params: Promise.resolve({ id: conn.id }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.connection.status).toBe("ACCEPTED");
    expect(json.data.connection.acceptedAt).toBeDefined();

    // Verify both users see CONNECTED
    const getResA = await GET_USER(
      createRequest(`http://localhost:3000/api/users/${userBId}`, "GET", undefined, userAToken),
      { params: Promise.resolve({ id: userBId }) }
    );
    const viewA = await getResA.json();
    expect(viewA.data.user.viewerConnection.state).toBe("CONNECTED");
  });

  it("rejects accept action by unauthorized user (requester or 3rd party)", async () => {
    const conn = await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "PENDING",
      },
    });

    // User A (requester) cannot accept their own request
    const reqA = createRequest(
      `http://localhost:3000/api/connections/${conn.id}/accept`,
      "POST",
      undefined,
      userAToken
    );
    const resA = await POST_ACCEPT(reqA, { params: Promise.resolve({ id: conn.id }) });
    expect(resA.status).toBe(403);

    // User C (3rd party) cannot accept
    const reqC = createRequest(
      `http://localhost:3000/api/connections/${conn.id}/accept`,
      "POST",
      undefined,
      userCToken
    );
    const resC = await POST_ACCEPT(reqC, { params: Promise.resolve({ id: conn.id }) });
    expect(resC.status).toBe(403);
  });

  it("declines incoming connection request and enforces cooldown on immediate re-request", async () => {
    const conn = await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "PENDING",
      },
    });

    // Recipient B declines
    const reqB = createRequest(
      `http://localhost:3000/api/connections/${conn.id}/decline`,
      "POST",
      undefined,
      userBToken
    );
    const resB = await POST_DECLINE(reqB, { params: Promise.resolve({ id: conn.id }) });
    expect(resB.status).toBe(200);

    // Immediate re-request by A should be rejected with 429 COOLDOWN_ACTIVE
    const reqRe = createRequest(
      "http://localhost:3000/api/connections",
      "POST",
      { receiverId: userBId },
      userAToken
    );
    const resRe = await POST_CONNECTIONS(reqRe);
    expect(resRe.status).toBe(429);

    const jsonRe = await resRe.json();
    expect(jsonRe.error.code).toBe("COOLDOWN_ACTIVE");
  });

  it("cancels a pending request when requester calls DELETE", async () => {
    const conn = await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "PENDING",
      },
    });

    const req = createRequest(
      `http://localhost:3000/api/connections/${conn.id}`,
      "DELETE",
      undefined,
      userAToken
    );
    const res = await DELETE_CONNECTION(req, { params: Promise.resolve({ id: conn.id }) });
    expect(res.status).toBe(200);

    const check = await prisma.connection.findUnique({ where: { id: conn.id } });
    expect(check).toBeNull();
  });

  it("removes an accepted connection when either participant calls DELETE", async () => {
    const conn = await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // User B removes connection
    const req = createRequest(
      `http://localhost:3000/api/connections/${conn.id}`,
      "DELETE",
      undefined,
      userBToken
    );
    const res = await DELETE_CONNECTION(req, { params: Promise.resolve({ id: conn.id }) });
    expect(res.status).toBe(200);

    const check = await prisma.connection.findUnique({ where: { id: conn.id } });
    expect(check).toBeNull();
  });

  it("lists user connections, incoming requests, and outgoing requests via GET /api/connections", async () => {
    // 1. Mutual connection between A and B
    await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // 2. Incoming request to A from C
    await prisma.connection.create({
      data: {
        requesterId: userCId,
        receiverId: userAId,
        status: "PENDING",
      },
    });

    const req = createRequest(
      "http://localhost:3000/api/connections",
      "GET",
      undefined,
      userAToken
    );
    const res = await GET_CONNECTIONS(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.connected.length).toBe(1);
    expect(json.data.connected[0].peer.id).toBe(userBId);
    expect(json.data.connected[0].peer.fullName).toBe("Student B");

    expect(json.data.incoming.length).toBe(1);
    expect(json.data.incoming[0].requester.id).toBe(userCId);
    expect(json.data.incoming[0].requester.fullName).toBe("Student C");

    expect(json.data.outgoing.length).toBe(0);
    expect(json.data.counts.connected).toBe(1);
    expect(json.data.counts.incoming).toBe(1);
    expect(json.data.counts.outgoing).toBe(0);
  });
});
