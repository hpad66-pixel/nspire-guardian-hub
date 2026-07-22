/**
 * D1 · usePrimeContract — single prime contract per project + create/update.
 * Covers: query gating, fetch happy path, create tenant-stamping the row,
 * and error surfacing on the create money path.
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
  usePrimeContract,
  usePrimeContractSov,
  usePrimeContractTotals,
  usePayApps,
} from "../usePrimeContract";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("usePrimeContract", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("query is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => usePrimeContract(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches the prime contract for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: { id: "pc1", project_id: "p1", contract_no: "PC-001" }, error: null }),
    );
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.contract_no).toBe("PC-001");
  });

  it("create stamps tenant + project and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "pc-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));

    const row = await result.current.create.mutateAsync({
      contract_no: "PC-002",
      title: "Glorieta Prime",
      original_value: 1_000_000,
    } as any);
    expect(row.id).toBe("pc-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      tenant_id: "ws-1",
      project_id: "p1",
      contract_no: "PC-002",
      title: "Glorieta Prime",
      original_value: 1_000_000,
    });
  });

  it("create surfaces insert errors (RLS / constraint) as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));
    await expect(
      result.current.create.mutateAsync({
        contract_no: "PC-003",
        title: "x",
        original_value: 1,
      } as any),
    ).rejects.toBeTruthy();
  });

  it("update patches by id and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "pc1", status: "executed" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));

    const row = await result.current.update.mutateAsync({
      id: "pc1",
      status: "executed",
      executed_date: "2026-06-01",
    } as any);
    expect(row.status).toBe("executed");

    const patch = (builder.update as any).mock.calls[0][0];
    expect(patch).toMatchObject({ status: "executed", executed_date: "2026-06-01" });
    expect(patch.id).toBeUndefined(); // id is destructured out of the patch
    expect((builder.eq as any).mock.calls).toContainEqual(["id", "pc1"]);
  });

  it("update surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));
    await expect(
      result.current.update.mutateAsync({ id: "pc1", status: "closed" } as any),
    ).rejects.toBeTruthy();
  });
});

describe("usePrimeContractSov", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("query is disabled until a primeContractId is provided", () => {
    const { result } = renderHookWithClient(() => usePrimeContractSov(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists base SOV lines from sov_line_items ordered by sort_order", async () => {
    const builder = makeBuilder({
      data: [{ id: "sov1", prime_contract_id: "pc1", item_no: "1", scheduled_value: 100 }],
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContractSov("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].scheduled_value).toBe(100);
    expect(result.current.data?.[0].line_no).toBe(1);
    expect((builder.eq as any).mock.calls[0]).toEqual(["prime_contract_id", "pc1"]);
    expect((builder.eq as any).mock.calls[1]).toEqual(["kind", "base"]);
    expect((builder.order as any).mock.calls[0][0]).toBe("sort_order");
  });

  it("addLine stamps tenant + prime_contract_id and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "sov-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContractSov("pc1"));

    const row = await result.current.addLine.mutateAsync({
      line_no: 2,
      cost_code_id: "cc1",
      description: "Sitework",
      scheduled_value: 5000,
    } as any);
    expect(row.id).toBe("sov-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      tenant_id: "ws-1",
      prime_contract_id: "pc1",
      line_no: 2,
      cost_code_id: "cc1",
      description: "Sitework",
      scheduled_value: 5000,
    });
  });

  it("addLine surfaces insert errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => usePrimeContractSov("pc1"));
    await expect(
      result.current.addLine.mutateAsync({
        line_no: 1,
        cost_code_id: "cc1",
        description: "x",
        scheduled_value: 1,
      } as any),
    ).rejects.toBeTruthy();
  });
});

describe("usePrimeContractTotals", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("query is disabled until a primeContractId is provided", () => {
    const { result } = renderHookWithClient(() => usePrimeContractTotals(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches the totals row for the contract", async () => {
    const builder = makeBuilder({
      data: {
        prime_contract_id: "pc1",
        original_value: 1000,
        executed_co_value: 200,
        revised_contract_value: 1200,
        billed_to_date: 300,
      },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContractTotals("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.revised_contract_value).toBe(1200);
    expect((builder.eq as any).mock.calls[0]).toEqual(["prime_contract_id", "pc1"]);
  });

  it("returns null when there is no totals row", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => usePrimeContractTotals("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("usePayApps", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("query is disabled until a primeContractId is provided", () => {
    const { result } = renderHookWithClient(() => usePayApps(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists pay apps newest-first by pay_app_no", async () => {
    const builder = makeBuilder({
      data: [{ id: "pa1", prime_contract_id: "pc1", pay_app_no: 3 }],
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePayApps("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data?.[0] as any).pay_app_no).toBe(3);
    expect((builder.order as any).mock.calls[0]).toEqual([
      "pay_app_no",
      { ascending: false },
    ]);
  });

  it("create stamps tenant + prime_contract_id and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "pa-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePayApps("pc1"));

    const row = await result.current.create.mutateAsync({
      pay_app_no: 1,
      period_end: "2026-06-30",
    } as any);
    expect((row as any).id).toBe("pa-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      tenant_id: "ws-1",
      prime_contract_id: "pc1",
      pay_app_no: 1,
      period_end: "2026-06-30",
    });
  });

  it("create surfaces insert errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => usePayApps("pc1"));
    await expect(
      result.current.create.mutateAsync({ pay_app_no: 1, period_end: "2026-06-30" } as any),
    ).rejects.toBeTruthy();
  });
});
