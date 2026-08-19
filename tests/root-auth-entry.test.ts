import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

import RootSignInPage from "@/app/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "error" ? null : null),
  }),
}));

describe("Root Public Sign-in Page (app/page.tsx)", () => {
  it("renders the minimal institutional PeerSkill sign-in page", async () => {
    // Mock fetch for /api/auth/me returning unauthenticated
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 })),
    );

    render(React.createElement(RootSignInPage));

    // Wait for session check to complete
    const heading = await screen.findByText("Sign in to PeerSkill");
    expect(heading).toBeDefined();

    // Verify exact button text
    const button = screen.getByRole("link", { name: /Sign in with Google/i });
    expect(button).toBeDefined();
    expect(button.getAttribute("href")).toBe("/api/auth/google");

    // Verify institutional text
    expect(screen.getByText("Sign up with your official MITS student Google account.")).toBeDefined();
    expect(screen.getByText(/Only official MITS Gwalior student accounts are permitted/i)).toBeDefined();

    // Verify NO email/password fields or separate Sign up / Log in buttons exist
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Sign up$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Log in$/i })).toBeNull();
  });
});
