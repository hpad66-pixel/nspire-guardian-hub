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

import {
  usePrimeContractPaymentAdministration,
  usePrimeContractPayments,
  usePrimeContractPaymentsTotal,
} from "../usePrimeContractPayments";
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

    const row = await result.current.create.mutateAsync(input);
    expect(row.id).toBe("r-new");

    const inserted = builder.insert.mock.calls[0][0];
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
      makeBuilder({ data: null, error: { message: "OVERPAYMENT: too much" } }),
    );
    const { result } = renderHookWithClient(() => usePrimeContractPayments("pa1"));
    await expect(result.current.create.mutateAsync(input)).rejects.toThrow(
      /remaining balance/i,
    );
  });

  it("create surfaces other insert errors as a rejection", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } }),
    );
    const { result } = renderHookWithClient(() => usePrimeContractPayments("pa1"));
    await expect(result.current.create.mutateAsync(input)).rejects.toBeTruthy();
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
    expect(builder.eq.mock.calls[0]).toEqual(["prime_contract_id", "pc1"]);
  });

  it("returns 0 when there are no receipts", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { result } = renderHookWithClient(() => usePrimeContractPaymentsTotal("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it("surfaces query errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } }));
    const { result } = renderHookWithClient(() => usePrimeContractPaymentsTotal("pc1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("usePrimeContractPaymentAdministration", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("is disabled until a prime contract is provided", () => {
    const { result } = renderHookWithClient(() => usePrimeContractPaymentAdministration(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("marks receipts as locked when they have allocation rows", async () => {
    const payments = makeBuilder({
      data: [
        { id: "r1", amount: 75000, prime_contract_id: "pc1" },
        { id: "r2", amount: 25000, prime_contract_id: "pc1" },
      ],
      error: null,
    });
    const allocations = makeBuilder({
      data: [{ payment_id: "r1" }, { payment_id: "r1" }],
      error: null,
    });
    __mock.from.mockImplementation((table: string) =>
      table === "prime_payment_allocations" ? allocations : payments,
    );

    const { result } = renderHookWithClient(() => usePrimeContractPaymentAdministration("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      expect.objectContaining({ id: "r1", allocation_count: 2 }),
      expect.objectContaining({ id: "r2", allocation_count: 0 }),
    ]);
    expect(allocations.in.mock.calls[0]).toEqual(["payment_id", ["r1", "r2"]]);
  });

  it("updates only the editable receipt fields", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { result } = renderHookWithClient(() => usePrimeContractPaymentAdministration("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const updateBuilder = makeBuilder({ data: { id: "r1", amount: 70000 }, error: null });
    __mock.from.mockReturnValue(updateBuilder);
    await result.current.update.mutateAsync({
      id: "r1",
      changes: {
        amount: 70000,
        received_date: "2026-08-06",
        method: "wire",
        reference: "WIRE-1",
        notes: null,
      },
    });

    expect(updateBuilder.update.mock.calls[0][0]).toEqual({
      amount: 70000,
      received_date: "2026-08-06",
      method: "wire",
      reference: "WIRE-1",
      notes: null,
    });
    expect(updateBuilder.eq.mock.calls[0]).toEqual(["id", "r1"]);
  });

  it("rejects a delete when the database does not return the receipt", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { result } = renderHookWithClient(() => usePrimeContractPaymentAdministration("pc1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    await expect(result.current.remove.mutateAsync("r1")).rejects.toThrow(/unallocated receipt/i);
  });
});
