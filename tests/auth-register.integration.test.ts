import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register (Integration - Obsolete Auth Route)", () => {
  it("returns HTTP 410 Gone explaining that password registration is replaced by Google OAuth", async () => {
    const response = await POST();
    expect(response.status).toBe(410);

    const json = await response.json();
    expect(json.error.code).toBe("OBSOLETE_AUTH_METHOD");
  });
});
