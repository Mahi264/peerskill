import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

describe("RichTextEditor Component", () => {
  it("renders textarea with initial value and placeholder", () => {
    const handleChange = vi.fn();
    render(
      React.createElement(RichTextEditor, {
        value: "Initial content",
        onChange: handleChange,
        placeholder: "Write your explanation...",
      }),
    );

    const textarea = screen.getByPlaceholderText("Write your explanation...") as HTMLTextAreaElement;
    expect(textarea).toBeDefined();
    expect(textarea.value).toBe("Initial content");
  });

  it("renders primary formatting toolbar buttons with accessible labels", () => {
    render(
      React.createElement(RichTextEditor, {
        value: "",
        onChange: () => {},
      }),
    );

    expect(screen.getByRole("button", { name: "Heading" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Bold" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Italic" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Inline code" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Code block" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Insert Link" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Bulleted List" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Numbered List" })).toBeDefined();
    expect(screen.getByRole("button", { name: "More formatting options" })).toBeDefined();
  });

  it("opens More overflow menu and renders secondary actions (Blockquote, Table, HR, Image, Undo/Redo)", () => {
    render(
      React.createElement(RichTextEditor, {
        value: "",
        onChange: () => {},
      }),
    );

    const moreBtn = screen.getByRole("button", { name: "More formatting options" });
    fireEvent.click(moreBtn);

    expect(screen.getByText("Blockquote")).toBeDefined();
    expect(screen.getByText("Markdown Table")).toBeDefined();
    expect(screen.getByText("Horizontal Rule")).toBeDefined();
    expect(screen.getByText("Image Link")).toBeDefined();
    expect(screen.getByText("Undo")).toBeDefined();
    expect(screen.getByText("Redo")).toBeDefined();
  });

  it("toggles between Write and Preview tabs", () => {
    const { container } = render(
      React.createElement(RichTextEditor, {
        value: "### Formatted Title\nUse `code` here.",
        onChange: () => {},
      }),
    );

    const previewTab = screen.getByRole("button", { name: "Preview" });
    fireEvent.click(previewTab);

    // Textarea should be hidden in preview mode
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeDefined();
    expect(textarea.className).toContain("hidden");

    // Rendered heading should appear in preview
    expect(screen.getByRole("heading", { level: 4, name: "Formatted Title" })).toBeDefined();
    expect(screen.getByText("code")).toBeDefined();

    const writeTab = screen.getByRole("button", { name: "Write" });
    fireEvent.click(writeTab);
    expect(textarea.className).not.toContain("hidden");
  });

  it("invokes onChange when bold formatting is triggered", () => {
    let currentValue = "hello";
    const handleChange = vi.fn((val: string) => {
      currentValue = val;
    });

    render(
      React.createElement(RichTextEditor, {
        value: currentValue,
        onChange: handleChange,
      }),
    );

    const boldBtn = screen.getByRole("button", { name: "Bold" });
    fireEvent.click(boldBtn);

    expect(handleChange).toHaveBeenCalled();
  });
});
