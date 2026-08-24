import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-messaging-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-messaging-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "mitsgwl.ac.in";
});

import {
  GET as GET_MESSAGES,
  POST as POST_MESSAGE,
} from "@/app/api/conversations/[id]/messages/route";
import { GET as GET_CONVERSATION } from "@/app/api/conversations/[id]/route";
import {
  GET as GET_CONVERSATIONS,
  POST as POST_CONVERSATION,
} from "@/app/api/conversations/route";
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

describe("Messaging API (Integration - Real SQLite)", () => {
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
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

    // Create User A
    const userA = await prisma.user.create({
      data: {
        email: "alice@mitsgwl.ac.in",
        googleId: "google-alice",
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
    userAId = userA.id;
    const sessionA = await createSession(userA.id);
    userAToken = sessionA.rawToken;

    // Create User B
    const userB = await prisma.user.create({
      data: {
        email: "bob@mitsgwl.ac.in",
        googleId: "google-bob",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Bob Patel",
            branch: "Information Technology (IT)",
            section: "B",
            graduationYear: 2028,
            helpAvailable: true,
          },
        },
      },
    });
    userBId = userB.id;
    const sessionB = await createSession(userB.id);
    userBToken = sessionB.rawToken;

    // Create User C (Third party)
    const userC = await prisma.user.create({
      data: {
        email: "charlie@mitsgwl.ac.in",
        googleId: "google-charlie",
        collegeEmailVerified: true,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Charlie Verma",
            branch: "Civil Engineering",
            helpAvailable: true,
          },
        },
      },
    });
    const sessionC = await createSession(userC.id);
    userCToken = sessionC.rawToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a conversation when two users are connected and returns existing on repeat", async () => {
    // 1. Establish mutual connection between Alice and Bob
    await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // 2. Alice starts conversation with Bob
    const req1 = createRequest(
      "http://localhost:3000/api/conversations",
      "POST",
      { peerId: userBId },
      userAToken
    );
    const res1 = await POST_CONVERSATION(req1);
    expect(res1.status).toBe(201);

    const json1 = await res1.json();
    const convId = json1.data.conversation.id;
    expect(convId).toBeDefined();
    expect(json1.data.isNew).toBe(true);
    expect(json1.data.conversation.peer.fullName).toBe("Bob Patel");

    // 3. Bob attempts to start conversation with Alice -> Should return existing conversation (200 OK)
    const req2 = createRequest(
      "http://localhost:3000/api/conversations",
      "POST",
      { peerId: userAId },
      userBToken
    );
    const res2 = await POST_CONVERSATION(req2);
    expect(res2.status).toBe(200);

    const json2 = await res2.json();
    expect(json2.data.conversation.id).toBe(convId);
    expect(json2.data.isNew).toBe(false);
    expect(json2.data.conversation.peer.fullName).toBe("Alice Sharma");

    // Verify exactly 1 conversation row exists in DB
    const totalCount = await prisma.conversation.count();
    expect(totalCount).toBe(1);
  });

  it("rejects conversation creation if users are not connected", async () => {
    // No connection row exists
    const req = createRequest(
      "http://localhost:3000/api/conversations",
      "POST",
      { peerId: userBId },
      userAToken
    );
    const res = await POST_CONVERSATION(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error.code).toBe("CONNECTION_REQUIRED");
  });

  it("rejects self-conversation", async () => {
    const req = createRequest(
      "http://localhost:3000/api/conversations",
      "POST",
      { peerId: userAId },
      userAToken
    );
    const res = await POST_CONVERSATION(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.code).toBe("SELF_CONVERSATION_NOT_ALLOWED");
  });

  it("sends plain-text messages in conversation and updates conversation timestamp", async () => {
    // Connect Alice & Bob
    await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // Create conversation
    const userOneId = userAId < userBId ? userAId : userBId;
    const userTwoId = userAId < userBId ? userBId : userAId;
    const conv = await prisma.conversation.create({
      data: { userOneId, userTwoId },
    });

    // Alice sends message
    const sendReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      "POST",
      { body: "Hello Bob! Can you help with question 3?" },
      userAToken
    );
    const sendRes = await POST_MESSAGE(sendReq, { params: Promise.resolve({ id: conv.id }) });
    expect(sendRes.status).toBe(201);

    const sendJson = await sendRes.json();
    expect(sendJson.data.message.body).toBe("Hello Bob! Can you help with question 3?");
    expect(sendJson.data.message.isSelf).toBe(true);

    // Bob sends reply
    const replyReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      "POST",
      { body: "Sure, check this link https://mitsgwl.ac.in/notes for the formulas." },
      userBToken
    );
    const replyRes = await POST_MESSAGE(replyReq, { params: Promise.resolve({ id: conv.id }) });
    expect(replyRes.status).toBe(201);

    // Retrieve messages as Alice
    const getReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      "GET",
      undefined,
      userAToken
    );
    const getRes = await GET_MESSAGES(getReq, { params: Promise.resolve({ id: conv.id }) });
    expect(getRes.status).toBe(200);

    const getJson = await getRes.json();
    expect(getJson.data.messages).toHaveLength(2);
    expect(getJson.data.messages[0].body).toBe("Hello Bob! Can you help with question 3?");
    expect(getJson.data.messages[0].isSelf).toBe(true);
    expect(getJson.data.messages[1].body).toBe("Sure, check this link https://mitsgwl.ac.in/notes for the formulas.");
    expect(getJson.data.messages[1].isSelf).toBe(false);
  });

  it("rejects 3rd-party user from reading or sending messages in conversation", async () => {
    // Connect Alice & Bob
    await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    const userOneId = userAId < userBId ? userAId : userBId;
    const userTwoId = userAId < userBId ? userBId : userAId;
    const conv = await prisma.conversation.create({
      data: { userOneId, userTwoId },
    });

    // Charlie tries to send message
    const sendReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      "POST",
      { body: "Sneaking in" },
      userCToken
    );
    const sendRes = await POST_MESSAGE(sendReq, { params: Promise.resolve({ id: conv.id }) });
    expect(sendRes.status).toBe(403);

    // Charlie tries to read messages
    const getReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      "GET",
      undefined,
      userCToken
    );
    const getRes = await GET_MESSAGES(getReq, { params: Promise.resolve({ id: conv.id }) });
    expect(getRes.status).toBe(403);
  });

  it("disables message sending when connection is removed while preserving read-only history", async () => {
    // 1. Connect Alice & Bob
    const conn = await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    const userOneId = userAId < userBId ? userAId : userBId;
    const userTwoId = userAId < userBId ? userBId : userAId;
    const conv = await prisma.conversation.create({
      data: { userOneId, userTwoId },
    });

    // 2. Alice sends a message while connected
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: userAId,
        body: "Archived study notes message.",
      },
    });

    // 3. Bob removes connection
    await prisma.connection.delete({ where: { id: conn.id } });

    // 4. Alice tries to send new message -> Should fail with 403 CONNECTION_REQUIRED
    const sendReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      "POST",
      { body: "Trying to message after disconnect" },
      userAToken
    );
    const sendRes = await POST_MESSAGE(sendReq, { params: Promise.resolve({ id: conv.id }) });
    expect(sendRes.status).toBe(403);

    const sendJson = await sendRes.json();
    expect(sendJson.error.code).toBe("CONNECTION_REQUIRED");

    // 5. Conversation history remains readable (read-only)
    const getReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}/messages`,
      "GET",
      undefined,
      userAToken
    );
    const getRes = await GET_MESSAGES(getReq, { params: Promise.resolve({ id: conv.id }) });
    expect(getRes.status).toBe(200);

    const getJson = await getRes.json();
    expect(getJson.data.messages).toHaveLength(1);
    expect(getJson.data.messages[0].body).toBe("Archived study notes message.");

    // 6. Conversation detail returns isConnected: false
    const detailReq = createRequest(
      `http://localhost:3000/api/conversations/${conv.id}`,
      "GET",
      undefined,
      userAToken
    );
    const detailRes = await GET_CONVERSATION(detailReq, { params: Promise.resolve({ id: conv.id }) });
    expect(detailRes.status).toBe(200);

    const detailJson = await detailRes.json();
    expect(detailJson.data.conversation.peer.isConnected).toBe(false);
  });

  it("lists user conversations with latest message preview via GET /api/conversations", async () => {
    // Connect Alice & Bob
    await prisma.connection.create({
      data: {
        requesterId: userAId,
        receiverId: userBId,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    const userOneId = userAId < userBId ? userAId : userBId;
    const userTwoId = userAId < userBId ? userBId : userAId;
    const conv = await prisma.conversation.create({
      data: { userOneId, userTwoId },
    });

    await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: userBId,
        body: "Latest message from Bob",
      },
    });

    const listReq = createRequest(
      "http://localhost:3000/api/conversations",
      "GET",
      undefined,
      userAToken
    );
    const listRes = await GET_CONVERSATIONS(listReq);
    expect(listRes.status).toBe(200);

    const listJson = await listRes.json();
    expect(listJson.data.conversations).toHaveLength(1);
    expect(listJson.data.conversations[0].peer.fullName).toBe("Bob Patel");
    expect(listJson.data.conversations[0].lastMessage.body).toBe("Latest message from Bob");
    expect(listJson.data.conversations[0].peer.isConnected).toBe(true);
  });
});
