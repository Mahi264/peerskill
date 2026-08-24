import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MessagesInboxPage from "@/app/messages/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/messages",
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
}));

describe("Messages Inbox Page (app/messages/page.tsx)", () => {
  it("renders Campus Messages inbox with conversation list and last message previews", async () => {
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

        if (url.includes("/api/conversations")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  conversations: [
                    {
                      id: "conv-1",
                      peer: {
                        id: "peer-1",
                        fullName: "Priya Verma",
                        avatarUrl: null,
                        branch: "Computer Science & Engineering (CSE)",
                        section: "A",
                        graduationYear: 2028,
                        isConnected: true,
                      },
                      lastMessage: {
                        id: "msg-1",
                        senderId: "peer-1",
                        body: "Hey, can you explain the database question?",
                        createdAt: new Date().toISOString(),
                      },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                },
              }),
              { status: 200 }
            )
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));
      })
    );

    render(React.createElement(MessagesInboxPage));

    expect(await screen.findByText("Campus Messages")).toBeInTheDocument();
    expect(await screen.findByText("Priya Verma")).toBeInTheDocument();
    expect(screen.getByText("Hey, can you explain the database question?")).toBeInTheDocument();
  });
});
