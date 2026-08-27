import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AdminOverviewSkeleton,
  AdminStudentsSkeleton,
  AdminSkillsSkeleton,
  AdminSettingsSkeleton,
  AdminOwnershipSkeleton,
} from "@/components/skeletons/admin-skeletons";

describe("Admin Skeleton UX System (components/skeletons/admin-skeletons.tsx)", () => {
  it("renders AdminOverviewSkeleton with status announcement and KPI sections", () => {
    const { container } = render(React.createElement(AdminOverviewSkeleton));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading platform overview metrics/i)).toBeInTheDocument();
    const shimmerElements = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerElements.length).toBeGreaterThan(10);
  });

  it("renders AdminStudentsSkeleton with student card list", () => {
    const { container } = render(React.createElement(AdminStudentsSkeleton, { count: 5 }));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading student roster/i)).toBeInTheDocument();
    const shimmerElements = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerElements.length).toBeGreaterThanOrEqual(15);
  });

  it("renders AdminSkillsSkeleton in responsive grid", () => {
    const { container } = render(React.createElement(AdminSkillsSkeleton, { count: 6 }));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass("grid");
    expect(screen.getByText(/loading predefined skills taxonomy/i)).toBeInTheDocument();
    const shimmerElements = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerElements.length).toBeGreaterThanOrEqual(18);
  });

  it("renders AdminSettingsSkeleton with form input placeholders", () => {
    const { container } = render(React.createElement(AdminSettingsSkeleton));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading platform settings/i)).toBeInTheDocument();
    const shimmerElements = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerElements.length).toBeGreaterThanOrEqual(8);
  });

  it("renders AdminOwnershipSkeleton with owner card placeholder", () => {
    const { container } = render(React.createElement(AdminOwnershipSkeleton));
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading platform owner information/i)).toBeInTheDocument();
    const shimmerElements = container.querySelectorAll(".skeleton-shimmer");
    expect(shimmerElements.length).toBeGreaterThanOrEqual(4);
  });
});
