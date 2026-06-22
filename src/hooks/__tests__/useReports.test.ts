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
  useInspectionSummaryReport,
  useDefectsAnalysisReport,
  useIssuesOverviewReport,
  useWorkOrdersPerformanceReport,
  useProjectStatusReport,
  useMyAssignedItemsReport,
  useMyInspectionsReport,
  useMyDailyReportsReport,
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

  it("inspection summary report buckets by area and status (with date range)", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { id: "in1", area: "unit", status: "completed" },
          { id: "in2", area: "outside", status: "scheduled" },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() =>
      useInspectionSummaryReport({ from: new Date("2026-01-01"), to: new Date("2026-02-01") }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.byArea.unit).toBe(1);
    expect(result.current.data?.byStatus.completed).toBe(1);
    expect(result.current.data?.completionRate).toBe(50);
  });

  it("defects analysis report buckets by severity, category, and repair state", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { id: "d1", severity: "severe", category: "electrical", repaired_at: "2026-01-05" },
          { id: "d2", severity: "low", category: "plumbing", repaired_at: null },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() =>
      useDefectsAnalysisReport({ from: new Date("2026-01-01"), to: new Date("2026-02-01") }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.bySeverity.severe).toBe(1);
    expect(result.current.data?.repaired).toBe(1);
    expect(result.current.data?.pending).toBe(1);
    expect(result.current.data?.byCategory.electrical).toBe(1);
    expect(result.current.data?.resolutionRate).toBe(50);
  });

  it("issues overview report buckets by status, severity, source, and overdue", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { id: "i1", status: "open", severity: "severe", source_module: "core", deadline: "2000-01-01" },
          { id: "i2", status: "resolved", severity: "low", source_module: "nspire", deadline: null },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useIssuesOverviewReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.byStatus.open).toBe(1);
    expect(result.current.data?.bySource.core).toBe(1);
    expect(result.current.data?.overdue).toBe(1);
    expect(result.current.data?.resolutionRate).toBe(50);
  });

  it("work orders performance report computes avg resolution + overdue", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          {
            id: "w1",
            status: "completed",
            priority: "routine",
            created_at: "2026-01-01T00:00:00Z",
            completed_at: "2026-01-05T00:00:00Z",
            due_date: "2026-01-10",
          },
          {
            id: "w2",
            status: "pending",
            priority: "emergency",
            created_at: "2026-01-01T00:00:00Z",
            completed_at: null,
            due_date: "2000-01-01",
          },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useWorkOrdersPerformanceReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.byStatus.completed).toBe(1);
    expect(result.current.data?.byPriority.emergency).toBe(1);
    expect(result.current.data?.avgResolutionDays).toBe(4);
    expect(result.current.data?.overdue).toBe(1);
  });

  it("my-inspections report counts defects across the inspector's inspections", async () => {
    const byTable: Record<string, ReturnType<typeof makeBuilder>> = {
      inspections: makeBuilder({
        data: [{ id: "in1", status: "completed", area: "unit", inspector_id: "u1" }],
        error: null,
      }),
      defects: makeBuilder({
        data: [{ inspection_id: "in1", severity: "severe" }],
        error: null,
      }),
    };
    __mock.from.mockImplementation((table: string) => byTable[table] ?? makeBuilder({ data: [], error: null }));

    const { result } = renderHookWithClient(() =>
      useMyInspectionsReport({ from: new Date("2026-01-01"), to: new Date("2026-02-01") }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.defectsFound).toBe(1);
    expect(result.current.data?.severeDefects).toBe(1);
    expect(result.current.data?.completedCount).toBe(1);
    expect(result.current.data?.byArea.unit).toBe(1);
  });

  it("my-daily-reports report tallies workers, delays, and issues", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { id: "dr1", workers_count: 4, delays: "rain", issues_encountered: "", submitted_by: "u1" },
          { id: "dr2", workers_count: 6, delays: "", issues_encountered: "leak", submitted_by: "u1" },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useMyDailyReportsReport());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalReports).toBe(2);
    expect(result.current.data?.totalWorkers).toBe(10);
    expect(result.current.data?.avgWorkersPerDay).toBe(5);
    expect(result.current.data?.reportsWithDelays).toBe(1);
    expect(result.current.data?.reportsWithIssues).toBe(1);
  });
});
