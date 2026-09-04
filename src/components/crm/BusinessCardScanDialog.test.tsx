import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessCardScanDialog } from "./BusinessCardScanDialog";

vi.mock("@/lib/crm/cardIntake", () => ({
  checkCardScanEntitlement: vi.fn(async () => true),
  executeCardApproval: vi.fn(), fieldsToContact: vi.fn(), requestCardApproval: vi.fn(), scanBusinessCard: vi.fn(),
}));

describe("BusinessCardScanDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("explains the safe scan flow and current project", async () => {
    render(<BusinessCardScanDialog projects={[{ id: "p1", name: "Harbor Renovation" }]} open onOpenChange={() => undefined} />);
    expect(await screen.findByText("Front of card *")).toBeInTheDocument();
    expect(screen.getByText("Current project:")).toBeInTheDocument();
    expect(screen.getByText("Harbor Renovation")).toBeInTheDocument();
    expect(screen.getByText(/Nothing is added automatically/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Read card/i })).toBeDisabled();
  });
});

