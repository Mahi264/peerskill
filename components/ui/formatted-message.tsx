import * as React from "react";

interface FormattedMessageProps {
  content: string;
  className?: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function FormattedMessage({ content, className = "" }: FormattedMessageProps) {
  // Split message by URLs to safely linkify without rendering arbitrary HTML
  const parts = content.split(URL_REGEX);

  return (
    <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:opacity-80 text-blue-600 dark:text-blue-400 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </div>
  );
}
