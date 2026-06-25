/**
 * useSetPayAppStatus — manual pay-app status override (the dropdown).
 * Verifies derived fields stay sane across the status transitions.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useSetPayAppStatus, useDeletePayApp } from "../usePayApp";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useSetPayAppStatus", () => {
  beforeEach(() => __mock.reset());

  it("approving stamps approved_amount (= submitted), retainage, and date", async () => {
    let paBuilder: any;
    __mock.from.mockImplementation(((t: string) => {
      if (t === "prime_contracts") return makeBuilder({ data: { retainage_pct: 10 }, error: null });
      paBuilder = makeBuilder({ data: { submitted_amount: 1000, approved_amount: null, prime_contract_id: "pc1" }, error: null });
      return paBuilder;
    }) as any);
    const { result } = renderHookWithClient(() => useSetPayAppStatus());
    await result.current.mutateAsync({ payAppId: "pa1", status: "approved" });

    const patch = (paBuilder.update as any).mock.calls[0][0];
    expect(patch).toMatchObject({ status: "approved", approved_amount: 1000, retainage_held: 100 });
    expect(patch.approved_date).toBeTruthy();
  });

  it("reverting to draft clears the approved fields", async () => {
    const b = makeBuilder({ data: {}, error: null });
    __mock.from.mockReturnValue(b);
    const { result } = renderHookWithClient(() => useSetPayAppStatus());
    await result.current.mutateAsync({ payAppId: "pa1", status: "draft" });

    const patch = (b.update as any).mock.calls[0][0];
    expect(patch).toMatchObject({ status: "draft", approved_amount: null, retainage_held: null, approved_date: null });
  });

  it("marking paid changes only the status (keeps approved figures)", async () => {
    const b = makeBuilder({ data: {}, error: null });
    __mock.from.mockReturnValue(b);
    const { result } = renderHookWithClient(() => useSetPayAppStatus());
    await result.current.mutateAsync({ payAppId: "pa1", status: "paid" });

    expect((b.update as any).mock.calls[0][0]).toEqual({ status: "paid" });
  });

  it("surfaces an update error as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useSetPayAppStatus());
    await expect(result.current.mutateAsync({ payAppId: "pa1", status: "paid" })).rejects.toBeTruthy();
  });
});

describe("useDeletePayApp", () => {
  beforeEach(() => __mock.reset());

  it("deletes a draft pay app", async () => {
    const b = makeBuilder({ data: { status: "draft" }, error: null });
    __mock.from.mockReturnValue(b);
    const { result } = renderHookWithClient(() => useDeletePayApp());
    const id = await result.current.mutateAsync("pa1");
    expect(id).toBe("pa1");
    expect((b.delete as any)).toHaveBeenCalled();
    // status guard is applied in the delete filter
    expect((b.eq as any).mock.calls).toContainEqual(["status", "draft"]);
  });

  it("refuses to delete a non-draft pay app", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: { status: "approved" }, error: null }));
    const { result } = renderHookWithClient(() => useDeletePayApp());
    await expect(result.current.mutateAsync("pa1")).rejects.toThrow(/Only draft/);
  });

  it("rejects when the pay app does not exist", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => useDeletePayApp());
    await expect(result.current.mutateAsync("missing")).rejects.toThrow(/not found/);
  });
});
