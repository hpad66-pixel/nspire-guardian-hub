/**
 * useWorkOrders — work_orders list + create/update/assign/complete/verify.
 * Covers: the (ungated) list happy path, the create insert payload, the assign
 * mutation's status transition, the verify status transition, and error
 * surfacing on update.
 *
 * Note: the top-level useWorkOrders() list takes no argument, so there is no
 * id-gating test here. The neq-filtered variants (useOpenWorkOrders /
 * useEmergencyWorkOrders) and the stat aggregator (useWorkOrderStats) are now
 * exercised — the shared builder fixture models neq.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import {
  useWorkOrders,
  useOpenWorkOrders,
  useEmergencyWorkOrders,
  useWorkOrderStats,
  useWorkOrdersByProperty,
  useCreateWorkOrder,
  useAssignWorkOrder,
  useVerifyWorkOrder,
} from "../useWorkOrders";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useWorkOrders", () => {
  beforeEach(() => __mock.reset());

  it("by-property list is disabled until a propertyId is provided", () => {
    const { result } = renderHookWithClient(() => useWorkOrdersByProperty(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists all work orders", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "wo1", status: "pending" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useWorkOrders());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("wo1");
  });

  it("open work orders filters out verified (.neq path)", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "wo2", status: "in_progress" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useOpenWorkOrders());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("wo2");
  });

  it("emergency work orders filters priority + status (.eq + .neq path)", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "wo3", priority: "emergency", status: "pending" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useEmergencyWorkOrders());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("wo3");
  });

  it("stats aggregates status/priority/overdue counts", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          { status: "pending", priority: "normal", due_date: "2999-01-01" },
          { status: "in_progress", priority: "emergency", due_date: "2999-01-01" },
          { status: "verified", priority: "normal", due_date: "2000-01-01" },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useWorkOrderStats());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      pending: 1,
      inProgress: 1,
      verified: 1,
      emergency: 1,
      total: 3,
    });
  });

  it("create inserts the supplied work order", async () => {
    const builder = makeBuilder({ data: { id: "wo-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreateWorkOrder());

    await result.current.mutateAsync({
      property_id: "prop1",
      title: "Fix leak",
      status: "pending",
    } as any);
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({ property_id: "prop1", title: "Fix leak" });
  });

  it("assign sets assigned_to + assigned status", async () => {
    const builder = makeBuilder({ data: { id: "wo1", status: "assigned" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useAssignWorkOrder());

    await result.current.mutateAsync({ id: "wo1", assigneeId: "u9" });
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({ assigned_to: "u9", status: "assigned" });
  });

  it("verify sets status to verified", async () => {
    const builder = makeBuilder({ data: { id: "wo1", status: "verified" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useVerifyWorkOrder());

    await result.current.mutateAsync("wo1");
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({ status: "verified" });
  });

  it("verify surfaces update errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useVerifyWorkOrder());
    await expect(result.current.mutateAsync("wo1")).rejects.toBeTruthy();
  });
});
