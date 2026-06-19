import { describe, it, expect } from "vitest";
import { requiredReleaseFor, isPaymentGated, gateExplainer, type LienReleaseLike } from "@/lib/financial/lien";

const approvedInbound = (t: LienReleaseLike["release_type"]): LienReleaseLike =>
  ({ direction: "inbound", release_type: t, status: "approved" });

describe("requiredReleaseFor", () => {
  it("final requires unconditional final only", () => {
    expect(requiredReleaseFor("final")).toEqual(["unconditional_final"]);
  });
  it("progress accepts any of the four types", () => {
    expect(requiredReleaseFor("progress")).toHaveLength(4);
  });
});

describe("isPaymentGated", () => {
  it("blocks when there is no inbound approved release", () => {
    expect(isPaymentGated([], "progress")).toBe(true);
  });
  it("allows a progress payment with an approved conditional progress waiver", () => {
    expect(isPaymentGated([approvedInbound("conditional_progress")], "progress")).toBe(false);
  });
  it("blocks a final payment that only has a progress waiver", () => {
    expect(isPaymentGated([approvedInbound("conditional_progress")], "final")).toBe(true);
  });
  it("allows a final payment with an unconditional final waiver", () => {
    expect(isPaymentGated([approvedInbound("unconditional_final")], "final")).toBe(false);
  });
  it("ignores pending or outbound waivers", () => {
    expect(isPaymentGated([
      { direction: "inbound", release_type: "conditional_progress", status: "pending" },
      { direction: "outbound", release_type: "unconditional_final", status: "approved" },
    ], "progress")).toBe(true);
  });
});

describe("gateExplainer", () => {
  it("differs by kind", () => {
    expect(gateExplainer("final")).toMatch(/unconditional final/i);
    expect(gateExplainer("progress")).toMatch(/progress/i);
  });
});
