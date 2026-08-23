import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Validates a URL to prevent XSS (e.g. javascript:, data:, vbscript:).
 * Only allows http:, https:, mailto:, or relative path urls.
 */
export function isSafeUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (!clean) return false;

  // Relative links
  if (clean.startsWith("/") || clean.startsWith("#")) return true;

  // Mailto links
  if (clean.startsWith("mailto:")) return true;

  // Safe protocols
  try {
    const parsed = new URL(clean);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Renders inline formatting (bold, italic, inline code, links, images).
 */
function renderInlineFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  // Regex to match inline tokens:
  // 1. Images: !\[([^\]]*)\]\(([^)]+)\)
  // 2. Links: \[([^\]]+)\]\(([^)]+)\)
  // 3. Inline code: `([^`]+)`
  // 4. Bold: \*\*([^*]+)\*\* or __([^_]+)__
  // 5. Italic: \*([^*]+)\* or _([^_]+)_
  const inlineRegex =
    /(!?\[([^\]]*)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*|__([^_]+)__)|(\*([^*]+)\*|_([^_]+)_)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Append plain text before match
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith("![") && match[3]) {
      // Image: ![alt](url)
      const alt = match[2] || "Image attachment";
      const src = match[3].trim();
      if (isSafeUrl(src)) {
        elements.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${keyPrefix}-img-${index++}`}
            src={src}
            alt={alt}
            className="my-3 max-h-80 max-w-full rounded-lg border border-[color:var(--color-border)] object-contain shadow-xs"
            loading="lazy"
          />,
        );
      } else {
        elements.push(`[Image: ${alt} (unsafe url)]`);
      }
    } else if (fullMatch.startsWith("[") && match[2] && match[3]) {
      // Link: [text](url)
      const linkText = match[2];
      const url = match[3].trim();
      if (isSafeUrl(url)) {
        elements.push(
          <a
            key={`${keyPrefix}-a-${index++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[color:var(--color-primary)] underline decoration-[color:var(--color-primary)]/40 underline-offset-2 hover:decoration-[color:var(--color-primary)] transition-colors break-words"
          >
            {linkText}
          </a>,
        );
      } else {
        elements.push(linkText);
      }
    } else if (fullMatch.startsWith("`") && match[5]) {
      // Inline Code: `code`
      elements.push(
        <code
          key={`${keyPrefix}-code-${index++}`}
          className="rounded-md bg-[color:var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[0.875em] text-[color:var(--color-text)] border border-[color:var(--color-border)]/60 font-semibold"
        >
          {match[5]}
        </code>,
      );
    } else if ((fullMatch.startsWith("**") || fullMatch.startsWith("__")) && (match[7] || match[8])) {
      // Bold: **text** or __text__
      elements.push(
        <strong key={`${keyPrefix}-b-${index++}`} className="font-bold text-[color:var(--color-text)]">
          {match[7] || match[8]}
        </strong>,
      );
    } else if ((fullMatch.startsWith("*") || fullMatch.startsWith("_")) && (match[10] || match[11])) {
      // Italic: *text* or _text_
      elements.push(
        <em key={`${keyPrefix}-i-${index++}`} className="italic text-[color:var(--color-text)]">
          {match[10] || match[11]}
        </em>,
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

export interface FormattedContentProps extends React.ComponentProps<"div"> {
  content: string;
}

/**
 * Safely renders markdown-formatted content or plain text with rich components
 * (Headings, Code Blocks, Inline Code, Lists, Tables, Blockquotes, Links, and Images).
 * Protects against XSS by strictly escaping raw HTML and rejecting unsafe URLs.
 */
export function FormattedContent({ content, className, ...props }: FormattedContentProps) {
  if (!content || typeof content !== "string") {
    return null;
  }

  // Normalize line endings
  const rawText = content.replace(/\r\n/g, "\n");

  // Split content into major blocks (code blocks, tables, lists, blockquotes, headings, paragraphs)
  const lines = rawText.split("\n");
  const blockNodes: React.ReactNode[] = [];
  let i = 0;
  let blockIndex = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block: ```lang ... ```
    if (line.trim().startsWith("```")) {
      const langMatch = line.trim().match(/^```([a-zA-Z0-9_-]*)/);
      const language = langMatch && langMatch[1] ? langMatch[1] : "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      // Skip closing ```
      i++;

      blockNodes.push(
        <div
          key={`code-block-${blockIndex++}`}
          className="my-3 overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[#17201D] text-[#EEF3F2] shadow-xs"
        >
          {language && (
            <div className="flex items-center justify-between border-b border-[#2C3834] bg-[#121917] px-4 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A0AFA9]">
              <span>{language}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-4 font-mono text-xs sm:text-sm leading-relaxed text-[#F7F6F2]">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }

    // 2. Horizontal Rule: --- or ***
    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
      blockNodes.push(
        <hr
          key={`hr-${blockIndex++}`}
          className="my-4 border-t border-[color:var(--color-border)]"
        />,
      );
      i++;
      continue;
    }

    // 3. Headings: # H1, ## H2, ### H3, #### H4
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const inline = renderInlineFormatting(text, `h-${blockIndex}`);

      if (level === 1) {
        blockNodes.push(
          <h2
            key={`h1-${blockIndex++}`}
            className="text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--color-text)] mt-4 mb-2 first:mt-0"
          >
            {inline}
          </h2>,
        );
      } else if (level === 2) {
        blockNodes.push(
          <h3
            key={`h2-${blockIndex++}`}
            className="text-lg sm:text-xl font-bold text-[color:var(--color-text)] mt-3 mb-1.5 first:mt-0"
          >
            {inline}
          </h3>,
        );
      } else {
        blockNodes.push(
          <h4
            key={`h3-${blockIndex++}`}
            className="text-base sm:text-lg font-bold text-[color:var(--color-text)] mt-3 mb-1.5 first:mt-0"
          >
            {inline}
          </h4>,
        );
      }
      i++;
      continue;
    }

    // 4. Blockquote: > text
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      const quoteText = quoteLines.join("\n");

      blockNodes.push(
        <blockquote
          key={`quote-${blockIndex++}`}
          className="my-3 border-l-4 border-[color:var(--color-primary)] bg-[color:var(--color-surface-muted)]/40 px-4 py-2 text-sm text-[color:var(--color-text)] rounded-r-lg"
        >
          {renderInlineFormatting(quoteText, `quote-${blockIndex}`)}
        </blockquote>,
      );
      continue;
    }

    // 5. Table: | Col 1 | Col 2 | ...
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        // Row 1 is divider | --- | --- |
        const bodyRows = tableLines.slice(2).map(parseRow);

        blockNodes.push(
          <div
            key={`table-${blockIndex++}`}
            className="my-3 overflow-x-auto rounded-xl border border-[color:var(--color-border)] bg-white shadow-xs"
          >
            <table className="min-w-full divide-y divide-[color:var(--color-border)] text-left text-xs sm:text-sm">
              <thead className="bg-[color:var(--color-surface-muted)] font-semibold text-[color:var(--color-text)]">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={`th-${hIdx}`} className="px-4 py-2.5 font-bold">
                      {renderInlineFormatting(h, `th-${hIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]/60">
                {bodyRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-[color:var(--color-surface-muted)]/20">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${rIdx}-${cIdx}`} className="px-4 py-2 text-[color:var(--color-text)]">
                        {renderInlineFormatting(cell, `td-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // 6. Bulleted List: - item or * item
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }

      blockNodes.push(
        <ul key={`ul-${blockIndex++}`} className="my-2 list-disc space-y-1 pl-6 text-sm text-[color:var(--color-text)]">
          {listItems.map((item, idx) => (
            <li key={`li-${idx}`}>{renderInlineFormatting(item, `ul-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // 7. Numbered List: 1. item
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }

      blockNodes.push(
        <ol
          key={`ol-${blockIndex++}`}
          className="my-2 list-decimal space-y-1 pl-6 text-sm text-[color:var(--color-text)]"
        >
          {listItems.map((item, idx) => (
            <li key={`oli-${idx}`}>{renderInlineFormatting(item, `ol-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // 8. Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // 9. Standard Paragraphs
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(\s*[-*_]\s*){3,}$/.test(lines[i].trim()) &&
      !lines[i].match(/^#{1,4}\s+/) &&
      !lines[i].trim().startsWith(">") &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    blockNodes.push(
      <p
        key={`p-${blockIndex++}`}
        className="my-2 text-sm sm:text-base leading-relaxed text-[color:var(--color-text)] whitespace-pre-wrap break-words"
      >
        {renderInlineFormatting(paraLines.join("\n"), `p-${blockIndex}`)}
      </p>,
    );
  }

  return (
    <div className={cn("space-y-1 text-[color:var(--color-text)]", className)} {...props}>
      {blockNodes}
    </div>
  );
}
