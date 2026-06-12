/**
 * WS-1 · useCreateCRMContact — happy / validation / permission.
 *
 * Bug #3: contact create silently no-opped because the insert never
 * carried workspace_id, so the crm_contacts_insert RLS WITH CHECK
 * (workspace_id = get_my_workspace_id()) rejected it. The fix sets
 * workspace_id explicitly (belt) plus a BEFORE INSERT trigger (braces).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

let mockUser: { id: string } | null = { id: "u1" };

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));
vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: () => ({ workspaceId: "ws1" }),
}));

import { useCreateCRMContact } from "../useCRMContacts";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useCreateCRMContact", () => {
  beforeEach(() => {
    __mock.reset();
    mockUser = { id: "u1" };
  });

  it("happy: insert carries workspace_id and created_by", async () => {
    const builder = makeBuilder({ data: { id: "c1" }, error: null });
    __mock.from.mockReturnValue(builder);

    const { result } = renderHookWithClient(() => useCreateCRMContact());
    result.current.mutate({ first_name: "Ada", contact_type: "vendor" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const payload = builder.insert.mock.calls[0][0];
    expect(payload.workspace_id).toBe("ws1");
    expect(payload.created_by).toBe("u1");
    // personal contact (no property_id) keeps user_id
    expect(payload.user_id).toBe("u1");
  });

  it("validation: a failed (RLS-rejected) insert surfaces as error, never success", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "violates row-level security" } as any }),
    );
    const { result } = renderHookWithClient(() => useCreateCRMContact());
    result.current.mutate({ first_name: "Ada", contact_type: "vendor" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });

  it("permission: throws when not authenticated", async () => {
    mockUser = null;
    const { result } = renderHookWithClient(() => useCreateCRMContact());
    result.current.mutate({ first_name: "Ada", contact_type: "vendor" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/not authenticated/i);
  });
});
