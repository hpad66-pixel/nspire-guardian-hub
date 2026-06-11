/**
 * WS-3 · persistence + delete/void hooks.
 *
 * happy:      the mutation resolves and (for #4/#12) invalidates the
 *             stat query key that drives the tiles.
 * validation: a malformed/blocked write surfaces as isError.
 * permission: an RLS denial (the policy boundary) surfaces as isError,
 *             never a false success.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
// useChangeOrders pulls these in at module load; keep them inert.
vi.mock("@/hooks/usePermissions", () => ({ useUserPermissions: () => ({ isAdmin: true }) }));
vi.mock("@/hooks/propertyAccess", () => ({ getAssignedProjectIds: vi.fn(async () => []) }));

import { useCreateProgressEntry } from "../useProjectProgress";
import { useCreatePurchaseOrder } from "../useProjectProcurement";
import { useDeletePunchItem } from "../usePunchItems";
import { useDeleteSubmittal } from "../useSubmittals";
import { useVoidChangeOrder } from "../useChangeOrders";
import { useDeleteSafetyIncident } from "../useProjectSafety";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

function renderWithSpy<T>(hook: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(hook, { wrapper }), invalidateSpy };
}

describe("WS-3 stat invalidation", () => {
  beforeEach(() => __mock.reset());

  it("#4 create progress entry invalidates ['ev-metrics', projectId]", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: { project_id: "p1" }, error: null }));
    const { result, invalidateSpy } = renderWithSpy(() => useCreateProgressEntry());
    await result.current.mutateAsync({ project_id: "p1", trade: "Concrete" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ev-metrics", "p1"] });
  });

  it("#12 create purchase order invalidates ['procurement-stats', projectId]", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: { project_id: "p1" }, error: null }));
    const { result, invalidateSpy } = renderWithSpy(() => useCreatePurchaseOrder());
    await result.current.mutateAsync({ project_id: "p1", vendor_name: "Acme" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["procurement-stats", "p1"] });
  });
});

describe("WS-3 delete / void hooks", () => {
  beforeEach(() => __mock.reset());

  it("#11 useDeletePunchItem happy path resolves", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderWithSpy(() => useDeletePunchItem());
    await expect(result.current.mutateAsync("punch1")).resolves.toBe("punch1");
  });

  it("#10 useDeleteSubmittal surfaces RLS denial as error", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderWithSpy(() => useDeleteSubmittal());
    result.current.mutate({ id: "s1", projectId: "p1" });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("#19 useVoidChangeOrder writes voided_at (non-destructive) on happy path", async () => {
    const builder = makeBuilder({ data: { id: "co1", voided_at: "now" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderWithSpy(() => useVoidChangeOrder());
    await result.current.mutateAsync("co1");
    const payload = builder.update.mock.calls[0][0];
    expect(payload.voided_at).toBeDefined();
  });

  it("#19 useDeleteSafetyIncident surfaces RLS denial as error", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderWithSpy(() => useDeleteSafetyIncident());
    result.current.mutate({ id: "i1", projectId: "p1" });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
