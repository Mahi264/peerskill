import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login (Obsolete Auth Route)", () => {
  it("returns HTTP 410 Gone with OBSOLETE_AUTH_METHOD code", async () => {
    const response = await POST();
    expect(response.status).toBe(410);

    const json = await response.json();
    expect(json.error.code).toBe("OBSOLETE_AUTH_METHOD");
    expect(json.error.message).toContain("Password login is obsolete");
  });
});
