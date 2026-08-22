import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AcceptedCheckmarkSVG,
  OnboardingNodeConnectionSVG,
  SearchRadarEmptyStateSVG,
} from "@/components/ui/motion-illustrations";

describe("Motion & Micro-Interaction Illustrations (Pure SVG)", () => {
  it("renders AcceptedCheckmarkSVG with stroke animation class", () => {
    const { container } = render(React.createElement(AcceptedCheckmarkSVG));
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const checkmarkPath = container.querySelector(".animate-checkmark");
    expect(checkmarkPath).not.toBeNull();
  });

  it("renders OnboardingNodeConnectionSVG with path-draw and node-pulse animation classes", () => {
    const { container } = render(React.createElement(OnboardingNodeConnectionSVG));
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const pathDraw = container.querySelector(".animate-path-draw");
    expect(pathDraw).not.toBeNull();
    const pulsingNodes = container.querySelectorAll(".animate-node-pulse");
    expect(pulsingNodes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders SearchRadarEmptyStateSVG with radar rings and pulsing center focal beacon", () => {
    const { container } = render(React.createElement(SearchRadarEmptyStateSVG));
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const pulsingRing = container.querySelector(".animate-node-pulse");
    expect(pulsingRing).not.toBeNull();
  });
});
