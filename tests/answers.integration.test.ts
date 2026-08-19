import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const TEST_DB_URL = "file:./test-answers-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-answers-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

import { POST as POST_ACCEPT } from "@/app/api/doubts/[id]/accept/route";
import { POST as POST_ANSWER } from "@/app/api/doubts/[id]/answers/route";
import { GET as GET_DETAIL } from "@/app/api/doubts/[id]/route";
import { POST as POST_DOUBT } from "@/app/api/doubts/route";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(url: string, method = "POST", body?: unknown, rawToken?: string): Request {
  const headers = new Headers();
  if (rawToken !== undefined) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${rawToken}`);
  }
  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("Answers & Accept API (Integration - Real SQLite)", () => {
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
    await prisma.doubtSkill.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.doubt.deleteMany();
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("completes full answer & accept loop in SQLite (OPEN -> RESOLVED)", async () => {
    const passwordHash = await hashPassword("password123");

    // Asker User
    const asker = await prisma.user.create({
      data: {
        email: "asker@college.edu",
        passwordHash,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Aarav Asker",
            department: "Computer Science",
          },
        },
      },
    });
    const { rawToken: askerToken } = await createSession(asker.id);

    // Helper User
    const helper = await prisma.user.create({
      data: {
        email: "helper@college.edu",
        passwordHash,
        status: "ACTIVE",
        profile: {
          create: {
            fullName: "Priya Helper",
            department: "Electrical Engineering",
          },
        },
      },
    });
    const { rawToken: helperToken } = await createSession(helper.id);

    // 1. Asker posts doubt
    const doubtRes = await POST_DOUBT(
      createRequest(
        "http://localhost:3000/api/doubts",
        "POST",
        {
          title: "How do I fix deadlock in Java Threads?",
          body: "I have two synchronized blocks locking resources in reverse order.",
          urgency: "ASSIGNMENT_STUCK",
          skills: ["Java"],
        },
        askerToken,
      ),
    );
    expect(doubtRes.status).toBe(201);
    const doubtJson = await doubtRes.json();
    const doubtId = doubtJson.data.doubt.id;

    // 2. Helper submits answer
    const answerRes = await POST_ANSWER(
      createRequest(
        `http://localhost:3000/api/doubts/${doubtId}/answers`,
        "POST",
        {
          body: "Always acquire locks in a globally consistent order across all threads to avoid circular wait.",
        },
        helperToken,
      ),
      { params: Promise.resolve({ id: doubtId }) },
    );
    expect(answerRes.status).toBe(201);
    const answerJson = await answerRes.json();
    const answerId = answerJson.data.answer.id;

    // Verify answer is present and isAccepted is false
    expect(answerJson.data.answer.isAccepted).toBe(false);

    // 3. Asker accepts answer
    const acceptRes = await POST_ACCEPT(
      createRequest(
        `http://localhost:3000/api/doubts/${doubtId}/accept`,
        "POST",
        {
          answerId,
        },
        askerToken,
      ),
      { params: Promise.resolve({ id: doubtId }) },
    );

    expect(acceptRes.status).toBe(200);
    const acceptJson = await acceptRes.json();
    expect(acceptJson.data.doubt.status).toBe("RESOLVED");
    expect(acceptJson.data.doubt.acceptedAnswerId).toBe(answerId);
    expect(acceptJson.data.answer.isAccepted).toBe(true);

    // 4. GET /api/doubts/[id] reflects RESOLVED doubt and accepted answer
    const detailRes = await GET_DETAIL(createRequest(`http://localhost:3000/api/doubts/${doubtId}`, "GET"), {
      params: Promise.resolve({ id: doubtId }),
    });
    const detailJson = await detailRes.json();

    expect(detailJson.data.doubt.status).toBe("RESOLVED");
    expect(detailJson.data.doubt.acceptedAnswerId).toBe(answerId);
    expect(detailJson.data.doubt.answers[0].isAccepted).toBe(true);
    expect(detailJson.data.doubt.answers[0].author.fullName).toBe("Priya Helper");

    // 5. Answering a RESOLVED doubt is STILL allowed
    const secondAnswerRes = await POST_ANSWER(
      createRequest(
        `http://localhost:3000/api/doubts/${doubtId}/answers`,
        "POST",
        {
          body: "Another valid approach is to use ReentrantLock with tryLock timeout.",
        },
        helperToken,
      ),
      { params: Promise.resolve({ id: doubtId }) },
    );
    expect(secondAnswerRes.status).toBe(201);
    const secondAnswerJson = await secondAnswerRes.json();
    const secondAnswerId = secondAnswerJson.data.answer.id;

    // 6. Asker accepts the second answer (changing the accepted answer later)
    const changeAcceptRes = await POST_ACCEPT(
      createRequest(
        `http://localhost:3000/api/doubts/${doubtId}/accept`,
        "POST",
        {
          answerId: secondAnswerId,
        },
        askerToken,
      ),
      { params: Promise.resolve({ id: doubtId }) },
    );
    expect(changeAcceptRes.status).toBe(200);
    const changeAcceptJson = await changeAcceptRes.json();
    expect(changeAcceptJson.data.doubt.acceptedAnswerId).toBe(secondAnswerId);
    expect(changeAcceptJson.data.answer.isAccepted).toBe(true);

    // 7. Author answers their own doubt
    const selfAnswerRes = await POST_ANSWER(
      createRequest(
        `http://localhost:3000/api/doubts/${doubtId}/answers`,
        "POST",
        {
          body: "I also confirmed that lock ordering resolved the issue in my codebase.",
        },
        askerToken,
      ),
      { params: Promise.resolve({ id: doubtId }) },
    );
    expect(selfAnswerRes.status).toBe(201);
    const selfAnswerJson = await selfAnswerRes.json();
    const selfAnswerId = selfAnswerJson.data.answer.id;

    // 8. Author accepts their own answer
    const selfAcceptRes = await POST_ACCEPT(
      createRequest(
        `http://localhost:3000/api/doubts/${doubtId}/accept`,
        "POST",
        {
          answerId: selfAnswerId,
        },
        askerToken,
      ),
      { params: Promise.resolve({ id: doubtId }) },
    );
    expect(selfAcceptRes.status).toBe(200);
    const selfAcceptJson = await selfAcceptRes.json();
    expect(selfAcceptJson.data.doubt.acceptedAnswerId).toBe(selfAnswerId);

    // 9. Reject answers on CLOSED doubts
    await prisma.doubt.update({
      where: { id: doubtId },
      data: { status: "CLOSED" },
    });

    const closedAnswerRes = await POST_ANSWER(
      createRequest(
        `http://localhost:3000/api/doubts/${doubtId}/answers`,
        "POST",
        {
          body: "Trying to answer a closed doubt should be rejected.",
        },
        helperToken,
      ),
      { params: Promise.resolve({ id: doubtId }) },
    );
    expect(closedAnswerRes.status).toBe(400);
    const closedAnswerJson = await closedAnswerRes.json();
    expect(closedAnswerJson.error.code).toBe("DOUBT_CLOSED");
  });
});
