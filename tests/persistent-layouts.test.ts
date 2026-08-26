import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminShell } from "@/components/admin/admin-shell";
import { StudentAuthProvider, useStudentAuth } from "@/components/auth/student-auth-context";
import { AppShell } from "@/components/shell/app-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => "/home",
}));

function ConsumerComponent() {
  const { user, profile } = useStudentAuth();
  return React.createElement(
    "div",
    { "data-testid": "consumer" },
    `User: ${user?.email}, Name: ${profile?.fullName}`
  );
}

describe("Persistent Next.js App Router Layouts & Auth Deduplication", () => {
  it("StudentAuthProvider immediately initializes with initialUser & initialProfile without firing /api/auth/me", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      React.createElement(
        StudentAuthProvider,
        {
          initialUser: {
            id: "user-123",
            email: "student@mitsgwl.ac.in",
            status: "ACTIVE",
          },
          initialProfile: {
            fullName: "Aarav Sharma",
            helpAvailable: true,
          },
        },
        React.createElement(ConsumerComponent)
      )
    );

    // Context consumer renders immediately from server props
    expect(screen.getByTestId("consumer")).toHaveTextContent(
      "User: student@mitsgwl.ac.in, Name: Aarav Sharma"
    );

    // No client auth fetch fired on initial mount
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AppShell automatically connects with StudentAuthProvider to render persistent sidebar and header", () => {
    render(
      React.createElement(
        StudentAuthProvider,
        {
          initialUser: {
            id: "user-123",
            email: "student@mitsgwl.ac.in",
            status: "ACTIVE",
          },
          initialProfile: {
            fullName: "Aarav Sharma",
            helpAvailable: true,
          },
        },
        React.createElement(
          AppShell,
          null,
          React.createElement("div", { "data-testid": "child-page" }, "Home Dashboard")
        )
      )
    );

    expect(screen.getByTestId("child-page")).toHaveTextContent("Home Dashboard");
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Mobile Navigation/i })).toBeInTheDocument();
  });

  it("AdminShell initializes immediately when initialAdmin is provided without client auth loading screen", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      React.createElement(
        AdminShell,
        {
          initialAdmin: {
            id: "admin-123",
            email: "admin@peerskill.org",
            displayName: "Platform Admin",
          },
        },
        React.createElement("div", { "data-testid": "admin-child" }, "Admin Content")
      )
    );

    expect(screen.getByTestId("admin-child")).toHaveTextContent("Admin Content");
    expect(screen.getByText("Platform Admin")).toBeInTheDocument();
    expect(screen.queryByText(/Verifying administrative session/i)).toBeNull();

    // No auth fetch needed because server resolved admin principal
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
