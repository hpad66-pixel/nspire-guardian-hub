/**
 * useReopenChangeOrder — admin reopen of a signed CO for amendment:
 * back to draft, signatures cleared, amendment audit appended.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useReopenChangeOrder } from "../useProcoreChangeOrders";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

function queue(results: Array<{ data?: unknown; error?: unknown }>) {
  let i = 0;
  const builders: any[] = [];
  __mock.from.mockImplementation(() => {
    const b = makeBuilder(results[Math.min(i, results.length - 1)]);
    builders[i] = b; i += 1;
    return b;
  });
  return builders;
}

describe("useReopenChangeOrder", () => {
  beforeEach(() => __mock.reset());

  it("reverts to draft, clears signatures + executed_date, and audits the reason", async () => {
    const builders = queue([
      { data: { status: "executed", locked: true, executed_date: "2026-04-22", amendment_history: [] }, error: null },
      { data: null, error: null },
    ]);
    const { result } = renderHookWithClient(() => useReopenChangeOrder());
    await result.current.mutateAsync({ coId: "co1", reason: "Client revised scope" });

    const patch = (builders[1].update as any).mock.calls[0][0];
    expect(patch).toMatchObject({
      status: "draft", locked: false, executed_date: null,
      submitted_signature_path: null, submitted_signed_at: null,
      accepted_signature_path: null, accepted_signed_at: null,
      accepted_signed_name: null, sent_to_client_at: null,
    });
    expect(patch.amendment_history).toHaveLength(1);
    expect(patch.amendment_history[0]).toMatchObject({ reason: "Client revised scope", from_status: "executed", was_executed: "2026-04-22" });
    expect(patch.amendment_history[0].at).toBeTruthy();
  });

  it("requires a reason", async () => {
    const { result } = renderHookWithClient(() => useReopenChangeOrder());
    await expect(result.current.mutateAsync({ coId: "co1", reason: "  " })).rejects.toThrow(/reason/i);
  });

  it("surfaces an update error", async () => {
    queue([
      { data: { status: "executed", locked: true, amendment_history: [] }, error: null },
      { data: null, error: { message: "denied" } },
    ]);
    const { result } = renderHookWithClient(() => useReopenChangeOrder());
    await expect(result.current.mutateAsync({ coId: "co1", reason: "x" })).rejects.toBeTruthy();
  });
});
