/**
 * useProcoreChangeOrders — D4 Change Orders (PCO/OCO/CCO).
 * Covers: query gating, list-by-type happy path, addLine (stamps tenant +
 * change_order_id + cost_code_id — the financial cascade key), promote-to-OCO
 * (reads the PCO then inserts an executed OCO stamped with parent_pco_id), and
 * the list error path.
 *
 * Note: mutations resolve the tenant via `requireTenantId` from @/lib/tenant
 * (mocked). usePromoteToOco issues a select-then-insert plus a lines copy, so
 * table-aware mocking is used to avoid sequencing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(async () => "ws-1"),
}));

import {
  useChangeOrdersByType,
  useChangeOrderLines,
  usePromoteToOco,
} from "../useProcoreChangeOrders";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProcoreChangeOrders", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("list-by-type is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useChangeOrdersByType(null, "PCO"));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists change_orders for the given project + type", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "co1", project_id: "p1", co_type: "PCO" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useChangeOrdersByType("p1", "PCO"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].co_type).toBe("PCO");
  });

  it("addLine stamps tenant, change_order_id, and the cost_code_id cascade key", async () => {
    const builder = makeBuilder({ data: { id: "ln-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useChangeOrderLines("co1"));

    const row = await result.current.addLine.mutateAsync({
      costCodeId: "cc-1",
      description: "Extra footing",
      amount: 1200,
    });
    expect((row as any).id).toBe("ln-new");
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      tenant_id: "ws-1",
      change_order_id: "co1",
      cost_code_id: "cc-1",
      amount: 1200,
    });
  });

  it("promote-to-OCO reads the PCO then inserts an executed OCO with parent_pco_id", async () => {
    const coBuilder = makeBuilder({
      data: { id: "pco1", project_id: "p1", prime_contract_id: "pc1", title: "T", description: "D", amount: 900 },
      error: null,
    });
    const linesBuilder = makeBuilder({ data: [], error: null });
    __mock.from.mockImplementation((table: string) =>
      table === "change_order_lines" ? linesBuilder : coBuilder,
    );

    const { result } = renderHookWithClient(() => usePromoteToOco());
    await result.current.mutateAsync("pco1");

    const inserted = (coBuilder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      tenant_id: "ws-1",
      project_id: "p1",
      co_type: "OCO",
      status: "executed",
      parent_pco_id: "pco1",
    });
  });

  it("list surfaces RLS errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useChangeOrdersByType("p1", "OCO"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
