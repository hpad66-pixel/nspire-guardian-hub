/**
 * useReports — read-only aggregation reports over portfolio/projects data.
 * These are query-only hooks (no mutations). Each report issues several from()
 * calls against different tables and derives summary stats client-side, so the
 * tests use TABLE-AWARE mocking (never sequenced mockReturnValueOnce — a report
 * fans out across tables and the order isn't load-bearing for the assertion).
 *
 * Note: useMyAssignedItemsReport / useMyInspectionsReport depend on useAuth and
 * are gated on `enabled: !!user?.id` — mocked here to a fixed user.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

import {
  usePropertyPortfolioReport,
  useProjectStatusReport,
  useMyAssignedItemsReport,
} from "../useReports";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useReports", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("property portfolio report aggregates units + issues per property", async () => {
    const byTable: Record<string, ReturnType<typeof makeBuilder>> = {
      properties: makeBuilder({ data: [{ id: "prop1", name: "Maple" }], error: null }),
      units: makeBuilder({
        data: [
          { property_id: "prop1", status: "occupied" },
          { property_id: "prop1", status: "vacant" },
        ],
        error: null,
      }),
      issues: makeBuilder({
        data: [{ property_id: "prop1", status: "open", severity: "severe" }],
        error: null,
      }),
    };
    __mock.from.mockImplementation((table: string) => byTable[table] ?? makeBuilder({ data: [], error: null }));

    const { result } = renderHookWithClient(() => usePropertyPortfolioReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.summary.totalProperties).toBe(1);
    expect(result.current.data?.summary.occupiedUnits).toBe(1);
    expect(result.current.data?.properties[0].openIssues).toBe(1);
  });

  it("project status report folds approved change orders into adjusted budget", async () => {
    const byTable: Record<string, ReturnType<typeof makeBuilder>> = {
      projects: makeBuilder({
        data: [{ id: "pj1", status: "active", budget: 1000, spent: 200 }],
        error: null,
      }),
      change_orders: makeBuilder({
        data: [{ project_id: "pj1", amount: 500, status: "approved" }],
        error: null,
      }),
      project_milestones: makeBuilder({ data: [], error: null }),
    };
    __mock.from.mockImplementation((table: string) => byTable[table] ?? makeBuilder({ data: [], error: null }));

    const { result } = renderHookWithClient(() => useProjectStatusReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.financials.totalBudget).toBe(1000);
    expect(result.current.data?.financials.adjustedBudget).toBe(1500);
    expect(result.current.data?.projects[0].approvedCOAmount).toBe(500);
  });

  it("my-assigned-items report fans out across issues, work orders, and mentions", async () => {
    const byTable: Record<string, ReturnType<typeof makeBuilder>> = {
      issues: makeBuilder({ data: [{ id: "i1", assigned_to: "u1" }], error: null }),
      work_orders: makeBuilder({ data: [{ id: "w1", assigned_to: "u1", due_date: "2999-01-01" }], error: null }),
      issue_mentions: makeBuilder({ data: [{ issue_id: "i9" }], error: null }),
    };
    __mock.from.mockImplementation((table: string) => byTable[table] ?? makeBuilder({ data: [], error: null }));

    const { result } = renderHookWithClient(() => useMyAssignedItemsReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.summary.totalAssignedIssues).toBe(1);
    expect(result.current.data?.summary.totalAssignedWorkOrders).toBe(1);
    expect(result.current.data?.mentionedIssueIds).toEqual(["i9"]);
  });

  it("surfaces report query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => usePropertyPortfolioReport());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
