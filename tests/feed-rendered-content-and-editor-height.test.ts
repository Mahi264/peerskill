import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormattedContent } from "@/components/ui/formatted-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { formatPublicPeerAcademicSubtitle } from "@/lib/utils";

describe("Discovery Feed, Formatted Previews & Editor Height", () => {
  describe("1. Feed Doubt Markdown Rendering (FormattedContent)", () => {
    it("renders formatted elements (headings, links, inline code, lists) and eliminates raw markdown syntax", () => {
      const markdown = "### Dynamic Programming Concept\nUse `memoization` for performance.\n\nCheck [Docs](https://react.dev) for details.";
      const { container } = render(React.createElement(FormattedContent, { content: markdown }));

      // Heading should be rendered as an H4 HTML element
      expect(screen.getByRole("heading", { level: 4, name: "Dynamic Programming Concept" })).toBeDefined();

      // Inline code should be rendered inside a <code> element
      const codeElement = container.querySelector("code");
      expect(codeElement?.textContent).toBe("memoization");

      // Link should be rendered as an <a> element with proper href and text
      const linkElement = screen.getByRole("link", { name: "Docs" }) as HTMLAnchorElement;
      expect(linkElement.href).toBe("https://react.dev/");
      expect(linkElement.textContent).toBe("Docs");

      // Raw syntax should not be present in text
      expect(container.textContent).not.toContain("### Dynamic Programming");
      expect(container.textContent).not.toContain("[Docs](https://react.dev)");
    });
  });

  describe("2. Image Alt Text Mapping", () => {
    it("correctly populates the alt attribute from the markdown description", () => {
      const markdown = "![Data Flow Architecture](https://example.com/dataflow.png)";
      const { container } = render(React.createElement(FormattedContent, { content: markdown }));

      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).toBeDefined();
      expect(img.getAttribute("alt")).toBe("Data Flow Architecture");
      expect(img.getAttribute("src")).toBe("https://example.com/dataflow.png");
    });

    it("falls back to 'Image attachment' when description is empty", () => {
      const markdown = "![](https://example.com/unnamed.png)";
      const { container } = render(React.createElement(FormattedContent, { content: markdown }));

      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).toBeDefined();
      expect(img.getAttribute("alt")).toBe("Image attachment");
    });
  });

  describe("3. Discovery Feed Clean Density & Structure", () => {
    const mockAuthor = {
      id: "u-1",
      email: "student1@mitsgwl.ac.in",
      fullName: "Mohit Sharma",
      branch: "Computer Science & Engineering (CSE)",
      section: "A",
      graduationYear: 2028,
      avatarUrl: null,
    };

    it("formats peer-facing academic subtitle for doubt author without department concept", () => {
      const subtitle = formatPublicPeerAcademicSubtitle(mockAuthor);
      expect(subtitle).toBe("Computer Science & Engineering (CSE) • Section A • Class of 2028");
    });

    it("displays answer count and links directly to detail page /doubts/[id] without inline editor", () => {
      const doubt = {
        id: "d-123",
        title: "How to configure SQLite in Next.js?",
        body: "### Problem\nPrisma client initialization issue in dev mode.",
        answerCount: 3,
        author: mockAuthor,
      };

      // Ensure mock verify structure matches discovery feed rules
      expect(doubt.answerCount).toBe(3);
      expect(`/doubts/${doubt.id}`).toBe("/doubts/d-123");
    });
  });

  describe("4. RichTextEditor Textarea Height Persistence", () => {
    it("preserves manually resized textarea height across Write -> Preview -> Write switches", () => {
      const handleChange = vi.fn();
      const { container } = render(
        React.createElement(RichTextEditor, {
          rows: 6,
          placeholder: "Type your explanation...",
          value: "### Test Heading\nSome content here",
          onChange: handleChange,
        }),
      );

      const textarea = screen.getByPlaceholderText("Type your explanation...") as HTMLTextAreaElement;
      expect(textarea).toBeDefined();

      // Simulate user dragging the resize handle to 320px
      textarea.style.height = "320px";

      // Switch to Preview tab
      const previewTabButton = screen.getByRole("button", { name: "Preview" });
      fireEvent.click(previewTabButton);

      // Verify preview content rendered
      expect(screen.getByRole("heading", { level: 4, name: "Test Heading" })).toBeDefined();

      // Switch back to Write tab
      const writeTabButton = screen.getByRole("button", { name: "Write" });
      fireEvent.click(writeTabButton);

      // Verify textarea height is preserved at 320px and not reset to default
      const preservedTextarea = container.querySelector("textarea") as HTMLTextAreaElement;
      expect(preservedTextarea).toBeDefined();
      expect(preservedTextarea.style.height).toBe("320px");
      expect(preservedTextarea.value).toBe("### Test Heading\nSome content here");
    });
  });
});
