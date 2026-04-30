/**
 * G5 · useOrganizationDocuments smoke tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, userRole: "admin", loading: false }),
}));

import { useOrganizationDocuments } from "../useDocuments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useOrganizationDocuments", () => {
  beforeEach(() => __mock.reset());

  it("returns documents from the organization_documents table", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "d1", name: "Master agreement.pdf" }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useOrganizationDocuments());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
  });

  it("surfaces errors", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: null, error: { message: "denied" } as any,
    }));
    const { result } = renderHookWithClient(() => useOrganizationDocuments());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
