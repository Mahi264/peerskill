import { describe, expect, it } from "vitest";

import {
  CONNECTION_RE_REQUEST_COOLDOWN_MS,
  sendConnectionRequestSchema,
} from "@/lib/validations/connection";

describe("Connections Unit Validations", () => {
  it("validates a proper receiverId payload", () => {
    const res = sendConnectionRequestSchema.safeParse({
      receiverId: "user_abc123",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.receiverId).toBe("user_abc123");
    }
  });

  it("rejects empty or missing receiverId", () => {
    const emptyRes = sendConnectionRequestSchema.safeParse({
      receiverId: "",
    });
    expect(emptyRes.success).toBe(false);

    const missingRes = sendConnectionRequestSchema.safeParse({});
    expect(missingRes.success).toBe(false);
  });

  it("has a valid 24-hour cooldown constant", () => {
    expect(CONNECTION_RE_REQUEST_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
  });
});
