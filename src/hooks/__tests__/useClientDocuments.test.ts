import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useClientDocuments } from "../useClientDocuments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useClientDocuments", () => {
  beforeEach(() => __mock.reset());

  it("loads curated files for a project", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "d1", name: "Owner briefing.pdf", project_id: "p1" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useClientDocuments("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe("Owner briefing.pdf");
  });

  it("does not query without a project id", async () => {
    const { result } = renderHookWithClient(() => useClientDocuments(undefined));
    expect(result.current.fetchStatus).toBe("idle");
    expect(__mock.from).not.toHaveBeenCalled();
  });

  it("surfaces permission and validation errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null,
      error: { message: "permission denied" } as any,
    }));
    const { result } = renderHookWithClient(() => useClientDocuments("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
