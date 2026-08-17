import { execSync } from "node:child_process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 1. Mock server-only so Next.js server-only import doesn't fail in Vitest
vi.mock("server-only", () => ({}));

// 2. Set environment variables in vi.hoisted so they run before ESM static imports
const TEST_DB_URL = "file:./test-integration.db";

vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./test-integration.db";
  process.env.COLLEGE_EMAIL_DOMAIN = "college.edu";
});

// 3. Import route handler and Prisma client after setting env vars
import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";

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
    // Clean user table before each integration test
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a real User row in SQLite with correct default fields and hashed password", async () => {
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
