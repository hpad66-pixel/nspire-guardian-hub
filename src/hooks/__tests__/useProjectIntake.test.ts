/**
 * useProjectIntake — F0 per-project inbound email + drop folder.
 * The detail query reads project_intake; provision/revoke go through the
 * intake-ingest edge function (the upload token is minted server-side and
 * returned once — rule 10). Covers: detail gating, the detail happy path, the
 * provision invoke (action + project_id payload), and error surfacing on
 * revoke.
 *
 * Note: this hook spreads the detail query result and bolts on provision/revoke
 * mutations ({ ...detail, provision, revoke }) — the mutations drive edge
 * functions rather than direct table writes.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

import { useProjectIntake } from "../useProjectIntake";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useProjectIntake", () => {
  beforeEach(() => __mock.reset());

  it("detail query is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProjectIntake(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("reads the intake row for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({
        data: { id: "in1", project_id: "p1", intake_email: "p1@intake.example" },
        error: null,
      }),
    );
    const { result } = renderHookWithClient(() => useProjectIntake("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.intake_email).toBe("p1@intake.example");
  });

  it("provision invokes intake-ingest with the provision action", async () => {
    __mock.invoke.mockResolvedValue({
      data: { intake: { id: "in1" }, token: "plaintext-once" },
      error: null,
    });
    const { result } = renderHookWithClient(() => useProjectIntake("p1"));

    const res = await result.current.provision.mutateAsync();
    expect(res.token).toBe("plaintext-once");
    expect(__mock.invoke).toHaveBeenCalledWith(
      "intake-ingest",
      expect.objectContaining({ body: { action: "provision", project_id: "p1" } }),
    );
  });

  it("revoke surfaces edge-function errors as a rejection", async () => {
    __mock.invoke.mockResolvedValue({ data: null, error: { message: "denied" } as any });
    const { result } = renderHookWithClient(() => useProjectIntake("p1"));
    await expect(result.current.revoke.mutateAsync()).rejects.toBeTruthy();
  });
});
