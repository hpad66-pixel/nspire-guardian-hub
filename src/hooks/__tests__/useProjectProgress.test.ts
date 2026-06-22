/**
 * useProjectProgress — project_progress_entries CRUD + the derived
 * earned-value aggregation. Covers: query gating, list happy path, the create
 * insert payload (which stamps updated_by from the auth user), the EV metric
 * roll-up (CPI/SPI computed from latest-per-trade entries), and error surfacing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import {
  useProgressEntries,
  useCreateProgressEntry,
  useEarnedValueMetrics,
} from "../useProjectProgress";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProjectProgress", () => {
  beforeEach(() => __mock.reset());

  it("entries list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProgressEntries(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists progress entries for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "e1", project_id: "p1", trade: "concrete" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProgressEntries("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].trade).toBe("concrete");
  });

  it("create stamps updated_by from the auth user", async () => {
    const builder = makeBuilder({ data: { id: "e-new", project_id: "p1" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreateProgressEntry());

    await result.current.mutateAsync({ project_id: "p1", trade: "framing", percent_complete: 40 });
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      project_id: "p1",
      trade: "framing",
      percent_complete: 40,
      updated_by: "u1",
    });
  });

  it("earned-value metrics roll up CPI/SPI from latest-per-trade entries", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          {
            trade: "concrete",
            entry_date: "2026-06-01",
            planned_value: 100,
            earned_value: 80,
            actual_cost: 90,
            percent_complete: 80,
          },
          // newer entry for the same trade — should win the latest-per-trade reduce
          {
            trade: "concrete",
            entry_date: "2026-06-10",
            planned_value: 200,
            earned_value: 150,
            actual_cost: 100,
            percent_complete: 75,
          },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useEarnedValueMetrics("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const m = result.current.data!;
    expect(m.totalPV).toBe(200);
    expect(m.totalEV).toBe(150);
    expect(m.totalAC).toBe(100);
    expect(m.cpi).toBeCloseTo(1.5);
    expect(m.spi).toBeCloseTo(0.75);
    expect(m.trades).toHaveLength(1);
  });

  it("create surfaces insert errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useCreateProgressEntry());
    await expect(
      result.current.mutateAsync({ project_id: "p1", trade: "x" }),
    ).rejects.toBeTruthy();
  });
});
