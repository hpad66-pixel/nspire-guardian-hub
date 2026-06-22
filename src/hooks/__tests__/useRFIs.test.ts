/**
 * useRFIs — legacy project_rfis CRUD (list/single/stats + create/update/
 * respond/close). Covers query gating, list happy path, the create insert
 * payload, the respond-to status transition, and error surfacing.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import {
  useRFIsByProject,
  useCreateRFI,
  useRespondToRFI,
  useCloseRFI,
} from "../useRFIs";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useRFIs", () => {
  beforeEach(() => __mock.reset());

  it("list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useRFIsByProject(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists project_rfis for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "rfi1", project_id: "p1", rfi_number: 3 }], error: null }),
    );
    const { result } = renderHookWithClient(() => useRFIsByProject("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].rfi_number).toBe(3);
  });

  it("create inserts the supplied RFI row", async () => {
    const builder = makeBuilder({ data: { id: "rfi-new", rfi_number: 7 }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useCreateRFI());

    const row = await result.current.mutateAsync({
      project_id: "p1",
      subject: "Beam spec",
    } as any);
    expect(row.id).toBe("rfi-new");
    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({ project_id: "p1", subject: "Beam spec" });
  });

  it("respondToRFI stamps response + answered status", async () => {
    const builder = makeBuilder({ data: { id: "rfi1", status: "answered" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useRespondToRFI());

    await result.current.mutateAsync({
      id: "rfi1",
      response: "Use grade 60 rebar",
      respondedBy: "u1",
    });
    const updated = (builder.update as any).mock.calls[0][0];
    expect(updated).toMatchObject({
      response: "Use grade 60 rebar",
      responded_by: "u1",
      status: "answered",
    });
    expect(updated.responded_at).toBeTruthy();
  });

  it("closeRFI surfaces update errors as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useCloseRFI());
    await expect(result.current.mutateAsync("rfi1")).rejects.toBeTruthy();
  });
});
