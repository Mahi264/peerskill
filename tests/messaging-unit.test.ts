import { describe, expect, it } from "vitest";

import { getCanonicalUserPair } from "@/lib/messages";
import {
  createConversationSchema,
  sendMessageSchema,
} from "@/lib/validations/message";

describe("Messaging Unit Validations & Canonical Pairing", () => {
  it("computes canonical user pairs deterministically regardless of argument order", () => {
    const pair1 = getCanonicalUserPair("user_alice_123", "user_bob_456");
    const pair2 = getCanonicalUserPair("user_bob_456", "user_alice_123");

    expect(pair1.userOneId).toBe("user_alice_123");
    expect(pair1.userTwoId).toBe("user_bob_456");

    expect(pair2.userOneId).toBe("user_alice_123");
    expect(pair2.userTwoId).toBe("user_bob_456");

    expect(pair1).toEqual(pair2);
  });

  it("validates createConversationSchema", () => {
    const valid = createConversationSchema.safeParse({ peerId: "user_789" });
    expect(valid.success).toBe(true);

    const empty = createConversationSchema.safeParse({ peerId: "" });
    expect(empty.success).toBe(false);

    const missing = createConversationSchema.safeParse({});
    expect(missing.success).toBe(false);
  });

  it("validates sendMessageSchema with trimming and character bounds", () => {
    const valid = sendMessageSchema.safeParse({
      body: "  Hello Priya! Are you available to study?  ",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.body).toBe("Hello Priya! Are you available to study?");
    }

    const empty = sendMessageSchema.safeParse({ body: "   " });
    expect(empty.success).toBe(false);

    const tooLong = sendMessageSchema.safeParse({
      body: "A".repeat(2001),
    });
    expect(tooLong.success).toBe(false);
  });
});
