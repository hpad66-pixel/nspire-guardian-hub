/**
 * useExecuteCoOffline — execute a CO from the client's uploaded signed scan.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useExecuteCoOffline } from "../useProcoreChangeOrders";
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

describe("useExecuteCoOffline", () => {
  beforeEach(() => __mock.reset());

  it("sets pdf_path + executed + locked from the uploaded signed copy", async () => {
    const builders = queue([
      { data: null, error: null }, // update1 (unlock + execute)
      { data: null, error: null }, // update2 (re-lock)
    ]);
    const { result } = renderHookWithClient(() => useExecuteCoOffline());
    await result.current.mutateAsync({
      coId: "co1", pdfPath: "https://signed/scan.pdf",
      executedDate: "2026-06-22", signerName: "Chris Sullivan",
    });

    const patch1 = (builders[0].update as any).mock.calls[0][0];
    expect(patch1).toMatchObject({
      locked: false, pdf_path: "https://signed/scan.pdf",
      status: "executed", executed_date: "2026-06-22", accepted_signed_name: "Chris Sullivan",
    });
    expect(patch1.accepted_signed_at).toBeTruthy();
    expect((builders[1].update as any).mock.calls[0][0]).toEqual({ locked: true });
  });

  it("refuses to execute without an uploaded copy", async () => {
    const { result } = renderHookWithClient(() => useExecuteCoOffline());
    await expect(result.current.mutateAsync({ coId: "co1", pdfPath: "", executedDate: "2026-06-22" }))
      .rejects.toThrow(/signed copy/i);
  });
});
