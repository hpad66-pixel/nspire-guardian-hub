/**
 * F0 · usePrimeContractPayments — AR cash receipts against a prime pay app.
 * Covers: query gating, list happy path, create stamping tenant + created_by,
 * and the DB OVERPAYMENT guard surfacing as a friendly rejection.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  resolveCurrentWorkspaceId: vi.fn(async () => "ws-1"),
}));

import { usePrimeContractPayments, usePrimeContractPaymentsTotal } from "../usePrimeContractPayments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

const input = {
  prime_contract_id: "pc1",
  pay_app_id: "pa1",
  amount: 25000,
  received_date: "2026-06-01",
};

describe("usePrimeContractPayments", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("list is disabled until a payAppId is provided", () => {
    const { result } = renderHookWithClient(() => usePrimeContractPayments(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists receipts for the given pay app", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "r1", pay_app_id: "pa1", amount: 25000 }], error: null }),
    );
    const { result } = renderHookWithClient(() => usePrimeContractPayments("pa1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("r1");
  });

  it("create stamps tenant + created_by and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "r-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContractPayments("pa1"));

    const row = await result.current.create.mutateAsync(input as any);
    expect(row.id).toBe("r-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      prime_contract_id: "pc1",
      pay_app_id: "pa1",
      amount: 25000,
      received_date: "2026-06-01",
      tenant_id: "ws-1",
      created_by: "u1",
    });
  });

  it("create surfaces an OVERPAYMENT guard as a friendly rejection", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "OVERPAYMENT: too much" } as any }),
    );
    const { result } = renderHookWithClient(() => usePrimeContractPayments("pa1"));
    await expect(result.current.create.mutateAsync(input as any)).rejects.toThrow(
      /remaining balance/i,
    );
  });

  it("create surfaces other insert errors as a rejection", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => usePrimeContractPayments("pa1"));
    await expect(result.current.create.mutateAsync(input as any)).rejects.toBeTruthy();
  });
});

describe("usePrimeContractPaymentsTotal", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("is disabled until a primeContractId is provided", () => {
    const { result } = renderHookWithClient(() => usePrimeContractPaymentsTotal(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("sums every receipt on the contract (all pay apps)", async () => {
    const builder = makeBuilder({
      data: [{ amount: 25000 }, { amount: 40000 }, { amount: 10000.5 }],
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContractPaymentsTotal("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(75000.5);
    expect((builder.eq as any).mock.calls[0]).toEqual(["prime_contract_id", "pc1"]);
  });

  it("returns 0 when there are no receipts", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { result } = renderHookWithClient(() => usePrimeContractPaymentsTotal("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it("surfaces query errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => usePrimeContractPaymentsTotal("pc1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
