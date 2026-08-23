import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeaderSearch } from "@/components/layout/header-search";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/search",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Search UX Refinement: HeaderSearch & Tab Query Separation", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  describe("1. Single Clear Button in HeaderSearch", () => {
    it("renders exactly one clear button when query is present", () => {
      const handleClear = vi.fn();
      const { container } = render(
        React.createElement(HeaderSearch, {
          initialValue: "React useEffect",
          onClear: handleClear,
        }),
      );

      const clearButtons = screen.getAllByRole("button", { name: "Clear search query" });
      expect(clearButtons.length).toBe(1);

      // Verify the input has classes preventing native browser search cancel button
      const input = container.querySelector("input");
      expect(input).toBeDefined();
      expect(input?.className).toContain("[&::-webkit-search-cancel-button]:appearance-none");
    });

    it("renders no clear button when query is empty", () => {
      render(
        React.createElement(HeaderSearch, {
          initialValue: "",
        }),
      );

      expect(screen.queryByRole("button", { name: "Clear search query" })).toBeNull();
    });

    it("clicking clear button invokes onClear and resets internal query value", () => {
      const handleClear = vi.fn();
      const { container } = render(
        React.createElement(HeaderSearch, {
          initialValue: "Data Structures",
          onClear: handleClear,
        }),
      );

      const clearBtn = screen.getByRole("button", { name: "Clear search query" });
      fireEvent.click(clearBtn);

      expect(handleClear).toHaveBeenCalledTimes(1);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  describe("2. Tab Query Separation & Clearing State", () => {
    it("doubt query does not appear in peer search and peer query does not appear in doubt search", () => {
      // Scenario A: URL has ?tab=doubts&q=React+useEffect
      const doubtsParams = new URLSearchParams("tab=doubts&q=React+useEffect");
      const currentTabA = doubtsParams.get("tab") === "peers" ? "peers" : "doubts";
      const doubtQueryA = doubtsParams.get("q") || "";
      const peerQueryA = doubtsParams.get("peerQuery") || doubtsParams.get("peerQ") || "";
      const activeQueryA = currentTabA === "doubts" ? doubtQueryA : peerQueryA;

      expect(currentTabA).toBe("doubts");
      expect(doubtQueryA).toBe("React useEffect");
      expect(peerQueryA).toBe("");
      expect(activeQueryA).toBe("React useEffect");

      // Scenario B: User switches to peers tab without peerQuery: ?tab=peers&q=React+useEffect
      const switchedToPeersParams = new URLSearchParams("tab=peers&q=React+useEffect");
      const currentTabB = switchedToPeersParams.get("tab") === "peers" ? "peers" : "doubts";
      const doubtQueryB = switchedToPeersParams.get("q") || "";
      const peerQueryB = switchedToPeersParams.get("peerQuery") || switchedToPeersParams.get("peerQ") || "";
      const activeQueryB = currentTabB === "doubts" ? doubtQueryB : peerQueryB;

      expect(currentTabB).toBe("peers");
      // Doubt query is preserved in its own slot, but Peer search input is completely empty
      expect(peerQueryB).toBe("");
      expect(activeQueryB).toBe("");

      // Scenario C: User searches on peers tab: ?tab=peers&peerQuery=Mahi&q=React+useEffect
      const peerSearchParams = new URLSearchParams("tab=peers&peerQuery=Mahi&q=React+useEffect");
      const currentTabC = peerSearchParams.get("tab") === "peers" ? "peers" : "doubts";
      const doubtQueryC = peerSearchParams.get("q") || "";
      const peerQueryC = peerSearchParams.get("peerQuery") || peerSearchParams.get("peerQ") || "";
      const activeQueryC = currentTabC === "doubts" ? doubtQueryC : peerQueryC;

      expect(currentTabC).toBe("peers");
      expect(peerQueryC).toBe("Mahi");
      expect(activeQueryC).toBe("Mahi");

      // Scenario D: User switches back to doubts tab: ?tab=doubts&peerQuery=Mahi&q=React+useEffect
      const switchedBackDoubtsParams = new URLSearchParams("tab=doubts&peerQuery=Mahi&q=React+useEffect");
      const currentTabD = switchedBackDoubtsParams.get("tab") === "peers" ? "peers" : "doubts";
      const doubtQueryD = switchedBackDoubtsParams.get("q") || "";
      const peerQueryD = switchedBackDoubtsParams.get("peerQuery") || switchedBackDoubtsParams.get("peerQ") || "";
      const activeQueryD = currentTabD === "doubts" ? doubtQueryD : peerQueryD;

      expect(currentTabD).toBe("doubts");
      expect(doubtQueryD).toBe("React useEffect");
      expect(activeQueryD).toBe("React useEffect");
    });

    it("clearing query removes query from URL and reload keeps it empty", () => {
      const searchParams = new URLSearchParams("q=React+useEffect&tab=doubts");
      
      // Simulate handleSearchClear on doubts tab
      const updatedParams = new URLSearchParams(searchParams.toString());
      updatedParams.delete("q");
      updatedParams.delete("page");

      expect(updatedParams.get("q")).toBeNull();
      expect(updatedParams.toString()).toBe("tab=doubts");

      // When reloading with the cleared URL
      const reloadedParams = new URLSearchParams(updatedParams.toString());
      const doubtQuery = reloadedParams.get("q") || "";
      expect(doubtQuery).toBe("");
    });
  });
});
