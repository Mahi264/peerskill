import * as React from "react";
import {
  Bold,
  Code,
  Eye,
  FileCode,
  Heading,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  PenLine,
  Quote,
  Redo,
  Table as TableIcon,
  Undo,
} from "lucide-react";

import { FormattedContent } from "@/components/ui/formatted-content";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function RichTextEditor({
  id,
  name,
  value,
  onChange,
  placeholder,
  rows = 6,
  disabled = false,
  error = false,
  className,
}: RichTextEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write");
  const [savedHeight, setSavedHeight] = React.useState<string | undefined>(undefined);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  const handleTabChange = React.useCallback(
    (tab: "write" | "preview") => {
      if (activeTab === "write" && textareaRef.current) {
        const currentStyleHeight = textareaRef.current.style.height;
        const currentOffsetHeight = textareaRef.current.offsetHeight
          ? `${textareaRef.current.offsetHeight}px`
          : undefined;
        const heightToPreserve = currentStyleHeight || currentOffsetHeight;
        if (heightToPreserve) {
          setSavedHeight(heightToPreserve);
        }
      }
      setActiveTab(tab);
    },
    [activeTab],
  );

  // Undo / Redo history state
  const [history, setHistory] = React.useState<string[]>([value || ""]);
  const [historyIndex, setHistoryIndex] = React.useState(0);

  const updateValueWithHistory = React.useCallback(
    (newValue: string) => {
      setHistory((prev) => {
        const next = [...prev.slice(0, historyIndex + 1), newValue];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      });
      setHistoryIndex((prev) => prev + 1);
      onChange(newValue);
    },
    [historyIndex, onChange],
  );

  const handleUndo = React.useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      onChange(history[newIdx]);
    }
  }, [history, historyIndex, onChange]);

  const handleRedo = React.useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      onChange(history[newIdx]);
    }
  }, [history, historyIndex, onChange]);

  // Text insertion helper
  const insertFormatting = React.useCallback(
    (prefix: string, suffix: string = "", placeholderText: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const contentToWrap = selectedText || placeholderText;

      const newText =
        value.substring(0, start) +
        prefix +
        contentToWrap +
        suffix +
        value.substring(end);

      updateValueWithHistory(newText);

      // Re-focus and select wrapped content
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorStart = start + prefix.length;
        const cursorEnd = cursorStart + contentToWrap.length;
        textarea.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [value, updateValueWithHistory],
  );

  // Line prefix helper (headings, blockquotes, lists)
  const applyLinePrefix = React.useCallback(
    (prefix: string, defaultText: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = value.substring(0, start);
      const textAfter = value.substring(end);
      const selectedText = value.substring(start, end);

      const isStartOfLine = start === 0 || value[start - 1] === "\n";
      const linePrefix = isStartOfLine ? prefix : `\n${prefix}`;
      const content = selectedText || defaultText;

      const newText = textBefore + linePrefix + content + textAfter;
      updateValueWithHistory(newText);

      requestAnimationFrame(() => {
        textarea.focus();
        const cursorStart = start + linePrefix.length;
        const cursorEnd = cursorStart + content.length;
        textarea.setSelectionRange(cursorStart, cursorEnd);
      });
    },
    [value, updateValueWithHistory],
  );

  // Action handlers
  const handleBold = () => insertFormatting("**", "**", "bold text");
  const handleItalic = () => insertFormatting("*", "*", "italic text");
  const handleInlineCode = () => insertFormatting("`", "`", "code");
  const handleCodeBlock = () => {
    const textarea = textareaRef.current;
    const selectedText = textarea ? value.substring(textarea.selectionStart, textarea.selectionEnd) : "";
    const code = selectedText || "// write or paste code here\nconsole.log('hello');";
    applyLinePrefix("```text\n", `${code}\n\`\`\``);
  };
  const handleHeading = (level: number = 3) => {
    const hashes = "#".repeat(level) + " ";
    applyLinePrefix(hashes, `Heading ${level}`);
  };
  const handleBulletList = () => applyLinePrefix("- ", "List item");
  const handleNumberedList = () => applyLinePrefix("1. ", "List item");
  const handleBlockquote = () => applyLinePrefix("> ", "Quote");
  const handleHorizontalRule = () => applyLinePrefix("\n---\n");
  const handleLink = () => insertFormatting("[", "](https://example.com)", "link text");
  const handleImage = () => insertFormatting("![", "](https://example.com/image.png)", "image description");
  const handleTable = () => {
    const tableTemplate = "\n| Column 1 | Column 2 |\n| --- | --- |\n| Item 1 | Item 2 |\n";
    applyLinePrefix(tableTemplate);
  };

  // Close overflow menu on outside click
  React.useEffect(() => {
    if (!showMoreMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-more-menu]")) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showMoreMenu]);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-xs transition-colors focus-within:border-[color:var(--color-primary)] focus-within:ring-3 focus-within:ring-[color:var(--color-primary)]/15 overflow-hidden",
        error && "border-[color:var(--color-danger)] focus-within:border-[color:var(--color-danger)] focus-within:ring-[color:var(--color-danger)]/15",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {/* Editor Header Bar: Write/Preview Tabs + Formatting Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)]/50 px-2 py-1.5 gap-1.5 select-none">
        {/* Write / Preview Tab Switcher */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleTabChange("write")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-tactile cursor-pointer",
              activeTab === "write"
                ? "bg-white text-[color:var(--color-primary)] shadow-xs"
                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
            )}
            title="Write Markdown content"
          >
            <PenLine className="size-3.5" />
            <span>Write</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("preview")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-tactile cursor-pointer",
              activeTab === "preview"
                ? "bg-white text-[color:var(--color-primary)] shadow-xs"
                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
            )}
            title="Preview formatted content"
          >
            <Eye className="size-3.5" />
            <span>Preview</span>
          </button>
        </div>

        {/* Toolbar Controls (Visible when activeTab === 'write') */}
        {activeTab === "write" && (
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* Heading */}
            <button
              type="button"
              onClick={() => handleHeading(3)}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Heading (###)"
              aria-label="Heading"
            >
              <Heading className="size-4" />
            </button>

            {/* Bold */}
            <button
              type="button"
              onClick={handleBold}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Bold (**text**)"
              aria-label="Bold"
            >
              <Bold className="size-4" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={handleItalic}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Italic (*text*)"
              aria-label="Italic"
            >
              <Italic className="size-4" />
            </button>

            {/* Inline Code */}
            <button
              type="button"
              onClick={handleInlineCode}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Inline code (`code`)"
              aria-label="Inline code"
            >
              <Code className="size-4" />
            </button>

            {/* Code Block */}
            <button
              type="button"
              onClick={handleCodeBlock}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Code block (```)"
              aria-label="Code block"
            >
              <FileCode className="size-4" />
            </button>

            {/* Link */}
            <button
              type="button"
              onClick={handleLink}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Insert Link ([text](url))"
              aria-label="Insert Link"
            >
              <LinkIcon className="size-4" />
            </button>

            {/* Bullet List */}
            <button
              type="button"
              onClick={handleBulletList}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Bulleted List (- item)"
              aria-label="Bulleted List"
            >
              <List className="size-4" />
            </button>

            {/* Numbered List */}
            <button
              type="button"
              onClick={handleNumberedList}
              className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
              title="Numbered List (1. item)"
              aria-label="Numbered List"
            >
              <ListOrdered className="size-4" />
            </button>

            <div className="h-4 w-px bg-[color:var(--color-border)] mx-1" />

            {/* More Overflow Menu Popover */}
            <div className="relative" data-more-menu>
              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="p-1.5 rounded-md text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-white transition-tactile active:scale-95 cursor-pointer"
                title="More formatting actions (Quote, Table, Image, Rule, Undo/Redo)"
                aria-label="More formatting options"
              >
                <MoreHorizontal className="size-4" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-20 w-48 rounded-xl border border-[color:var(--color-border)] bg-white p-1.5 shadow-md space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  {/* Blockquote */}
                  <button
                    type="button"
                    onClick={() => {
                      handleBlockquote();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] transition-colors cursor-pointer text-left"
                  >
                    <Quote className="size-3.5 text-[color:var(--color-primary)]" />
                    <span>Blockquote</span>
                  </button>

                  {/* Table */}
                  <button
                    type="button"
                    onClick={() => {
                      handleTable();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] transition-colors cursor-pointer text-left"
                  >
                    <TableIcon className="size-3.5 text-[color:var(--color-primary)]" />
                    <span>Markdown Table</span>
                  </button>

                  {/* Horizontal Rule */}
                  <button
                    type="button"
                    onClick={() => {
                      handleHorizontalRule();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] transition-colors cursor-pointer text-left"
                  >
                    <Minus className="size-3.5 text-[color:var(--color-primary)]" />
                    <span>Horizontal Rule</span>
                  </button>

                  {/* Image */}
                  <button
                    type="button"
                    onClick={() => {
                      handleImage();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] transition-colors cursor-pointer text-left"
                  >
                    <ImageIcon className="size-3.5 text-[color:var(--color-primary)]" />
                    <span>Image Link</span>
                  </button>

                  <div className="my-1 border-t border-[color:var(--color-border)]/60" />

                  {/* Undo */}
                  <button
                    type="button"
                    onClick={() => {
                      handleUndo();
                      setShowMoreMenu(false);
                    }}
                    disabled={historyIndex <= 0}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-left"
                  >
                    <Undo className="size-3.5" />
                    <span>Undo</span>
                  </button>

                  {/* Redo */}
                  <button
                    type="button"
                    onClick={() => {
                      handleRedo();
                      setShowMoreMenu(false);
                    }}
                    disabled={historyIndex >= history.length - 1}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-muted)] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer text-left"
                  >
                    <Redo className="size-3.5" />
                    <span>Redo</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor Body */}
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => updateValueWithHistory(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={savedHeight ? { height: savedHeight } : undefined}
        className={cn(
          "w-full resize-y bg-transparent px-4 py-3 text-sm text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] focus:outline-none font-mono leading-relaxed min-h-[140px]",
          activeTab !== "write" && "hidden",
        )}
      />

      {activeTab === "preview" && (
        <div
          style={{ minHeight: savedHeight || "140px" }}
          className="max-h-[400px] overflow-y-auto px-4 py-3 bg-[color:var(--color-surface)]"
        >
          {value.trim() ? (
            <FormattedContent content={value} />
          ) : (
            <p className="text-xs text-[color:var(--color-text-muted)] italic">
              Nothing to preview. Switch to &quot;Write&quot; tab to compose.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
