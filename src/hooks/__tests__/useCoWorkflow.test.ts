/**
 * useCoWorkflow — change-order persistence (generate docx/pdf + write row).
 * Covers: create resolving the prime contract + stamping the change_orders
 * row (co_type PCO, amount from pricing, draft status), and error surfacing
 * when the insert fails. Artifact generation is mocked — it must never block.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  resolveCurrentWorkspaceId: vi.fn(async () => "ws-1"),
}));
vi.mock("@/lib/changeOrder/generateDocx", () => ({
  generateCoDocx: vi.fn(async () => new Blob(["docx"])),
}));
vi.mock("@/lib/changeOrder/storage", () => ({
  uploadCoArtifact: vi.fn(async () => "path/to/artifact"),
}));
vi.mock("@/lib/changeOrder/pricing", () => ({
  grandTotalNumber: vi.fn(() => 4200),
}));

import { useCoWorkflow } from "../useCoWorkflow";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

const spec: any = {
  doc: { co_number: "7", title: "Added scope", co_label: "PCO-007" },
  pricing: {},
};

describe("useCoWorkflow", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("create resolves the prime contract, then stamps the change_orders row", async () => {
    // First from() resolves the prime contract id (maybeSingle), second is the insert.
    const primeBuilder = makeBuilder({ data: { id: "pc-1" }, error: null });
    const insertBuilder = makeBuilder({ data: { id: "co-new" }, error: null });
    __mock.from
      .mockReturnValueOnce(primeBuilder)
      .mockReturnValueOnce(insertBuilder);

    const { result } = renderHookWithClient(() => useCoWorkflow("p1"));

    const row = await result.current.create.mutateAsync({
      projectId: "p1",
      primeContractId: null,
      spec,
      previewPdf: null,
    });
    expect(row.id).toBe("co-new");

    const inserted = (insertBuilder.insert as any).mock.calls[0][0];
    expect(inserted).toMatchObject({
      tenant_id: "ws-1",
      project_id: "p1",
      prime_contract_id: "pc-1",
      co_type: "PCO",
      title: "Added scope",
      amount: 4200,
      status: "draft",
      co_no: 7,
    });
  });

  it("create uses the provided primeContractId without a lookup", async () => {
    const insertBuilder = makeBuilder({ data: { id: "co-2" }, error: null });
    __mock.from.mockReturnValue(insertBuilder);

    const { result } = renderHookWithClient(() => useCoWorkflow("p1"));
    await result.current.create.mutateAsync({
      projectId: "p1",
      primeContractId: "pc-explicit",
      spec,
      previewPdf: null,
    });

    const inserted = (insertBuilder.insert as any).mock.calls[0][0];
    expect(inserted.prime_contract_id).toBe("pc-explicit");
  });

  it("create throws when the project has no prime contract", async () => {
    __mock.from.mockReturnValue(makeBuilder({ data: null, error: null }));
    const { result } = renderHookWithClient(() => useCoWorkflow("p1"));
    await expect(
      result.current.create.mutateAsync({
        projectId: "p1",
        primeContractId: null,
        spec,
        previewPdf: null,
      }),
    ).rejects.toThrow(/no prime contract/i);
  });

  it("create surfaces insert errors as a rejection", async () => {
    const insertBuilder = makeBuilder({ data: null, error: { message: "denied" } as any });
    __mock.from.mockReturnValue(insertBuilder);
    const { result } = renderHookWithClient(() => useCoWorkflow("p1"));
    await expect(
      result.current.create.mutateAsync({
        projectId: "p1",
        primeContractId: "pc-1",
        spec,
        previewPdf: null,
      }),
    ).rejects.toBeTruthy();
  });
});
