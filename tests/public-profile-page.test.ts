import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CampusPeerProfilePage from "@/app/users/[id]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({
    id: "target-user-123",
  }),
  usePathname: () => "/users/target-user-123",
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
}));

describe("Campus Peer Profile Page (app/users/[id]/page.tsx)", () => {
  it("renders campus peer identity, academic metadata, skills, and neutral contribution stats", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  user: { id: "viewer-1", email: "viewer@mitsgwl.ac.in", status: "ACTIVE" },
                  profile: { fullName: "Viewer User", department: "IT" },
                },
              }),
              { status: 200 },
            ),
          );
        }

        if (url.includes("/api/users/target-user-123")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  user: {
                    id: "target-user-123",
                    status: "ACTIVE",
                    createdAt: new Date().toISOString(),
                    profile: {
                      fullName: "Mohit Sharma",
                      avatarUrl: null,
                      department: "Computer Science",
                      branch: "CSE",
                      graduationYear: 2027,
                      bio: "Passionate about Next.js and algorithms.",
                      helpAvailable: true,
                      helpStatus: "Free after 5 PM",
                    },
                    skills: [
                      { id: "s1", name: "C++", slug: "c-plus-plus", level: "ADVANCED" },
                      { id: "s2", name: "React", slug: "react", level: "INTERMEDIATE" },
                    ],
                    stats: {
                      doubtsCount: 4,
                      answersCount: 6,
                    },
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

    render(React.createElement(CampusPeerProfilePage));

    // Full name and availability badge
    const nameHeading = await screen.findByText("Mohit Sharma");
    expect(nameHeading).toBeDefined();
    expect(screen.getByText("Available to help")).toBeDefined();

    // Department & academic info
    expect(screen.getByText(/Computer Science/i)).toBeDefined();
    expect(screen.getByText(/Class of 2027/i)).toBeDefined();

    // Bio
    expect(screen.getByText(/"Passionate about Next\.js and algorithms\."/i)).toBeDefined();

    // Help status note
    expect(screen.getByText("Free after 5 PM")).toBeDefined();

    // Skills
    expect(screen.getByText("C++")).toBeDefined();
    expect(screen.getByText("advanced")).toBeDefined();
    expect(screen.getByText("React")).toBeDefined();
    expect(screen.getByText("intermediate")).toBeDefined();

    // Stats
    expect(screen.getByText("Doubts Asked")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("Answers Contributed")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
  });
});
