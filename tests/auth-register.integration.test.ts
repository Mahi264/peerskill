import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 1. Mock server-only so Next.js server-only import doesn't fail in Vitest
vi.mock("server-only", () => ({}));

// 2. Set environment variables in vi.hoisted so they run before ESM static imports
const TEST_DB_URL = "file:./test-register-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-register-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});


// 3. Import route handler and Prisma client after setting env vars
import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register (Integration - Real SQLite)", () => {
  beforeAll(() => {
    // Prepare the real test SQLite database schema without touching dev.db
    execSync("npx prisma db push --skip-generate", {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: "ignore",
    });
  });

  beforeEach(async () => {
    // Clean tables before each integration test
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a real User row in SQLite with correct default fields, hashed password, and session cookie", async () => {
    const email = "realstudent@college.edu";
    const password = "realpassword123";

    const response = await POST(
      createRequest({
        email,
        password,
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.user.email).toBe(email);

    // Verify row directly from SQLite database via Prisma
    const dbUser = await prisma.user.findUnique({
      where: { email },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser?.email).toBe(email);
    expect(dbUser?.collegeEmailVerified).toBe(false);
    expect(dbUser?.status).toBe("PENDING");
    expect(dbUser?.role).toBe("STUDENT");
    expect(dbUser?.passwordHash).not.toBe(password);
    expect(dbUser?.passwordHash).toContain("$argon2id$");

    // Verify session cookie is set
    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookieHeader?.toLowerCase()).toContain("httponly");
    expect(cookieHeader?.toLowerCase()).toContain("path=/");
    expect(cookieHeader?.toLowerCase()).toContain("samesite=lax");

    // Verify session row exists in SQLite
    const sessions = await prisma.session.findMany({
      where: { userId: dbUser!.id },
    });
    expect(sessions).toHaveLength(1);

    // Verify token is stored hashed
    const match = cookieHeader?.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    expect(match).toBeTruthy();
    const rawToken = match?.[1];
    const expectedHash = hashSessionToken(rawToken!);
    expect(sessions[0].tokenHash).toBe(expectedHash);
    expect(sessions[0].tokenHash).not.toBe(rawToken);
  });

  it("rejects duplicate registration with HTTP 409 when user already exists in SQLite", async () => {
    const email = "duplicatestudent@college.edu";
    const password = "realpassword123";

    // First registration
    const firstResponse = await POST(createRequest({ email, password }));
    expect(firstResponse.status).toBe(201);

    // Second registration with same email
    const secondResponse = await POST(createRequest({ email, password }));
    expect(secondResponse.status).toBe(409);

    const body = await secondResponse.json();
    expect(body.error.code).toBe("DUPLICATE_EMAIL");

    // Verify only 1 user exists in database
    const count = await prisma.user.count({ where: { email } });
    expect(count).toBe(1);
  });
});
