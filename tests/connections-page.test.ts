import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConnectionsPage from "@/app/connections/page";

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

describe("Connections Page (app/connections/page.tsx)", () => {
  it("renders Connected, Incoming, and Outgoing tabs and displays peer connection data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  user: { id: "viewer-1", email: "viewer@mitsgwl.ac.in", status: "ACTIVE" },
                  profile: { fullName: "Viewer Student" },
                },
              }),
              { status: 200 }
            )
          );
        }

        if (url.includes("/api/connections")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  connected: [
                    {
                      id: "conn-1",
                      connectedAt: new Date().toISOString(),
                      peer: {
                        id: "peer-1",
                        fullName: "Priya Sharma",
                        avatarUrl: null,
                        branch: "Computer Science & Engineering (CSE)",
                        section: "A",
                        graduationYear: 2028,
                        bio: "Coding enthusiast",
                        helpAvailable: true,
                        skills: [{ id: "sk1", name: "React", slug: "react", level: "ADVANCED" }],
                      },
                    },
                  ],
                  incoming: [
                    {
                      id: "conn-2",
                      createdAt: new Date().toISOString(),
                      requester: {
                        id: "peer-2",
                        fullName: "Amit Patel",
                        avatarUrl: null,
                        branch: "Information Technology (IT)",
                        section: "B",
                        graduationYear: 2028,
                        bio: null,
                        helpAvailable: true,
                        skills: [{ id: "sk2", name: "Python", slug: "python", level: "INTERMEDIATE" }],
                      },
                    },
                  ],
                  outgoing: [
                    {
                      id: "conn-3",
                      createdAt: new Date().toISOString(),
                      receiver: {
                        id: "peer-3",
                        fullName: "Rahul Verma",
                        avatarUrl: null,
                        branch: "Civil Engineering",
                        section: null,
                        graduationYear: 2027,
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
              { status: 200 }
            )
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));
      })
    );

    render(React.createElement(ConnectionsPage));

    // Check header
    expect(await screen.findByText("Campus Connections")).toBeInTheDocument();

    // Check connected tab item
    expect(await screen.findByText("Priya Sharma")).toBeInTheDocument();
    expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);

    // Switch to Incoming tab
    const incomingTab = screen.getByRole("button", { name: /Incoming Requests/i });
    fireEvent.click(incomingTab);

    expect(await screen.findByText("Amit Patel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Decline/i })).toBeInTheDocument();

    // Switch to Outgoing tab
    const outgoingTab = screen.getByRole("button", { name: /Outgoing Requests/i });
    fireEvent.click(outgoingTab);

    expect(await screen.findByText("Rahul Verma")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel Request/i })).toBeInTheDocument();
  });
});
