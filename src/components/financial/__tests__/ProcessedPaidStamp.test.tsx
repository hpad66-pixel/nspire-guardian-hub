import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessedPaidStamp, formatPaidStampDate } from "../ProcessedPaidStamp";

describe("ProcessedPaidStamp", () => {
  it("renders the audit dates, amount, and bank reference", () => {
    render(
      <ProcessedPaidStamp
        processedDate="2026-07-03T14:20:00Z"
        paidDate="2026-07-03"
        totalPaid={15000}
        latestReference="WT 260703-020083"
      />,
    );

    expect(screen.getByRole("img", { name: /processed and paid/i })).toHaveAccessibleName(/\$15,000\.00/);
    expect(screen.getByText("$15,000.00")).toBeInTheDocument();
    expect(screen.getByText(/Paid Jul 3, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/WT 260703-020083/)).toBeInTheDocument();
  });

  it("formats date-only values without shifting the calendar day", () => {
    expect(formatPaidStampDate("2026-06-30")).toBe("Jun 30, 2026");
  });
});
