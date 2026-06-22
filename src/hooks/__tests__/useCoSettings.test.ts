/**
 * useCoSettings — per-workspace change-order identity & defaults (white-label).
 * Covers: fetch happy path (no gating — always enabled), save upserting the
 * row keyed on workspace_id, and error surfacing when the upsert fails.
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

import { useCoSettings } from "../useCoSettings";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useCoSettings", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("fetches the workspace CO settings row", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: { workspace_id: "ws-1", company_name: "APAS" }, error: null }),
    );
    const { result } = renderHookWithClient(() => useCoSettings());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.company_name).toBe("APAS");
  });

  it("save upserts the patch keyed on workspace_id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    builder.upsert = vi.fn(() => builder) as any;
    __mock.from.mockReturnValue(builder);

    const { result } = renderHookWithClient(() => useCoSettings());
    await result.current.save.mutateAsync({ company_name: "New Co", default_profit_pct: 10 });

    const upserted = (builder.upsert as any).mock.calls[0][0];
    const opts = (builder.upsert as any).mock.calls[0][1];
    expect(upserted).toMatchObject({ workspace_id: "ws-1", company_name: "New Co", default_profit_pct: 10 });
    expect(upserted.updated_at).toBeTruthy();
    expect(opts).toMatchObject({ onConflict: "workspace_id" });
  });

  it("save surfaces upsert errors as a rejection", async () => {
    const builder = makeBuilder({ data: null, error: { message: "denied" } as any });
    builder.upsert = vi.fn(() => Promise.resolve({ data: null, error: { message: "denied" } })) as any;
    __mock.from.mockReturnValue(builder);

    const { result } = renderHookWithClient(() => useCoSettings());
    await expect(result.current.save.mutateAsync({ company_name: "x" })).rejects.toBeTruthy();
  });
});
