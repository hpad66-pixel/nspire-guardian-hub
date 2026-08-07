import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReconcileStamp } from "../VendorDashboardPage";
import type { VendorReconciliation, VendorReconciliationControl } from "@/hooks/useVendorReconciliation";

const base: VendorReconciliation = {
  base: 600000,
  sovTotal: 600000,
  additiveCO: 0,
  deductiveCO: 0,
  netCO: 0,
  revisedContract: 600000,
  billedToDate: 540479.39,
  paidToDate: 540479.39,
  retainageHeld: 0,
  retainagePct: 0,
  maxPayable: 600000,
  remainingToPay: 59520.61,
  leftToEarn: 59520.61,
  overpaid: false,
  cos: [],
  ownerShares: [],
  lineItems: [],
  lineItemsTotal: 0,
  control: null,
};

const control: VendorReconciliationControl = {
  commitmentId: "c-1",
  tenantId: "t-1",
  asOfDate: "2026-07-27",
  expectedPaidToDate: 540479.39,
  expectedPaymentCount: 35,
  expectedInvoiceCount: 35,
  actualPaidToDate: 525479.39,
  actualPaymentCount: 34,
  actualInvoiceCount: 34,
  missingReferenceCount: 0,
  variance: -15000,
  isReconciled: false,
  certifiedAt: null,
  controlNote: "July 3 wire is missing.",
};

describe("VendorDashboard reconciliation seal", () => {
  it("does not claim reconciliation without a persisted control", () => {
    render(<ReconcileStamp r={base} vendor="D'Shin Plumbing" />);

    expect(screen.getByText(/Within contract · not independently reconciled/i)).toBeInTheDocument();
    expect(screen.queryByText(/QC checked/i)).not.toBeInTheDocument();
  });

  it("surfaces the persisted variance instead of a green seal", () => {
    render(<ReconcileStamp r={{ ...base, control }} vendor="D'Shin Plumbing" />);

    expect(screen.getByText(/Control variance · not reconciled/i)).toBeInTheDocument();
    expect(screen.getByText(/July 3 wire is missing/i)).toBeInTheDocument();
    expect(screen.queryByText(/QC checked/i)).not.toBeInTheDocument();
  });

  it("shows green QC only when the control is certified reconciled", () => {
    render(<ReconcileStamp r={{ ...base, control: { ...control, actualPaidToDate: 540479.39, actualPaymentCount: 35, actualInvoiceCount: 35, variance: 0, isReconciled: true, certifiedAt: "2026-07-28T12:00:00Z", controlNote: null } }} vendor="D'Shin Plumbing" />);

    expect(screen.getByText(/Independently reconciled · QC checked/i)).toBeInTheDocument();
  });
});
