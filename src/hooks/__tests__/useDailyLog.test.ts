/**
 * G5 · useDailyReport smoke tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(async () => "tenant-1"),
}));

import { useDailyReport } from "../useDailyLog";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useDailyReport", () => {
  beforeEach(() => __mock.reset());

  it("idle until projectId AND reportDate are both set", () => {
    const { result: r1 } = renderHookWithClient(() => useDailyReport(null, null));
    expect(r1.current.fetchStatus).toBe("idle");

    const { result: r2 } = renderHookWithClient(() =>
      useDailyReport("p1", null),
    );
    expect(r2.current.fetchStatus).toBe("idle");
  });

  it("fetches the daily_reports row for project + date", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: { id: "dr1", project_id: "p1", report_date: "2026-04-28" },
      error: null,
    }));
    const { result } = renderHookWithClient(() =>
      useDailyReport("p1", "2026-04-28"),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(__mock.from).toHaveBeenCalledWith("daily_reports");
  });
});
