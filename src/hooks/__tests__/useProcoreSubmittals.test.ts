/**
 * C2 · useProcoreSubmittals — pure logic unit tests.
 *
 * Severity rollup is the business rule that decides the parent submittal's
 * status once every step has responded. Happy / validation / permission
 * coverage notes:
 *
 *   - Happy: mixed responses roll up to the worst response.
 *   - Validation: empty / all-null responses return null (no rollup yet).
 *   - Permission: severity logic is client-pure — no auth involvement. RLS
 *     on `submittal_workflow_steps` gates the caller's ability to see / write
 *     steps in the first place; that's covered under rbac.test.ts.
 */
import { describe, it, expect } from "vitest";
import { SEVERITY_RANK, pickWorstResponse } from "@/hooks/useProcoreSubmittals";

describe("SEVERITY_RANK", () => {
  it("orders statuses so rejected > revise > approved_as_noted > approved > fyi", () => {
    expect(SEVERITY_RANK.rejected).toBeGreaterThan(SEVERITY_RANK.revise);
    expect(SEVERITY_RANK.revise).toBeGreaterThan(SEVERITY_RANK.approved_as_noted);
    expect(SEVERITY_RANK.approved_as_noted).toBeGreaterThan(SEVERITY_RANK.approved);
    expect(SEVERITY_RANK.approved).toBeGreaterThan(SEVERITY_RANK.fyi);
  });
});

describe("pickWorstResponse", () => {
  it("returns null when the list is empty", () => {
    expect(pickWorstResponse([])).toBeNull();
  });

  it("treats all-null responses as 'not yet rolled up'", () => {
    expect(pickWorstResponse([null, null, undefined])).toBeNull();
  });

  it("rejected beats every other response", () => {
    expect(pickWorstResponse(["approved", "rejected", "approved"])).toBe("rejected");
    expect(pickWorstResponse(["revise", "rejected"])).toBe("rejected");
  });

  it("revise beats approved_as_noted + approved + fyi", () => {
    expect(pickWorstResponse(["approved_as_noted", "approved", "revise"])).toBe("revise");
    expect(pickWorstResponse(["fyi", "revise"])).toBe("revise");
  });

  it("approved_as_noted beats approved + fyi", () => {
    expect(pickWorstResponse(["approved", "approved_as_noted"])).toBe("approved_as_noted");
    expect(pickWorstResponse(["fyi", "approved_as_noted", "approved"])).toBe("approved_as_noted");
  });

  it("approved beats fyi", () => {
    expect(pickWorstResponse(["fyi", "approved"])).toBe("approved");
  });

  it("ignores null entries in a mixed list", () => {
    expect(pickWorstResponse([null, "revise", null, "approved"])).toBe("revise");
  });
});
