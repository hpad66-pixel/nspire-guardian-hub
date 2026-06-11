/**
 * WS-1 · useCreateDocumentFolder + buildFolderTree.
 *
 * Bug #2: folder create violated document_folders_insert RLS because
 * workspace_id was never set. Fix sets it explicitly (and a BEFORE
 * INSERT trigger backfills it server-side).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/hooks/useWorkspace", () => ({
  useWorkspace: () => ({ workspaceId: "ws1" }),
}));

import { useCreateDocumentFolder, buildFolderTree, type DocumentFolder } from "../useDocumentFolders";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

const folder = (id: string, parent_id: string | null, name: string): DocumentFolder => ({
  id, parent_id, name, created_at: "", updated_at: "",
});

describe("buildFolderTree", () => {
  it("validation: nests children under parents and sorts by name", () => {
    const tree = buildFolderTree([
      folder("b", null, "Beta"),
      folder("a", null, "Alpha"),
      folder("a1", "a", "Alpha child"),
    ]);
    expect(tree.map((n) => n.name)).toEqual(["Alpha", "Beta"]);
    expect(tree[0].children[0].id).toBe("a1");
  });
});

describe("useCreateDocumentFolder", () => {
  beforeEach(() => __mock.reset());

  it("happy: insert carries workspace_id and trims name", async () => {
    const builder = makeBuilder({ data: { id: "f1" }, error: null });
    __mock.from.mockReturnValue(builder);

    const { result } = renderHookWithClient(() => useCreateDocumentFolder());
    result.current.mutate({ name: "  Plans  ", parentId: null });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const payload = builder.insert.mock.calls[0][0];
    expect(payload.workspace_id).toBe("ws1");
    expect(payload.name).toBe("Plans");
  });

  it("permission: RLS rejection surfaces as error, not success", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "violates row-level security" } as any }),
    );
    const { result } = renderHookWithClient(() => useCreateDocumentFolder());
    result.current.mutate({ name: "Plans" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });
});
