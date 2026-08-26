import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MessagesInboxPage from "@/app/(student)/messages/page";
import { StudentAuthProvider } from "@/components/auth/student-auth-context";

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

describe("Messages Inbox Page (app/(student)/messages/page.tsx)", () => {
  it("renders Campus Messages inbox with conversation list and last message previews", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/conversations")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  conversations: [
                    {
                      id: "conv-1",
                      createdAt: "2026-08-20T10:00:00.000Z",
                      updatedAt: "2026-08-20T10:05:00.000Z",
                      peer: {
                        id: "peer-1",
                        fullName: "Aarav Sharma",
                        avatarUrl: null,
                        branch: "CSE",
                        section: "A",
                        graduationYear: 2026,
                        isConnected: true,
                      },
                      lastMessage: {
                        id: "msg-1",
                        senderId: "peer-1",
                        body: "Hey, can you help with C++ pointers?",
                        createdAt: "2026-08-20T10:05:00.000Z",
                      },
                    },
                  ],
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
        React.createElement(MessagesInboxPage)
      )
    );

    expect(await screen.findByText(/Campus Messages/i)).toBeInTheDocument();
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Hey, can you help with C++ pointers?")).toBeInTheDocument();
  });
});
