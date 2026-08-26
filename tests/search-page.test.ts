import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

import SearchPage from "@/app/(student)/search/page";
import { StudentAuthProvider } from "@/components/auth/student-auth-context";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => "/search",
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "q") return null;
      if (key === "status") return "ALL";
      if (key === "urgency") return "ALL";
      return null;
    },
    toString: () => "",
  }),
}));

describe("Dedicated Knowledge Search Page (app/(student)/search/page.tsx)", () => {
  it("renders the search input, tab switchers, and filter controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/search/knowledge")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  results: [],
                  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
                },
              }),
          });
        }

        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
        });
      })
    );

    render(
      React.createElement(
        StudentAuthProvider,
        {
          initialUser: {
            id: "user-1",
            email: "student@mitsgwl.ac.in",
            status: "ACTIVE",
          },
          initialProfile: {
            fullName: "Test Student",
            helpAvailable: true,
          },
        },
        React.createElement(SearchPage)
      )
    );

    expect(
      await screen.findByPlaceholderText(/Search campus doubts & solutions/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Campus Doubts & Solutions/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Campus Peers & Skills/i })).toBeInTheDocument();
  });
});
