/**
 * D1 · usePrimeContract — single prime contract per project + create/update.
 * Covers: query gating, fetch happy path, create tenant-stamping the row,
 * and error surfacing on the create money path.
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

import { usePrimeContract } from "../usePrimeContract";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("usePrimeContract", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("query is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => usePrimeContract(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches the prime contract for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: { id: "pc1", project_id: "p1", contract_no: "PC-001" }, error: null }),
    );
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.contract_no).toBe("PC-001");
  });

  it("create stamps tenant + project and returns the row", async () => {
    const builder = makeBuilder({ data: { id: "pc-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));

    const row = await result.current.create.mutateAsync({
      contract_no: "PC-002",
      title: "Glorieta Prime",
      original_value: 1_000_000,
    } as any);
    expect(row.id).toBe("pc-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      tenant_id: "ws-1",
      project_id: "p1",
      contract_no: "PC-002",
      title: "Glorieta Prime",
      original_value: 1_000_000,
    });
  });

  it("create surfaces insert errors (RLS / constraint) as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => usePrimeContract("p1"));
    await expect(
      result.current.create.mutateAsync({
        contract_no: "PC-003",
        title: "x",
        original_value: 1,
      } as any),
    ).rejects.toBeTruthy();
  });
});
