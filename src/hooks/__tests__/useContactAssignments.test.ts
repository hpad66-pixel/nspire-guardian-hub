import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});

vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(async () => "ws1"),
}));

import { useSyncContactAssignments } from "../useContactAssignments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

describe("useSyncContactAssignments", () => {
  beforeEach(() => {
    __mock.reset();
  });

  it("happy: inserts missing project and property links", async () => {
    const directorySelect = makeBuilder({ data: [], error: null });
    const directoryInsert = makeBuilder({ data: [{ id: "d1" }], error: null });
    const propertySelect = makeBuilder({ data: [], error: null });
    const propertyInsert = makeBuilder({ data: [{ id: "cp1" }], error: null });
    const contactUpdate = makeBuilder({ data: { id: "c1" }, error: null });

    let directoryCalls = 0;
    let propertyCalls = 0;
    __mock.from.mockImplementation((table: string) => {
      if (table === "project_directory_entries") {
        directoryCalls += 1;
        return directoryCalls === 1 ? directorySelect : directoryInsert;
      }
      if (table === "crm_contact_properties") {
        propertyCalls += 1;
        return propertyCalls === 1 ? propertySelect : propertyInsert;
      }
      if (table === "crm_contacts") return contactUpdate;
      return makeBuilder();
    });

    const { result } = renderHookWithClient(() => useSyncContactAssignments());
    result.current.sync.mutate({
      contactId: "c1",
      projectIds: ["proj-1"],
      propertyIds: ["prop-1"],
      primaryPropertyId: "prop-1",
    });

    await waitFor(() => expect(result.current.sync.isSuccess).toBe(true));
    expect(directoryInsert.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        tenant_id: "ws1",
        project_id: "proj-1",
        contact_id: "c1",
      }),
    ]);
    expect(propertyInsert.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        tenant_id: "ws1",
        property_id: "prop-1",
        contact_id: "c1",
      }),
    ]);
    expect(contactUpdate.update).toHaveBeenCalledWith({ property_id: "prop-1" });
  });

  it("validation: surfaces a directory insert failure", async () => {
    const directorySelect = makeBuilder({ data: [], error: null });
    const directoryInsert = makeBuilder({
      data: null,
      error: { message: "violates row-level security" },
    });
    __mock.from.mockImplementation((table: string) => {
      if (table === "project_directory_entries") {
        return directorySelect.insert.mock.calls.length === 0 && !directoryInsert.insert.mock.calls.length
          ? directorySelect
          : directoryInsert;
      }
      return makeBuilder({ data: [], error: null });
    });

    // Simpler: first from() is select (awaited), second is insert.
    let n = 0;
    __mock.from.mockImplementation((table: string) => {
      if (table === "project_directory_entries") {
        n += 1;
        return n === 1 ? directorySelect : directoryInsert;
      }
      return makeBuilder({ data: [], error: null });
    });

    const { result } = renderHookWithClient(() => useSyncContactAssignments());
    result.current.sync.mutate({
      contactId: "c1",
      projectIds: ["proj-1"],
      propertyIds: [],
    });

    await waitFor(() => expect(result.current.sync.isError).toBe(true));
    expect(result.current.sync.isSuccess).toBe(false);
  });

  it("permission: requireTenantId rejection fails the mutation", async () => {
    const { requireTenantId } = await import("@/lib/tenant");
    vi.mocked(requireTenantId).mockRejectedValueOnce(
      new Error("No workspace found for the current user"),
    );

    const { result } = renderHookWithClient(() => useSyncContactAssignments());
    result.current.sync.mutate({
      contactId: "c1",
      projectIds: ["proj-1"],
      propertyIds: [],
    });

    await waitFor(() => expect(result.current.sync.isError).toBe(true));
    expect((result.current.sync.error as Error).message).toMatch(/no workspace/i);
  });
});
