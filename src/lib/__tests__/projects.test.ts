/**
 * WS-5 · #14 · shared active-project selector.
 *
 * happy:      typical "in-flight" statuses count as active.
 * validation: terminal statuses (completed/closed/archived) are excluded;
 *             null/blank counts as active (not terminal).
 * permission: pure selector — RLS governs which projects the caller can
 *             read; this only classifies what they already see.
 */
import { describe, it, expect } from "vitest";
import { isActiveProject, isActiveProjectStatus, INACTIVE_PROJECT_STATUSES } from "@/lib/projects";

describe("isActiveProjectStatus", () => {
  it("happy: in-flight statuses are active", () => {
    for (const s of ["active", "planning", "on_hold", "in_progress"]) {
      expect(isActiveProjectStatus(s)).toBe(true);
    }
  });

  it("validation: terminal statuses are not active", () => {
    for (const s of INACTIVE_PROJECT_STATUSES) {
      expect(isActiveProjectStatus(s)).toBe(false);
    }
  });

  it("validation: null / undefined / blank counts as active", () => {
    expect(isActiveProjectStatus(null)).toBe(true);
    expect(isActiveProjectStatus(undefined)).toBe(true);
    expect(isActiveProjectStatus("")).toBe(true);
  });
});

describe("isActiveProject", () => {
  it("matches across the two former definitions (on_hold no longer diverges)", () => {
    // Dashboard's old whitelist missed on_hold; ProjectsDashboard's old
    // blacklist counted it. Both now agree it is active.
    expect(isActiveProject({ status: "on_hold" })).toBe(true);
    expect(isActiveProject({ status: "completed" })).toBe(false);
  });
});
