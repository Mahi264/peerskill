import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConnectionsPage from "@/app/(student)/connections/page";
import { StudentAuthProvider } from "@/components/auth/student-auth-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/connections",
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
}));

describe("Connections Page (app/(student)/connections/page.tsx)", () => {
  it("renders Connected, Incoming, and Outgoing tabs and displays peer connection data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/connections")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  connected: [
                    {
                      id: "conn-1",
                      connectedAt: "2026-08-20T10:00:00.000Z",
                      peer: {
                        id: "peer-1",
                        fullName: "Aarav Sharma",
                        avatarUrl: null,
                        branch: "CSE",
                        section: "A",
                        graduationYear: 2026,
                        bio: "Passionate about algorithms.",
                        helpAvailable: true,
                        helpStatus: "Free for DSA doubts",
                        skills: [
                          {
                            id: "s-1",
                            name: "C++",
                            slug: "cpp",
                            level: "ADVANCED",
                          },
                        ],
                      },
                    },
                  ],
                  incoming: [
                    {
                      id: "conn-2",
                      createdAt: "2026-08-21T11:00:00.000Z",
                      requester: {
                        id: "peer-2",
                        fullName: "Priya Patel",
                        avatarUrl: null,
                        branch: "IT",
                        section: "B",
                        graduationYear: 2027,
                        bio: null,
                        helpAvailable: true,
                        skills: [],
                      },
                    },
                  ],
                  outgoing: [
                    {
                      id: "conn-3",
                      createdAt: "2026-08-22T12:00:00.000Z",
                      receiver: {
                        id: "peer-3",
                        fullName: "Rohan Gupta",
                        avatarUrl: null,
                        branch: "ECE",
                        section: "A",
                        graduationYear: 2026,
                        bio: null,
                        helpAvailable: false,
                        skills: [],
                      },
                    },
                  ],
                  counts: {
                    connected: 1,
                    incoming: 1,
                    outgoing: 1,
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
            id: "user-1",
            email: "student@mitsgwl.ac.in",
            status: "ACTIVE",
          },
          initialProfile: {
            fullName: "Test Student",
            helpAvailable: true,
          },
        },
        React.createElement(ConnectionsPage)
      )
    );

    // Connected tab is default active
    expect(await screen.findByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Passionate about algorithms/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /message/i })).toBeInTheDocument();

    // Click Incoming Requests Tab
    const incomingTab = screen.getByRole("button", { name: /incoming/i });
    fireEvent.click(incomingTab);
    expect(await screen.findByText("Priya Patel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();

    // Click Outgoing Requests Tab
    const outgoingTab = screen.getByRole("button", { name: /outgoing/i });
    fireEvent.click(outgoingTab);
    expect(await screen.findByText("Rohan Gupta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel request/i })).toBeInTheDocument();
  });
});
