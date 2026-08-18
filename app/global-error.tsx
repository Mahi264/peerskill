"use client";

import * as React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-6 text-[#17201D]">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-xl border border-[#DCE3DF] shadow-sm">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-sm text-[#65716C]">
            An unexpected error occurred in the application.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-[#145C54] text-white rounded-lg text-sm font-medium hover:bg-[#0F4943] transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
