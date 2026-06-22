/**
 * useSovProgress — read-only G703 quantity/progress grid sourced from the
 * `v_sov_current_progress` view. Covers: query gating, the numeric-coercion
 * mapping (string view columns -> numbers), and error surfacing.
 *
 * Note: query-only hook (no mutations).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useSovProgress } from "../useSovProgress";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useSovProgress", () => {
  beforeEach(() => __mock.reset());

  it("is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useSovProgress(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("coerces numeric view columns from strings to numbers", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: [
          {
            sov_line_item_id: "sov1",
            item_no: "1",
            kind: "base",
            description: "Mobilization",
            scheduled_qty: "10",
            unit_price: "2.5",
            scheduled_value: "25",
            qty_to_date: "5",
            value_to_date: "12.5",
            pct_complete: "50",
            retainage: "1.25",
            qty_remaining: "5",
            value_remaining: "12.5",
            sort_order: "1",
          },
        ],
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useSovProgress("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const row = result.current.data![0];
    expect(row.scheduled_qty).toBe(10);
    expect(row.unit_price).toBe(2.5);
    expect(row.scheduled_value).toBe(25);
    expect(row.pct_complete).toBe(50);
    expect(row.sort_order).toBe(1);
  });

  it("surfaces view query errors as query errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useSovProgress("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
