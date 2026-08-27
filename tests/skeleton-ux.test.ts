import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "@/components/ui/skeleton";
import { HomeFeedSkeleton } from "@/components/skeletons/home-feed-skeleton";
import {
  KnowledgeSearchSkeleton,
  PeerSearchSkeleton,
} from "@/components/skeletons/search-skeletons";
import { ConnectionsListSkeleton } from "@/components/skeletons/connection-skeletons";
import {
  InboxListSkeleton,
  ConversationDetailSkeleton,
} from "@/components/skeletons/messaging-skeletons";
import { DoubtDetailSkeleton } from "@/components/skeletons/doubt-detail-skeleton";
import { PublicProfileSkeleton } from "@/components/skeletons/public-profile-skeleton";

describe("Base Skeleton Component", () => {
  it("renders with default shimmer and token classes", () => {
    const { container } = render(React.createElement(Skeleton, { className: "h-4 w-32" }));
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("skeleton-shimmer");
    expect(el).toHaveClass("bg-[color:var(--color-surface-muted)]");
    expect(el).toHaveClass("h-4");
    expect(el).toHaveClass("w-32");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("supports disabling shimmer via prop", () => {
    const { container } = render(React.createElement(Skeleton, { className: "h-4 w-32", shimmer: false }));
    const el = container.firstChild as HTMLElement;
    expect(el).not.toHaveClass("skeleton-shimmer");
    expect(el).toHaveClass("bg-[color:var(--color-surface-muted)]");
  });

  it("passes arbitrary HTML attributes cleanly", () => {
    const { container } = render(
      React.createElement(Skeleton, { id: "test-skel", title: "placeholder" }),
    );
    const el = container.querySelector("#test-skel");
    expect(el).toBeInTheDocument();
    expect(el?.getAttribute("title")).toBe("placeholder");
  });
});

describe("HomeFeedSkeleton", () => {
  it("renders accessible status container with specified card count", () => {
    render(React.createElement(HomeFeedSkeleton, { count: 3 }));
    const statusContainer = screen.getByRole("status");
    expect(statusContainer).toBeInTheDocument();
    expect(statusContainer).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading campus doubt feed/i)).toBeInTheDocument();
  });
});

describe("Search Skeletons", () => {
  it("renders KnowledgeSearchSkeleton correctly", () => {
    render(React.createElement(KnowledgeSearchSkeleton, { count: 2 }));
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/searching campus doubts/i)).toBeInTheDocument();
  });

  it("renders PeerSearchSkeleton in responsive grid", () => {
    render(React.createElement(PeerSearchSkeleton, { count: 4 }));
    const status = screen.getByRole("status");
    expect(status).toHaveClass("grid");
    expect(screen.getByText(/searching campus peers/i)).toBeInTheDocument();
  });
});

describe("ConnectionsListSkeleton", () => {
  it("renders connections grid with accessible status text", () => {
    render(React.createElement(ConnectionsListSkeleton, { count: 4 }));
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading campus connections/i)).toBeInTheDocument();
  });
});

describe("Messaging Skeletons", () => {
  it("renders InboxListSkeleton with status announcement", () => {
    render(React.createElement(InboxListSkeleton, { count: 3 }));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(screen.getByText(/loading conversations inbox/i)).toBeInTheDocument();
  });

  it("renders ConversationDetailSkeleton with header, bubbles, and composer outline", () => {
    render(React.createElement(ConversationDetailSkeleton));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(screen.getByText(/loading conversation messages/i)).toBeInTheDocument();
  });
});

describe("DoubtDetailSkeleton", () => {
  it("renders doubt detail card and answers placeholder", () => {
    render(React.createElement(DoubtDetailSkeleton));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(screen.getByText(/loading doubt discussion and answers/i)).toBeInTheDocument();
  });
});

describe("PublicProfileSkeleton", () => {
  it("renders hero, skills grid, and stats placeholders", () => {
    render(React.createElement(PublicProfileSkeleton));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(screen.getByText(/loading campus peer profile/i)).toBeInTheDocument();
  });
});
