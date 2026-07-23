/**
 * Render smoke test for the Margin & Recovery card — mounts it with mock margin
 * data so a regression in the tooltip'd metrics fails CI instead of the page.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useMargin", () => ({
  useMargin: () => ({
    data: {
      totals: { revenue: 879993.91, cost: 627827.69, margin: 252166.22 },
      cash: { receivedFromOwner: 667871.38, paidToSubs: 485779.39 },
    },
  }),
}));

import { MarginOverviewCard } from "../MarginOverviewCard";

describe("MarginOverviewCard", () => {
  it("renders the three margin metrics without throwing", () => {
    const { container } = render(
      <MemoryRouter><MarginOverviewCard projectId="p1" /></MemoryRouter>,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Owner revenue");
    expect(text).toContain("Sub cost");
    expect(text).toContain("APAS recovery");
    expect(text).toContain("(29%)"); // 252166.22 / 879993.91
    // the duplicated paid-by-owner / paid-to-subs row is gone
    expect(text).not.toContain("Paid to date");
  });
});
