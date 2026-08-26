import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CampusPeerProfilePage from "@/app/(student)/users/[id]/page";
import { StudentAuthProvider } from "@/components/auth/student-auth-context";

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

describe("Campus Peer Profile Page (app/(student)/users/[id]/page.tsx)", () => {
  it("renders campus peer identity, academic metadata, skills, and neutral contribution stats", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/users/target-user-123")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  user: {
                    id: "target-user-123",
                    email: "aarav@mitsgwl.ac.in",
                    role: "STUDENT",
                    status: "ACTIVE",
                    createdAt: "2026-08-01T00:00:00.000Z",
                    profile: {
                      fullName: "Aarav Sharma",
                      avatarUrl: null,
                      branch: "CSE",
                      section: "A",
                      graduationYear: 2026,
                      bio: "Passionate about algorithms and operating systems.",
                      helpAvailable: true,
                      helpStatus: "Free to help with DSA Unit 2",
                      contactVisibility: "COLLEGE",
                      chatRequestVisibility: "COLLEGE",
                    },
                    skills: [
                      {
                        id: "skill-1",
                        name: "C++",
                        slug: "cpp",
                        level: "ADVANCED",
                      },
                      {
                        id: "skill-2",
                        name: "Data Structures",
                        slug: "data-structures",
                        level: "MENTOR",
                      },
                    ],
                    stats: {
                      doubtsCount: 4,
                      answersCount: 12,
                    },
                  },
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
            id: "viewer-123",
            email: "viewer@mitsgwl.ac.in",
            status: "ACTIVE",
          },
          initialProfile: {
            fullName: "Viewer Student",
            helpAvailable: true,
          },
        },
        React.createElement(CampusPeerProfilePage)
      )
    );

    // Profile header & metadata
    expect(await screen.findByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Available to Help")).toBeInTheDocument();
    expect(screen.getByText(/Free to help with DSA Unit 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Passionate about algorithms and operating systems/i)).toBeInTheDocument();

    // Skills
    expect(screen.getByText("C++")).toBeInTheDocument();
    expect(screen.getByText(/advanced/i)).toBeInTheDocument();
    expect(screen.getByText("Data Structures")).toBeInTheDocument();
    expect(screen.getByText(/mentor/i)).toBeInTheDocument();

    // Stats
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
