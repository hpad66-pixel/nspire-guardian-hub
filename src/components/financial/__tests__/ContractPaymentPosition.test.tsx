/**
 * Render smoke test for the pay-app Contract & Payment Position card — mounts it
 * with a mock position so a module-load / render regression fails CI instead of
 * reaching the pay-app page.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ContractPaymentPosition } from "../ContractPaymentPosition";
import type { PaymentPosition } from "@/lib/financial/payAppContinuation";

const p: PaymentPosition = {
  baseContract: 523061, changeOrders: 24050, revisedContract: 547111,
  completedToDate: 400000, pctComplete: 73.11, retainageHeld: 40000,
  earnedLessRetainage: 360000, previouslyBilled: 280000, thisInvoice: 80000,
  paidToDate: 300000, outstanding: 60000, balanceToBill: 147111, balanceToFinish: 187111,
};

describe("ContractPaymentPosition", () => {
  it("renders the money position without throwing", () => {
    const { container } = render(<ContractPaymentPosition position={p} payAppNo={5} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Contract & Payment Position");
    expect(text).toContain("Pay Application #5");
    expect(text).toContain("$300,000.00"); // paid by client to date
  });

  it("renders with a null pay-app number and zero outstanding", () => {
    const { container } = render(<ContractPaymentPosition position={{ ...p, outstanding: 0 }} payAppNo={null} />);
    expect((container.textContent ?? "").length).toBeGreaterThan(0);
  });
});
