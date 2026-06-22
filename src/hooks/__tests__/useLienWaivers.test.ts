/**
 * useLienWaivers — branded lien-waiver create/list/update.
 * Covers: query gating, list happy path, create row-derivation from spec,
 * and error surfacing on the money path.
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

import { useLienWaivers } from "../useLienWaivers";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

const spec: any = {
  doc: { waiver_no: "LW-001", pay_app_no: "", date: "June 1, 2026" },
  type: "conditional_progress",
  parties: {
    claimant: { name: "D'Shin Plumbing", email: "ap@dshin.com" },
    customer: "", owner: "", project: "", property: "",
  },
  payment: { through_date: "2026-06-01", amount: "$12,500.00" },
  exceptions: {},
  signature: {},
};

describe("useLienWaivers", () => {
  beforeEach(() => __mock.reset());

  it("list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useLienWaivers(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists waivers for the given project", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: [{ id: "lr1", project_id: "p1" }], error: null }));
    const { result } = renderHookWithClient(() => useLienWaivers("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("lr1");
  });

  it("create derives the row from the spec (release_type, parsed amount, ISO date)", async () => {
    const builder = makeBuilder({ data: { id: "lr-new" }, error: null });
    __mock.from.mockReturnValue(builder);
    const { result } = renderHookWithClient(() => useLienWaivers("p1"));

    const row = await result.current.create.mutateAsync({ spec });
    expect(row.id).toBe("lr-new");

    const inserted = (builder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      project_id: "p1",
      tenant_id: "ws-1",
      direction: "inbound",
      release_type: "conditional_progress",
      amount: 12500,
      through_date: "2026-06-01",
      waiver_no: "LW-001",
      claimant_name: "D'Shin Plumbing",
      claimant_email: "ap@dshin.com",
      status: "pending",
    });
  });

  it("create surfaces insert errors (RLS / constraint) as a rejection", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: { message: "denied" } as any }));
    const { result } = renderHookWithClient(() => useLienWaivers("p1"));
    await expect(result.current.create.mutateAsync({ spec })).rejects.toBeTruthy();
  });
});
