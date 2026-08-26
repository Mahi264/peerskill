import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConversationDetailPage from "@/app/(student)/messages/[id]/page";
import { StudentAuthProvider } from "@/components/auth/student-auth-context";

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

describe("Conversation Detail Page (app/(student)/messages/[id]/page.tsx)", () => {
  it("renders conversation header, messages, and active composer when connected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/conversations/conv-123/messages")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  messages: [
                    {
                      id: "msg-1",
                      conversationId: "conv-123",
                      senderId: "peer-1",
                      body: "Hello! Let's discuss DSA assignment.",
                      createdAt: "2026-08-20T10:00:00.000Z",
                      isSelf: false,
                    },
                    {
                      id: "msg-2",
                      conversationId: "conv-123",
                      senderId: "user-1",
                      body: "Sure, see https://github.com/example/repo",
                      createdAt: "2026-08-20T10:01:00.000Z",
                      isSelf: true,
                    },
                  ],
                },
              }),
          });
        }

        if (url.includes("/api/conversations/conv-123")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  conversation: {
                    id: "conv-123",
                    createdAt: "2026-08-20T10:00:00.000Z",
                    updatedAt: "2026-08-20T10:01:00.000Z",
                    peer: {
                      id: "peer-1",
                      fullName: "Aarav Sharma",
                      avatarUrl: null,
                      branch: "CSE",
                      section: "A",
                      graduationYear: 2026,
                      isConnected: true,
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
            id: "user-1",
            email: "student@mitsgwl.ac.in",
            status: "ACTIVE",
          },
          initialProfile: {
            fullName: "Test Student",
            helpAvailable: true,
          },
        },
        React.createElement(ConversationDetailPage)
      )
    );

    expect(await screen.findByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Hello! Let's discuss DSA assignment.")).toBeInTheDocument();
    expect(screen.getByText("https://github.com/example/repo")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message Aarav Sharma...")).toBeInTheDocument();
  });
});
