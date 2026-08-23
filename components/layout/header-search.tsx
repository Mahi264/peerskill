"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface HeaderSearchProps {
  initialValue?: string;
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
}

export function HeaderSearch({
  initialValue = "",
  className,
  placeholder = "Search campus doubts & solutions...",
  onSearch,
  onClear,
}: HeaderSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState(initialValue);
  const [prevInitial, setPrevInitial] = React.useState(initialValue);

  if (prevInitial !== initialValue) {
    setPrevInitial(initialValue);
    setQuery(initialValue);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (onSearch) {
      onSearch(trimmed);
    } else if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  }

  function handleClear() {
    setQuery("");
    if (onClear) {
      onClear();
    } else if (onSearch) {
      onSearch("");
    } else {
      router.push("/search");
    }
  }

  return (
    <form
      role="search"
      aria-label="Search campus knowledge"
      onSubmit={handleSubmit}
      className={cn("relative flex items-center w-full max-w-md", className)}
    >
      <div className="absolute left-3 flex items-center pointer-events-none text-[color:var(--color-text-muted)]">
        <Search className="size-4" />
      </div>

      <Input
        type="text"
        role="searchbox"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search campus knowledge"
        className="w-full h-11 pl-9 pr-9 text-sm bg-white border-[color:var(--color-border)] rounded-[var(--radius-md)] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-muted)] shadow-sm focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
      />

      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search query"
          className="absolute right-2.5 size-7 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
