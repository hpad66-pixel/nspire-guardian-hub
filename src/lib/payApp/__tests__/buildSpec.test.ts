import { describe, it, expect } from "vitest";
import { buildPayAppSpec } from "../buildSpec";

const contract: any = {
  contract_no: "PC-01-001", title: "Sewer Extension Project",
  retainage_pct: 5, contractor_name: "APAS Consulting LLC", contractor_contact: "Hardeep Anand",
  owner_name: "R4 Capital", owner_email: "csullivan@r4cap.com",
};
const g702: any = {
  original_contract_sum: 523061, net_change_orders: 0, contract_sum_to_date: 523061,
  completed_stored_to_date: 0, retainage_total: 0, total_earned_less_retainage: 0,
  less_previous_certificates: 0, current_payment_due: 0, balance_to_finish: 523061,
};
const lines: any[] = [
  { item_no: "1", kind: "base", description: "Sewer", unit: "LF", scheduled_qty: 10,
    scheduled_value: 1000, prior_value_to_date: 200, value_this_period: 100, value_to_date: 300,
    pct_complete: 30, retainage: 15 },
];

describe("buildPayAppSpec", () => {
  it("maps lines and pulls retainage % from the contract", () => {
    const pa = { pay_app_no: 5, period_end: "2026-06-30" };
    const spec = buildPayAppSpec(pa, contract, {}, g702, lines);
    expect(spec.payAppNo).toBe(5);
    expect(spec.retainagePct).toBe(5);
    expect(spec.owner.email).toBe("csullivan@r4cap.com");
    expect(spec.lines[0]).toMatchObject({ item_no: "1", prev_value: 200, this_value: 100, value_to_date: 300 });
    expect(spec.draft).toBe(false);
  });

  it("uses the persisted signature unless overridden", () => {
    const pa = { pay_app_no: 5, period_end: "2026-06-30", signature_data: "data:stored", signed_name: "HA" };
    expect(buildPayAppSpec(pa, contract, {}, g702, lines).signatureUrl).toBe("data:stored");
    const over = buildPayAppSpec(pa, contract, {}, g702, lines, { signatureUrl: "data:fresh", draft: true });
    expect(over.signatureUrl).toBe("data:fresh");
    expect(over.draft).toBe(true);
  });
});
