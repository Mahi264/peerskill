import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import OnboardingPage from "@/app/onboarding/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("Onboarding Page Academic Identity UI (app/onboarding/page.tsx)", () => {
  it("renders verified identity, read-only batch year (2024), read-only branch (CSE), and no department or detection callouts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  user: {
                    id: "u-1",
                    email: "24cs10mo80@mitsgwl.ac.in",
                    status: "PENDING",
                    profile: {
                      fullName: "BTCS24O1080 MOHIT SHARMA",
                      branch: null,
                      graduationYear: null,
                    },
                    userSkills: [],
                  },
                },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response("{}", { status: 404 }));
      }),
    );

    const { container } = render(React.createElement(OnboardingPage));

    // Wait for auth load to resolve
    const nameHeading = await screen.findByText("MOHIT SHARMA");
    expect(nameHeading).toBeDefined();

    // 1. Verified Identity Badge
    expect(screen.getByText(/Verified via Google/i)).toBeDefined();

    // 2. Batch Year (2024) - read-only
    const batchInput = screen.getByDisplayValue("2024") as HTMLInputElement;
    expect(batchInput).toBeDefined();
    expect(batchInput.disabled).toBe(true);

    // 3. Branch / Program (CSE) - read-only
    const branchInput = screen.getByDisplayValue("Computer Science & Engineering (CSE)") as HTMLInputElement;
    expect(branchInput).toBeDefined();
    expect(branchInput.disabled).toBe(true);

    // 4. Department MUST NOT exist anywhere
    expect(screen.queryByText(/Department/i)).toBeNull();
    expect(container.textContent).not.toContain("Department");

    // 5. No obsolete detection callout banner
    expect(container.textContent).not.toContain("DETECTED FROM YOUR MITS STUDENT ID");

    // 6. No node connection SVG animation
    expect(container.querySelector(".animate-path-draw")).toBeNull();
    expect(container.querySelector(".animate-node-pulse")).toBeNull();
  });
});
