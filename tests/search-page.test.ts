import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

import SearchPage from "@/app/search/page";

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

describe("Dedicated Knowledge Search Page (app/search/page.tsx)", () => {
  it("renders the initial state when q is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  user: { id: "u-1", email: "user@mitsgwl.ac.in", status: "ACTIVE" },
                  profile: { fullName: "Aarav Sharma" },
                },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ data: { doubts: [] } }), { status: 200 }));
      }),
    );

    render(React.createElement(SearchPage));

    // Wait for auth check to finish and page to render
    const heading = await screen.findByText("Search campus knowledge");
    expect(heading).toBeDefined();

    expect(screen.getByText(/Try a course, error message, concept, or skill/i)).toBeDefined();
    expect(screen.getByText("Popular Queries")).toBeDefined();

    // Verify user profile name and avatar initials render in AppSidebar & AppHeader
    expect(screen.getByText("Aarav Sharma")).toBeDefined();
    expect(screen.getAllByText("AS").length).toBeGreaterThan(0);
  });
});
