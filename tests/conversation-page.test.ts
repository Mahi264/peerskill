import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConversationDetailPage from "@/app/messages/[id]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({
    id: "conv-123",
  }),
  usePathname: () => "/messages/conv-123",
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
}));

describe("Conversation Detail Page (app/messages/[id]/page.tsx)", () => {
  it("renders conversation header, messages, and active composer when connected", async () => {
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

        if (url.includes("/api/conversations/conv-123/messages")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  messages: [
                    {
                      id: "m-1",
                      conversationId: "conv-123",
                      senderId: "viewer-1",
                      body: "Hi Bob, check this out: https://mitsgwl.ac.in",
                      createdAt: new Date().toISOString(),
                      isSelf: true,
                    },
                    {
                      id: "m-2",
                      conversationId: "conv-123",
                      senderId: "peer-1",
                      body: "Thanks! That helps a lot.",
                      createdAt: new Date().toISOString(),
                      isSelf: false,
                    },
                  ],
                },
              }),
              { status: 200 }
            )
          );
        }

        if (url.includes("/api/conversations/conv-123")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  conversation: {
                    id: "conv-123",
                    peer: {
                      id: "peer-1",
                      fullName: "Bob Patel",
                      avatarUrl: null,
                      branch: "Information Technology (IT)",
                      section: "B",
                      graduationYear: 2028,
                      isConnected: true,
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
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

    render(React.createElement(ConversationDetailPage));

    expect(await screen.findByText("Bob Patel")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Thanks! That helps a lot.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Message Bob Patel\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send/i })).toBeInTheDocument();
  });
});
