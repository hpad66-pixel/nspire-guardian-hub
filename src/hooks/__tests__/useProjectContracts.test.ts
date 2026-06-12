/**
 * WS-7 · useProjectContracts.
 *
 * Asserts that a contract SOV line's cost_code_id is persisted on save, so
 * the financial cascade (CLAUDE.md rule 2) has the cost-code linkage it
 * needs. The upsert re-inserts SOV rows; each inserted row must carry
 * cost_code_id alongside contract_id + tenant_id.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";

const h = vi.hoisted(() => {
  const state = { sovInsertRows: [] as any[] };
  const fromMock = vi.fn((table: string) => {
    const b: any = {};
    b.select = vi.fn(() => b);
    b.update = vi.fn(() => b);
    b.eq = vi.fn(() => b);
    b.limit = vi.fn(() => b);
    b.order = vi.fn(() => b);
    // default awaitable (list query, delete().eq())
    b.then = (resolve: any, reject: any) =>
      Promise.resolve({ data: [], error: null }).then(resolve, reject);

    if (table === "workspaces") {
      b.single = vi.fn(async () => ({ data: { id: "tenant-1" }, error: null }));
    } else if (table === "project_contracts") {
      b.insert = vi.fn(() => b);
      b.single = vi.fn(async () => ({ data: { id: "contract-1" }, error: null }));
    } else if (table === "contract_sov_items") {
      b.delete = vi.fn(() => b);
      b.insert = vi.fn((rows: any) => {
        state.sovInsertRows = rows;
        return Promise.resolve({ error: null });
      });
    }
    return b;
  });
  return { state, fromMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: h.fromMock,
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
  },
}));

import { useProjectContracts } from "../useProjectContracts";
import { renderHookWithClient } from "@/test/utils";

describe("useProjectContracts", () => {
  beforeEach(() => {
    h.state.sovInsertRows = [];
    h.fromMock.mockClear();
  });

  it("persists cost_code_id on each saved SOV line", async () => {
    const { result } = renderHookWithClient(() => useProjectContracts("p1"));

    await act(async () => {
      await result.current.upsert.mutateAsync({
        contract: {
          contract_title: "Test Contract",
          contract_type: "subcontract",
          status: "draft",
          project_id: "p1",
        } as any,
        sovItems: [
          {
            item_number: 1,
            budget_code: "SEW8",
            cost_code_id: "cc-1",
            description: '8" PVC Sewer Main',
            quantity: 100,
            unit: "lf",
            unit_cost: 132,
            subtotal: 13200,
            completed_qty: 0,
            completed_pct: 0,
            billed_to_date: 0,
            contract_id: "",
          } as any,
        ],
      });
    });

    expect(h.state.sovInsertRows).toHaveLength(1);
    expect(h.state.sovInsertRows[0]).toMatchObject({
      cost_code_id: "cc-1",
      contract_id: "contract-1",
      tenant_id: "tenant-1",
    });
  });
});
