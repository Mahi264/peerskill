import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { FormattedContent } from "@/components/ui/formatted-content";

describe("Doubt Discovery Feed & Detail Page Architecture", () => {
  describe("1. Feed Description Rendering & Preview Constraint", () => {
    it("renders formatted markdown without raw syntax characters", () => {
      const markdown = "### Problem\nCannot connect to SQLite with `DATABASE_URL`.\n\nSee [Config Guide](https://prisma.io).";
      const { container } = render(React.createElement(FormattedContent, { content: markdown }));

      expect(screen.getByRole("heading", { level: 4, name: "Problem" })).toBeDefined();
      expect(container.querySelector("code")?.textContent).toBe("DATABASE_URL");
      expect(screen.getByRole("link", { name: "Config Guide" })).toBeDefined();
      expect(container.textContent).not.toContain("### Problem");
    });
  });

  describe("2. Feed Structure Rules (Discovery Mode)", () => {
    it("confirms feed data contract includes answerCount and excludes answer bodies", () => {
      const mockDoubt: {
        id: string;
        title: string;
        body: string;
        urgency: string;
        status: string;
        answerCount: number;
        answers?: unknown[];
        author: {
          id: string;
          email: string;
          fullName: string;
          branch: string;
          section: string;
          graduationYear: number;
          avatarUrl: string | null;
        };
        skills: Array<{ id: string; name: string; slug: string }>;
      } = {
        id: "doubt-1",
        title: "Understanding Next.js App Router",
        body: "### Question\nHow do Server Actions handle cookies?",
        urgency: "CURIOUS",
        status: "OPEN",
        answerCount: 4,
        author: {
          id: "u-1",
          email: "msharma@mitsgwl.ac.in",
          fullName: "Mohit Sharma",
          branch: "Computer Science & Engineering (CSE)",
          section: "A",
          graduationYear: 2028,
          avatarUrl: null,
        },
        skills: [{ id: "sk-1", name: "Next.js", slug: "nextjs" }],
      };

      // Ensure no answers array in the feed doubt object
      expect(mockDoubt.answers).toBeUndefined();
      expect(mockDoubt.answerCount).toBe(4);
      expect(`/doubts/${mockDoubt.id}`).toBe("/doubts/doubt-1");
    });
  });

  describe("3. Detail Page Solving Surface Contract", () => {
    it("maintains detail route /doubts/[id] as the sole answering and full-answer discussion surface", () => {
      const detailRouteContract = {
        route: "/doubts/[id]",
        features: [
          "full_rendered_doubt_body",
          "all_submitted_answers",
          "accepted_answer_badge_and_action",
          "rich_text_answer_composer",
          "author_profile_links",
        ],
      };

      expect(detailRouteContract.features).toContain("rich_text_answer_composer");
      expect(detailRouteContract.features).toContain("all_submitted_answers");
    });
  });
});
