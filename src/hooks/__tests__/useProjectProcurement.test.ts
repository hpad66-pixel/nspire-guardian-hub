/**
 * useProjectProcurement — project_purchase_orders list + create/update/delete
 * and the procurement stat tiles. Covers: PO-list query gating, the list happy
 * path, the create insert payload (stamps created_by from the auth user), and
 * error surfacing on update.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
  useProcurementStats,
} from "../useProjectProcurement";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProjectProcurement", () => {
  beforeEach(() => __mock.reset());

  it("PO list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => usePurchaseOrders(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists purchase orders for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "po1", project_id: "p1", vendor_name: "Acme" }], error: null }),
    );
    const { result } = renderHookWithClient(() => usePurchaseOrders("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].vendor_name).toBe("Acme");
  });

  it("create stamps created_by from the auth user", async () => {
    const builder = makeBuilder({ data: { id: "po-new", project_id: "p1" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreatePurchaseOrder());

    await result.current.mutateAsync({
      project_id: "p1",
      vendor_name: "Acme Supply",
      total: 5000,
    } as any);
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      project_id: "p1",
      vendor_name: "Acme Supply",
      created_by: "u1",
    });
  });

  it("update surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useUpdatePurchaseOrder());
    await expect(
      result.current.mutateAsync({ id: "po1", status: "approved" } as any),
    ).rejects.toBeTruthy();
  });

  it("create surfaces insert errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useCreatePurchaseOrder());
    await expect(
      result.current.mutateAsync({ project_id: "p1", vendor_name: "Acme" } as any),
    ).rejects.toBeTruthy();
  });

  it("update patches by id (id excluded from the update payload)", async () => {
    const builder = makeBuilder({ data: { id: "po1", project_id: "p1" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useUpdatePurchaseOrder());

    await result.current.mutateAsync({ id: "po1", status: "delivered" } as any);

    const updates = (builder.update as any).mock.calls[0][0];
    expect(updates).toMatchObject({ status: "delivered" });
    expect(updates.id).toBeUndefined();
    expect((builder.eq as any).mock.calls[0]).toEqual(["id", "po1"]);
  });

  it("delete removes the PO and returns the projectId for invalidation", async () => {
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useDeletePurchaseOrder());

    const out = await result.current.mutateAsync({ id: "po1", projectId: "p1" } as any);
    expect(out).toEqual({ projectId: "p1" });
    expect((builder.delete as any)).toHaveBeenCalled();
    expect((builder.eq as any).mock.calls[0]).toEqual(["id", "po1"]);
  });

  it("delete surfaces errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useDeletePurchaseOrder());
    await expect(
      result.current.mutateAsync({ id: "po1", projectId: "p1" } as any),
    ).rejects.toBeTruthy();
  });
});

describe("useProcurementStats", () => {
  beforeEach(() => __mock.reset());

  it("stats query is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProcurementStats(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("aggregates totalSpent (approved + delivered) and pending (pending + draft) counts", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { status: "approved", total: 1000 },
          { status: "delivered", total: 500 },
          { status: "pending", total: 200 },
          { status: "draft", total: 0 },
          { status: "rejected", total: 999 },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useProcurementStats("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      totalPOs: 5,
      totalSpent: 1500,
      pending: 2,
    });
  });

  it("returns zeroed stats when there are no POs", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: [], error: null }));
    const { result } = renderHookWithClient(() => useProcurementStats("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ totalPOs: 0, totalSpent: 0, pending: 0 });
  });

  it("stats query surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useProcurementStats("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
