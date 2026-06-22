/**
 * useProjectDocuments / useTransmittals — B5 documents + transmittals.
 * Covers: query gating, list happy path, transmittal create (resolves tenant via
 * requireTenantId, pulls a number via the `next_transmittal_number` RPC, then
 * inserts the transmittal + items), and the list error path.
 *
 * Note: these hooks resolve the tenant via `requireTenantId` from @/lib/tenant
 * (mocked) and the transmittal create makes an RPC call before inserting across
 * two tables (transmittals + transmittal_items) — table-aware mocking keeps the
 * mount list query from stealing a sequenced mock.
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

import { useProjectDocuments, useTransmittals } from "../useProjectDocuments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProjectDocuments", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("document list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProjectDocuments(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists pl_documents for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "d1", project_id: "p1", name: "Spec.pdf" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProjectDocuments("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Spec.pdf");
  });

  it("list surfaces RLS errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useProjectDocuments("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useTransmittals", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("transmittal list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useTransmittals(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("create stamps tenant + project + number and inserts items", async () => {
    __mock.rpc.mockResolvedValue({ data: "TX-003", error: null } as any);
    const txBuilder = makeBuilder({ data: { id: "tx-new" }, error: null });
    const itemsBuilder = makeBuilder({ data: null, error: null });
    __mock.from.mockImplementation((table: string) =>
      table === "transmittal_items" ? itemsBuilder : txBuilder,
    );

    const { result } = renderHookWithClient(() => useTransmittals("p1"));
    const row = await result.current.create.mutateAsync({
      subject: "For review",
      documentIds: [{ id: "d1", version: 2 }],
    });
    expect((row as any).id).toBe("tx-new");

    const insertedTx = (txBuilder.insert as any).mock.calls[0][0];
    expect(insertedTx).toMatchObject({
      tenant_id: "ws-1",
      project_id: "p1",
      number: "TX-003",
      subject: "For review",
    });
    const insertedItems = (itemsBuilder.insert as any).mock.calls[0][0];
    expect(insertedItems[0]).toMatchObject({
      transmittal_id: "tx-new",
      document_id: "d1",
      version: 2,
    });
  });
});
