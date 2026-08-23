import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FormattedContent } from "@/components/ui/formatted-content";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

describe("Inline Answer Composer & Public Peer Academic Identity Refinement", () => {
  describe("Inline Answer Composer (RichTextEditor Integration)", () => {
    it("renders RichTextEditor with formatting toolbar controls in inline composer context", () => {
      const handleChange = vi.fn();
      render(
        React.createElement(RichTextEditor, {
          rows: 3,
          placeholder: "Type your explanation or solution for this doubt...",
          value: "### Solution\nUse `map()` here.",
          onChange: handleChange,
          className: "bg-white text-sm",
        }),
      );

      // Verify toolbar buttons are present
      expect(screen.getByRole("button", { name: "Heading" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Bold" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Code block" })).toBeDefined();
      expect(screen.getByRole("button", { name: "More formatting options" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Preview" })).toBeDefined();

      const textarea = screen.getByPlaceholderText(
        "Type your explanation or solution for this doubt...",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("### Solution\nUse `map()` here.");
    });

    it("renders submitted markdown answer through FormattedContent safely", () => {
      const submittedAnswerMarkdown =
        "### Step-by-Step Fix\n\n```typescript\nconst res = await fetch(url);\n```\n\n- Ensure headers are set\n- Validate status code 200";

      const { container } = render(
        React.createElement(FormattedContent, {
          content: submittedAnswerMarkdown,
          className: "pl-1",
        }),
      );

      // Heading level 4 for ###
      expect(screen.getByRole("heading", { level: 4, name: "Step-by-Step Fix" })).toBeDefined();
      // Code block
      expect(container.querySelector("pre")).toBeDefined();
      expect(container.textContent).toContain("const res = await fetch(url);");
      // List items
      const listItems = screen.getAllByRole("listitem");
      expect(listItems.length).toBe(2);
      expect(listItems[0].textContent).toBe("Ensure headers are set");
    });
  });

  describe("Peer-Facing Academic Identity Presentation (formatPublicPeerAcademicSubtitle)", () => {
    it("formats Branch • Section • Class of YYYY", () => {
      const result = formatPublicPeerAcademicSubtitle({
        branch: "Computer Science & Engineering (CSE)",
        section: "A",
        graduationYear: 2028,
      });

      expect(result).toBe("Computer Science & Engineering (CSE) • Section A • Class of 2028");
    });

    it("formats Branch • Class of YYYY when section is not set", () => {
      const result = formatPublicPeerAcademicSubtitle({
        branch: "Computer Science & Engineering (CSE)",
        section: null,
        graduationYear: 2028,
      });

      expect(result).toBe("Computer Science & Engineering (CSE) • Class of 2028");
    });

    it("formats Branch • Section when graduation year is not available", () => {
      const result = formatPublicPeerAcademicSubtitle({
        branch: "Information Technology (IT)",
        section: "B",
        graduationYear: null,
      });

      expect(result).toBe("Information Technology (IT) • Section B");
    });

    it("formats Branch only when neither section nor graduation year is set", () => {
      const result = formatPublicPeerAcademicSubtitle({
        branch: "Electrical Engineering (EE)",
        section: null,
        graduationYear: null,
      });

      expect(result).toBe("Electrical Engineering (EE)");
    });

    it("falls back gracefully to Campus Student when branch is missing", () => {
      const result = formatPublicPeerAcademicSubtitle({
        branch: null,
        section: "C",
        graduationYear: 2028,
      });

      expect(result).toBe("Campus Student • Section C • Class of 2028");
    });
  });
});
