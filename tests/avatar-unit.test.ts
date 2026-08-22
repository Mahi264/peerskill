import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, getAvatarInitials, isValidCustomAvatarUrl } from "@/components/ui/avatar";

describe("PeerSkill Canonical Avatar Strategy (Unit Tests)", () => {
  describe("getAvatarInitials", () => {
    it("generates correct initials for standard 2-word names", () => {
      expect(getAvatarInitials("MOHIT SHARMA")).toBe("MS");
      expect(getAvatarInitials("MAHI GUPTA")).toBe("MG");
      expect(getAvatarInitials("MITI DUBEY")).toBe("MD");
      expect(getAvatarInitials("Aarav Mehta")).toBe("AM");
    });

    it("generates correct initials from raw Google roll-prefixed names", () => {
      expect(getAvatarInitials("BTCS24O1080 MOHIT SHARMA")).toBe("MS");
      expect(getAvatarInitials("BTCS24O1077 MAHI GUPTA")).toBe("MG");
      expect(getAvatarInitials("0101CS241080 MOHIT SHARMA")).toBe("MS");
      expect(getAvatarInitials("BTCS24L1005 RAHUL VERMA")).toBe("RV");
    });

    it("handles multi-word names by using first and last word initials", () => {
      expect(getAvatarInitials("Mohit Kumar Sharma")).toBe("MS");
      expect(getAvatarInitials("Devendra Pratap Singh")).toBe("DS");
    });

    it("handles single-word names safely", () => {
      expect(getAvatarInitials("Mohit")).toBe("MO");
      expect(getAvatarInitials("Student")).toBe("ST");
      expect(getAvatarInitials("A")).toBe("A");
    });

    it("handles empty, whitespace, and null names safely", () => {
      expect(getAvatarInitials("")).toBe("PS");
      expect(getAvatarInitials("   ")).toBe("PS");
      expect(getAvatarInitials(null as unknown as string)).toBe("PS");
      expect(getAvatarInitials(undefined as unknown as string)).toBe("PS");
    });
  });

  describe("isValidCustomAvatarUrl", () => {
    it("rejects Google Workspace generated / default avatar URLs", () => {
      expect(
        isValidCustomAvatarUrl("https://lh3.googleusercontent.com/a/ACg8ocK-generated-character-icon"),
      ).toBe(false);
      expect(isValidCustomAvatarUrl("https://googleusercontent.com/photo.jpg")).toBe(false);
      expect(isValidCustomAvatarUrl("https://profiles.google.com/avatar")).toBe(false);
    });

    it("accepts valid custom / non-Google avatar URLs for future photo uploads", () => {
      expect(isValidCustomAvatarUrl("https://cdn.peerskill.campus/photos/student1.jpg")).toBe(true);
      expect(isValidCustomAvatarUrl("https://images.unsplash.com/photo-custom")).toBe(true);
    });

    it("handles empty or null URLs safely", () => {
      expect(isValidCustomAvatarUrl("")).toBe(false);
      expect(isValidCustomAvatarUrl("   ")).toBe(false);
      expect(isValidCustomAvatarUrl(null)).toBe(false);
      expect(isValidCustomAvatarUrl(undefined)).toBe(false);
    });
  });

  describe("Avatar Component Rendering", () => {
    it("renders canonical initials MS when Google picture URL is provided (ignores Google generated avatar)", () => {
      const { container } = render(
        React.createElement(Avatar, {
          name: "MOHIT SHARMA",
          department: "Computer Science",
          src: "https://lh3.googleusercontent.com/a/generated-B-icon",
        }),
      );

      // Should render text initials MS, NOT an <img> element
      expect(screen.getByText("MS")).toBeDefined();
      expect(container.querySelector("img")).toBeNull();
    });

    it("renders canonical initials for raw un-normalized name input", () => {
      render(
        React.createElement(Avatar, {
          name: "BTCS24O1080 MOHIT SHARMA",
          department: "Computer Science",
        }),
      );

      expect(screen.getByText("MS")).toBeDefined();
    });

    it("renders custom image element when a valid non-Google photo URL is provided", () => {
      const { container } = render(
        React.createElement(Avatar, {
          name: "MOHIT SHARMA",
          department: "Computer Science",
          src: "https://cdn.peerskill.campus/photos/real-photo.jpg",
        }),
      );

      const img = container.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe("https://cdn.peerskill.campus/photos/real-photo.jpg");
      expect(img?.getAttribute("alt")).toBe("MOHIT SHARMA");
    });
  });
});
