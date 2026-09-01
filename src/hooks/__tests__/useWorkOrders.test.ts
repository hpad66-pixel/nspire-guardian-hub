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
  useUpdateWorkOrder,
  useAssignWorkOrder,
  useAssignWorkOrderCrew,
  useCompleteWorkOrder,
  useVerifyWorkOrder,
} from "../useWorkOrders";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder, supabase } from "@/test/fixtures/supabase";

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

  it("lists work orders by property when propertyId is set", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "wo-p", property_id: "prop1" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useWorkOrdersByProperty("prop1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("wo-p");
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

  it("create auto-assigns ops supervisor when RPC returns one", async () => {
    __mock.rpc.mockResolvedValueOnce({ data: "sup-1", error: null });
    const builder = makeBuilder({ data: { id: "wo-sup" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreateWorkOrder());

    await result.current.mutateAsync({
      property_id: "prop1",
      title: "Voice leak",
      intake_source: "manual",
    } as any);
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      supervisor_id: "sup-1",
      assigned_to: "sup-1",
      status: "assigned",
      intake_source: "manual",
    });
  });

  it("create surfaces insert errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "insert failed" } as any }),
    );
    const { result } = renderHookWithClient(() => useCreateWorkOrder());
    await expect(
      result.current.mutateAsync({
        property_id: "prop1",
        title: "Broken",
      } as any),
    ).rejects.toBeTruthy();
  });

  it("update patches work order fields", async () => {
    const builder = makeBuilder({ data: { id: "wo1", notes: "done" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useUpdateWorkOrder());
    await result.current.mutateAsync({ id: "wo1", notes: "done" } as any);
    expect((builder.update as any).mock.calls[0][0]).toMatchObject({ notes: "done" });
  });

  it("assign sets supervisor + assigned status", async () => {
    const builder = makeBuilder({ data: { id: "wo1", status: "assigned" }, error: null });
    __mock.from.mockReturnValue(builder);
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const { result } = renderHookWithClient(() => useAssignWorkOrder());

    await result.current.mutateAsync({ id: "wo1", assigneeId: "u9" });
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({
      assigned_to: "u9",
      supervisor_id: "u9",
      status: "assigned",
    });
  });

  it("assign crew dispatches tech and sets in_progress", async () => {
    const builder = makeBuilder({
      data: { id: "wo1", status: "in_progress", crew_assigned_to: "tech-1" },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    const { result } = renderHookWithClient(() => useAssignWorkOrderCrew());
    await result.current.mutateAsync({ id: "wo1", crewUserId: "tech-1" });
    expect((builder.update as any).mock.calls[0][0]).toMatchObject({
      crew_assigned_to: "tech-1",
      status: "in_progress",
    });
  });

  it("complete marks completed and stores proof photos", async () => {
    const builder = makeBuilder({
      data: { id: "wo1", status: "completed" },
      error: null,
    });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCompleteWorkOrder());
    await result.current.mutateAsync({
      id: "wo1",
      proofPhotos: ["https://x/a.jpg"],
    });
    expect((builder.update as any).mock.calls[0][0]).toMatchObject({
      status: "completed",
      proof_photos: ["https://x/a.jpg"],
    });
  });

  it("complete surfaces parts-gate errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: null,
        error: { message: "WO_PARTS_NOT_INSTALLED: 1 part(s) still assigned" } as any,
      }),
    );
    const { result } = renderHookWithClient(() => useCompleteWorkOrder());
    await expect(result.current.mutateAsync({ id: "wo1" })).rejects.toBeTruthy();
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
