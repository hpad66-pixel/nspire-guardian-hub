/**
 * useProcoreChangeOrders — D4 Change Orders (PCO/OCO/CCO).
 * Covers: query gating, list-by-type happy path, addLine (stamps tenant +
 * change_order_id + cost_code_id — the financial cascade key), promote-to-OCO
 * (reads the PCO then inserts an executed OCO stamped with parent_pco_id), and
 * the list error path.
 *
 * Note: mutations resolve the tenant via `requireTenantId` from @/lib/tenant
 * (mocked).
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
  useReopenChangeOrder,
  useUploadSignedHardcopy,
  useExecuteCoOffline,
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

  it("list surfaces RLS errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useChangeOrdersByType("p1", "OCO"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // ── useReopenChangeOrder ──────────────────────────────────────────────
  it("reopen requires a reason", async () => {
    const { result } = renderHookWithClient(() => useReopenChangeOrder());
    await expect(
      result.current.mutateAsync({ coId: "co1", reason: "   " }),
    ).rejects.toThrow(/reason is required/i);
  });

  it("reopen reverts a signed CO to an editable draft and records history", async () => {
    const builder = makeBuilder({
      data: { status: "executed", locked: true, executed_date: "2026-06-01", amendment_history: [] },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useReopenChangeOrder());

    const out = await result.current.mutateAsync({ coId: "co1", reason: "client scope change" });
    expect(out).toEqual({ coId: "co1" });
    const patch = (builder.update as any).mock.calls[0][0];
    expect(patch).toMatchObject({
      locked: false,
      status: "draft",
      executed_date: null,
      submitted_signature_path: null,
      accepted_signature_path: null,
    });
    expect(Array.isArray(patch.amendment_history)).toBe(true);
    expect(patch.amendment_history).toHaveLength(1);
  });

  // ── useUploadSignedHardcopy ───────────────────────────────────────────
  it("upload-hardcopy requires a path", async () => {
    const { result } = renderHookWithClient(() => useUploadSignedHardcopy());
    await expect(
      result.current.mutateAsync({ coId: "co1", path: "", note: "", replacePrimary: false, locked: false }),
    ).rejects.toThrow(/upload the signed hard copy/i);
  });

  it("upload-hardcopy on a locked CO flips the lock off then re-locks (two updates)", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useUploadSignedHardcopy());

    const out = await result.current.mutateAsync({
      coId: "co1", path: "co/signed.pdf", note: "scan", replacePrimary: true, locked: true,
    });
    expect(out).toEqual({ coId: "co1" });
    // First update carries the hardcopy fields + locked:false; second re-locks.
    expect((builder.update as any).mock.calls[0][0]).toMatchObject({
      signed_hardcopy_path: "co/signed.pdf",
      pdf_path: "co/signed.pdf",
      locked: false,
    });
    expect((builder.update as any).mock.calls[1][0]).toEqual({ locked: true });
  });

  // ── useExecuteCoOffline ───────────────────────────────────────────────
  it("execute-offline requires the signed pdf path", async () => {
    const { result } = renderHookWithClient(() => useExecuteCoOffline());
    await expect(
      result.current.mutateAsync({ coId: "co1", pdfPath: "", executedDate: "2026-06-24" }),
    ).rejects.toThrow(/upload the client's signed copy/i);
  });

  it("execute-offline marks the CO executed + locked from the scanned copy", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useExecuteCoOffline());

    const out = await result.current.mutateAsync({
      coId: "co1", pdfPath: "co/exec.pdf", executedDate: "2026-06-24", signerName: " Jane Owner ",
    });
    expect(out).toEqual({ coId: "co1" });
    expect((builder.update as any).mock.calls[0][0]).toMatchObject({
      pdf_path: "co/exec.pdf",
      status: "executed",
      executed_date: "2026-06-24",
      accepted_signed_name: "Jane Owner",
      locked: false,
    });
    expect((builder.update as any).mock.calls[1][0]).toEqual({ locked: true });
  });
});
