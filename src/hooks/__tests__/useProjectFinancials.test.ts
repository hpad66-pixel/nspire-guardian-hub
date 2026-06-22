/**
 * useProjectFinancials — F0 financial mega-dashboard reader.
 * Returns four named sub-queries (summary, ledger, payAppBalances,
 * invoiceBalances), each reading a financial view. Covers: query gating on a
 * null projectId, the summary happy path (with numeric coercion of the
 * string-serialized `numeric` columns), a list happy path (ledger), and error
 * surfacing on the summary view.
 *
 * Note: this hook returns raw useQuery results keyed by name rather than the
 * flattened {data,isLoading,...} shape — deviates from the simple
 * use<Resource>(projectId) convention.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useProjectFinancials } from "../useProjectFinancials";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProjectFinancials", () => {
  beforeEach(() => __mock.reset());

  it("all sub-queries are disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProjectFinancials(null));
    expect(result.current.summary.fetchStatus).toBe("idle");
    expect(result.current.ledger.fetchStatus).toBe("idle");
    expect(result.current.payAppBalances.fetchStatus).toBe("idle");
    expect(result.current.invoiceBalances.fetchStatus).toBe("idle");
  });

  it("summary coerces string-serialized numeric columns to numbers", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: { project_id: "p1", original_contract: "523061.00", net_cash_position: "1000.50" },
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useProjectFinancials("p1"));
    await waitFor(() => expect(result.current.summary.isSuccess).toBe(true));
    expect(result.current.summary.data?.original_contract).toBe(523061);
    expect(result.current.summary.data?.net_cash_position).toBe(1000.5);
  });

  it("ledger lists entries for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ project_id: "p1", amount: "250.00" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProjectFinancials("p1"));
    await waitFor(() => expect(result.current.ledger.isSuccess).toBe(true));
    expect((result.current.ledger.data?.[0] as any).amount).toBe(250);
  });

  it("surfaces view errors on the summary query", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useProjectFinancials("p1"));
    await waitFor(() => expect(result.current.summary.isError).toBe(true));
  });
});
