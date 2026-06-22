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

import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
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
});
