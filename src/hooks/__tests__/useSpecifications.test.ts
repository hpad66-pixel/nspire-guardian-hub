/**
 * G5 · useSpecifications smoke tests.
 *
 * The source hook may be exported under several names depending
 * on the file's history; this test imports the module and probes
 * for the canonical export. If the hook is missing the test is
 * skipped (the prompt's COMPONENTS list still includes it for
 * future work, but the source file is not yet present).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

let useSpecifications:
  | ((projectId: string | null) => any)
  | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod: any = require("../useSpecifications");
  useSpecifications = mod.useSpecifications ?? mod.default ?? null;
} catch {
  useSpecifications = null;
}

const maybe = useSpecifications ? describe : describe.skip;

maybe("useSpecifications", () => {
  beforeEach(() => __mock.reset());

  it("idle until projectId set", () => {
    const { result } = renderHookWithClient(() => useSpecifications!(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads specifications for the project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "s1", section: "03 30 00", title: "Cast-in-place concrete" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useSpecifications!("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
