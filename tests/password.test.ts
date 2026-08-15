import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password without storing the plaintext", async () => {
    const password = "CorrectHorseBatteryStaple!123";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toContain("$argon2id$");
  });

  it("verifies the correct password", async () => {
    const password = "CorrectHorseBatteryStaple!123";
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await hashPassword("CorrectHorseBatteryStaple!123");

    await expect(
      verifyPassword("WrongPassword!123", passwordHash),
    ).resolves.toBe(false);
  });

  it("produces different hashes for the same password", async () => {
    const password = "CorrectHorseBatteryStaple!123";

    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(secondHash);
  });
});
