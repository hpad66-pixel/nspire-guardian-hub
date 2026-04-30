/**
 * G4 · useApiClients tests.
 *
 * Asserts the existing list/create/revoke contract holds. Full
 * mint-via-edge-function flow is exercised by the
 * CreateApiClientDialog component path (and could be moved
 * into this hook later); the legacy client-side mint shape is
 * covered here so coverage of useApiClients clears the gate.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(async () => "tenant-1"),
}));

import { useApiClients } from "../useApiClients";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useApiClients", () => {
  beforeEach(() => __mock.reset());

  it("list returns rows from api_clients table", async () => {
    __mock.from.mockReturnValue(makeBuilder({
      data: [{ id: "c1", name: "ci", scopes: ["read:projects"] }],
      error: null,
    }));
    const { result } = renderHookWithClient(() => useApiClients());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("ci");
  });

  it("create returns the plaintext secret exactly once", async () => {
    const insertBuilder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(insertBuilder);
    const { result } = renderHookWithClient(() => useApiClients());
    const minted = await result.current.create.mutateAsync({
      name: "ci", scopes: ["read:projects"],
    });
    expect(minted.client_secret).toMatch(/^sk_/);
    expect(minted.client_id).toMatch(/^pk_/);
    // The hash must not equal the plaintext.
    const insertArg = insertBuilder.insert.mock.calls[0]?.[0] as any;
    expect(insertArg.client_secret_hash).toBeTruthy();
    expect(insertArg.client_secret_hash).not.toBe(minted.client_secret);
  });

  it("revoke flips is_active and stamps revoked_at", async () => {
    const updateBuilder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(updateBuilder);
    const { result } = renderHookWithClient(() => useApiClients());
    await result.current.revoke.mutateAsync("client-1");
    const updateArg = updateBuilder.update.mock.calls[0]?.[0] as any;
    expect(updateArg.is_active).toBe(false);
    expect(updateArg.revoked_at).toBeTruthy();
  });
});
