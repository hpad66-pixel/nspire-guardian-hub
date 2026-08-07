/**
 * F0 · useCommitmentPayments — AP disbursements against a commitment invoice.
 * Covers: query gating, list happy path, create stamping tenant + created_by,
 * and the DB lien-gate guard surfacing as a typed CommitmentPaymentError.
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

import { useCommitmentPayments, CommitmentPaymentError } from "../useCommitmentPayments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

const input = {
  commitment_id: "c1",
  commitment_invoice_id: "inv1",
  amount: 5000,
  paid_date: "2026-06-01",
};

describe("useCommitmentPayments", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("list is disabled until an invoiceId is provided", () => {
    const { result } = renderHookWithClient(() => useCommitmentPayments(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists payments for the given invoice", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "pay1", commitment_invoice_id: "inv1", amount: 5000 }], error: null }),
    );
    const { result } = renderHookWithClient(() => useCommitmentPayments("inv1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("pay1");
  });

  it("create stamps tenant + created_by and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "pay-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCommitmentPayments("inv1"));

    const row = await result.current.create.mutateAsync(input as any);
    expect(row.id).toBe("pay-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      commitment_id: "c1",
      commitment_invoice_id: "inv1",
      amount: 5000,
      paid_date: "2026-06-01",
      tenant_id: "ws-1",
      created_by: "u1",
    });
  });

  it("create classifies a LIEN_REQUIRED guard error as a typed error", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "LIEN_REQUIRED: blocked" } as any }),
    );
    const { result } = renderHookWithClient(() => useCommitmentPayments("inv1"));
    await expect(result.current.create.mutateAsync(input as any)).rejects.toMatchObject({
      code: "LIEN_REQUIRED",
    });
  });

  it("create classifies an OVERPAYMENT guard error as a typed error", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "OVERPAYMENT exceeded" } as any }),
    );
    const { result } = renderHookWithClient(() => useCommitmentPayments("inv1"));
    await expect(result.current.create.mutateAsync(input as any)).rejects.toBeInstanceOf(
      CommitmentPaymentError,
    );
  });
});
