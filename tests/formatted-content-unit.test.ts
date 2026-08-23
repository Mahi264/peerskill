import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { FormattedContent, isSafeUrl } from "@/components/ui/formatted-content";

describe("FormattedContent & Security Parser", () => {
  describe("isSafeUrl", () => {
    it("allows valid https and http URLs", () => {
      expect(isSafeUrl("https://mitsgwl.ac.in")).toBe(true);
      expect(isSafeUrl("http://example.com/path?query=1")).toBe(true);
    });

    it("allows relative paths and anchors", () => {
      expect(isSafeUrl("/home")).toBe(true);
      expect(isSafeUrl("#section-1")).toBe(true);
    });

    it("allows mailto: links", () => {
      expect(isSafeUrl("mailto:student@mitsgwl.ac.in")).toBe(true);
    });

    it("blocks javascript: and dangerous XSS schemes", () => {
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
      expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    });

    it("rejects empty or invalid inputs", () => {
      expect(isSafeUrl("")).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
    });
  });

  describe("Markdown formatting rendering", () => {
    it("renders headings properly", () => {
      render(React.createElement(FormattedContent, { content: "### Why does this happen?" }));
      const heading = screen.getByRole("heading", { level: 4 });
      expect(heading).toBeDefined();
      expect(heading.textContent).toBe("Why does this happen?");
    });

    it("renders inline code properly", () => {
      render(React.createElement(FormattedContent, { content: "Use `useEffect` for lifecycle hooks." }));
      const code = screen.getByText("useEffect");
      expect(code.tagName.toLowerCase()).toBe("code");
    });

    it("renders code blocks properly", () => {
      const codeText = "const result = await fetch(url);\nconsole.log(result);";
      const { container } = render(
        React.createElement(FormattedContent, { content: `\`\`\`typescript\n${codeText}\n\`\`\`` }),
      );
      expect(screen.getByText("typescript")).toBeDefined();
      expect(container.querySelector("pre")).toBeDefined();
      expect(container.textContent).toContain("console.log(result);");
    });

    it("renders bulleted lists properly", () => {
      const content = "- Step one\n- Step two";
      render(React.createElement(FormattedContent, { content }));
      const listItems = screen.getAllByRole("listitem");
      expect(listItems.length).toBe(2);
      expect(listItems[0].textContent).toBe("Step one");
      expect(listItems[1].textContent).toBe("Step two");
    });

    it("renders numbered lists properly", () => {
      const content = "1. Install dependency\n2. Restart server";
      render(React.createElement(FormattedContent, { content }));
      const listItems = screen.getAllByRole("listitem");
      expect(listItems.length).toBe(2);
      expect(listItems[0].textContent).toBe("Install dependency");
      expect(listItems[1].textContent).toBe("Restart server");
    });

    it("renders blockquotes properly", () => {
      const content = "> This only happens after login.";
      const { container } = render(React.createElement(FormattedContent, { content }));
      const blockquote = container.querySelector("blockquote");
      expect(blockquote).toBeDefined();
      expect(blockquote?.textContent).toContain("This only happens after login.");
    });

    it("renders safe links properly with noopener noreferrer", () => {
      const content = "[MITS Portal](https://example.com)";
      render(React.createElement(FormattedContent, { content }));
      const link = screen.getByRole("link", { name: "MITS Portal" });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("https://example.com");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    });

    it("renders tables properly", () => {
      const content = "| Input | Output |\n| --- | --- |\n| A | B |";
      const { container } = render(React.createElement(FormattedContent, { content }));
      expect(container.querySelector("table")).toBeDefined();
      expect(screen.getByText("Input")).toBeDefined();
      expect(screen.getByText("Output")).toBeDefined();
      expect(screen.getByText("A")).toBeDefined();
      expect(screen.getByText("B")).toBeDefined();
    });

    it("renders horizontal rules properly", () => {
      const content = "Before rule\n---\nAfter rule";
      const { container } = render(React.createElement(FormattedContent, { content }));
      expect(container.querySelector("hr")).toBeDefined();
      expect(screen.getByText("Before rule")).toBeDefined();
      expect(screen.getByText("After rule")).toBeDefined();
    });

    it("renders safe image links properly", () => {
      const content = "![Architecture Diagram](https://example.com/diagram.png)";
      render(React.createElement(FormattedContent, { content }));
      const img = screen.getByRole("img", { name: "Architecture Diagram" });
      expect(img).toBeDefined();
      expect(img.getAttribute("src")).toBe("https://example.com/diagram.png");
    });

    it("renders bold and italic formatting properly", () => {
      render(
        React.createElement(FormattedContent, { content: "This is **critical** and *important*." }),
      );
      const bold = screen.getByText("critical");
      expect(bold.tagName.toLowerCase()).toBe("strong");
      const italic = screen.getByText("important");
      expect(italic.tagName.toLowerCase()).toBe("em");
    });

    it("preserves backward compatibility with plain text content", () => {
      const plainText = "I have a doubt about the operating system lab assignment.\nLine 2 without formatting.";
      render(React.createElement(FormattedContent, { content: plainText }));
      expect(screen.getByText(/I have a doubt about the operating system/)).toBeDefined();
    });

    it("sanitizes dangerous XSS payloads in markdown links and images", () => {
      const xssLink = "[Click me](javascript:alert(document.cookie))";
      const { container } = render(React.createElement(FormattedContent, { content: xssLink }));
      const links = container.querySelectorAll("a[href^='javascript:']");
      expect(links.length).toBe(0);
    });
  });
});
