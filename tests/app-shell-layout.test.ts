import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/shell/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("AppShell Responsive Layout & Bottom Navigation Spacing", () => {
  it("renders main container with explicit responsive bottom padding preventing bottom-nav overlap", () => {
    const { container } = render(
      React.createElement(
        AppShell as unknown as React.ComponentType<{
          user?: { email: string; status: string };
          profile?: { fullName: string; department: string };
          children?: React.ReactNode;
        }>,
        {
          user: { email: "student@mitsgwl.ac.in", status: "ACTIVE" },
          profile: { fullName: "Aarav Sharma", department: "Computer Science" },
        },
        React.createElement("div", { "data-testid": "page-content" }, "Page Content"),
      ),
    );

    const main = container.querySelector("main");
    expect(main).toBeDefined();
    expect(main?.className).toContain("pb-24");
    expect(main?.className).toContain("sm:pb-28");
    expect(main?.className).toContain("md:pb-8");
    expect(main?.className).toContain("lg:pb-8");

    // Check BottomNav exists with accessible navigation label
    const nav = screen.getByRole("navigation", { name: /Mobile Navigation/i });
    expect(nav).toBeDefined();
    expect(nav.className).toContain("fixed");
    expect(nav.className).toContain("bottom-0");
    expect(nav.className).toContain("md:hidden");
  });

  it("renders children without navigation when showNav is false", () => {
    const { container } = render(
      React.createElement(
        AppShell as unknown as React.ComponentType<{
          showNav?: boolean;
          children?: React.ReactNode;
        }>,
        { showNav: false },
        React.createElement("div", { "data-testid": "auth-content" }, "Auth Screen"),
      ),
    );

    expect(screen.getByTestId("auth-content")).toBeDefined();
    expect(container.querySelector("nav")).toBeNull();
  });
});
