import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminOverviewPage from "@/app/admin/page";
import AdminStudentsPage from "@/app/admin/students/page";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: vi.fn(),
  }),
  usePathname: () => "/admin",
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
}));

describe("Admin Pages (Frontend)", () => {
  it("renders Admin Overview dashboard with platform KPIs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  principalType: "ADMIN",
                  admin: {
                    id: "adm-1",
                    email: "admin@peerskill.internal",
                    displayName: "Lead Administrator",
                  },
                },
              }),
              { status: 200 },
            ),
          );
        }

        if (url.includes("/api/admin/overview")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  stats: {
                    totalStudents: 150,
                    activeStudents: 140,
                    pendingStudents: 10,
                    totalDoubts: 80,
                    resolvedDoubts: 60,
                    totalAnswers: 120,
                    acceptedAnswers: 60,
                    totalConnections: 55,
                    totalConversations: 30,
                    totalPredefinedSkills: 25,
                  },
                },
              }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));
      }),
    );

    render(React.createElement(AdminOverviewPage));

    expect(await screen.findByText("Platform Overview")).toBeInTheDocument();
    expect(await screen.findByText("150")).toBeInTheDocument();
    expect(screen.getByText("140")).toBeInTheDocument();
    expect(screen.getByText("Total Registered")).toBeInTheDocument();
  });

  it("renders Admin Student Directory with student roster", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/auth/me")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  principalType: "ADMIN",
                  admin: {
                    id: "adm-1",
                    email: "admin@peerskill.internal",
                    displayName: "Lead Administrator",
                  },
                },
              }),
              { status: 200 },
            ),
          );
        }

        if (url.includes("/api/admin/students")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: {
                  students: [
                    {
                      id: "usr-1",
                      fullName: "Rahul Verma",
                      email: "24cs10mo80@mitsgwl.ac.in",
                      branch: "Computer Science & Engineering (CSE)",
                      section: "A",
                      graduationYear: 2028,
                      status: "ACTIVE",
                      doubtsCount: 3,
                      answersCount: 5,
                      skillsCount: 4,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                  },
                },
              }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));
      }),
    );

    render(React.createElement(AdminStudentsPage));

    expect(await screen.findByText("Student Directory")).toBeInTheDocument();
    expect(await screen.findByText("Rahul Verma")).toBeInTheDocument();
    expect(screen.getByText("24cs10mo80@mitsgwl.ac.in")).toBeInTheDocument();
  });
});
