/**
 * useProjectDocuments / useTransmittals — B5 documents + transmittals.
 * Covers: query gating, list happy path, transmittal create (resolves tenant via
 * requireTenantId, pulls a number via the `next_transmittal_number` RPC, then
 * inserts the transmittal + items), and the list error path.
 *
 * Note: these hooks resolve the tenant via `requireTenantId` from @/lib/tenant
 * (mocked) and the transmittal create makes an RPC call before inserting across
 * two tables (transmittals + transmittal_items) — table-aware mocking keeps the
 * mount list query from stealing a sequenced mock.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => {
  const m = await import("@/test/fixtures/supabase");
  return { supabase: m.supabase, __mock: m.__mock };
});
vi.mock("@/lib/tenant", () => ({
  requireTenantId: vi.fn(async () => "ws-1"),
}));

import {
  useProjectDocuments,
  useDocumentVersions,
  useTransmittals,
} from "../useProjectDocuments";
import { renderHookWithClient } from "@/test/utils";
import { __mock, makeBuilder } from "@/test/fixtures/supabase";

const fakeFile = (name = "Spec.pdf", type = "application/pdf") =>
  new File([new Uint8Array([1, 2, 3])], name, { type });

describe("useProjectDocuments", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("document list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useProjectDocuments(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists pl_documents for the given project", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "d1", project_id: "p1", name: "Spec.pdf" }], error: null }),
    );
    const { result } = renderHookWithClient(() => useProjectDocuments("p1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Spec.pdf");
  });

  it("list surfaces RLS errors as query errors", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useProjectDocuments("p1"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("createWithFile uploads to storage then inserts doc + version 1", async () => {
    const docsBuilder = makeBuilder({ data: { id: "d-new" }, error: null });
    const versionsBuilder = makeBuilder({ data: null, error: null });
    __mock.from.mockImplementation(((table: string) =>
      table === "pl_document_versions" ? versionsBuilder : docsBuilder) as any);

    const { result } = renderHookWithClient(() => useProjectDocuments("p1"));
    await result.current.createWithFile.mutateAsync({ file: fakeFile("Plan.pdf") });

    // storage upload happened against the docs bucket
    expect(__mock.storageFrom).toHaveBeenCalledWith("project-documents");
    expect(__mock.storageUpload).toHaveBeenCalledTimes(1);
    const uploadPath = (__mock.storageUpload as any).mock.calls[0][0] as string;
    expect(uploadPath.startsWith("ws-1/p1/")).toBe(true);
    expect(uploadPath.endsWith("/v1-Plan.pdf")).toBe(true);

    const insertedDoc = (docsBuilder.insert as any).mock.calls[0][0];
    expect(insertedDoc).toMatchObject({
      tenant_id: "ws-1",
      project_id: "p1",
      name: "Plan.pdf",
      current_version: 1,
    });
    const insertedVer = (versionsBuilder.insert as any).mock.calls[0][0];
    expect(insertedVer).toMatchObject({ version: 1, storage_path: uploadPath });
  });

  it("createWithFile rejects without inserting when the upload fails", async () => {
    __mock.storageUpload.mockResolvedValueOnce({
      data: null,
      error: { message: "upload failed" },
    } as any);
    const builder = makeBuilder({ data: null, error: null });
    __mock.from.mockReturnValue(builder);

    const { result } = renderHookWithClient(() => useProjectDocuments("p1"));
    await expect(
      result.current.createWithFile.mutateAsync({ file: fakeFile() }),
    ).rejects.toBeTruthy();
    // no DB writes should have happened after the storage failure
    expect((builder.insert as any).mock.calls).toHaveLength(0);
  });

  it("createWithFile rejects when the doc insert fails", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "denied" } as any }),
    );
    const { result } = renderHookWithClient(() => useProjectDocuments("p1"));
    await expect(
      result.current.createWithFile.mutateAsync({ file: fakeFile() }),
    ).rejects.toBeTruthy();
  });
});

describe("useDocumentVersions", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("is disabled until a documentId is provided", () => {
    const { result } = renderHookWithClient(() => useDocumentVersions(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("lists versions for a document", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: [{ id: "v2", version: 2 }], error: null }),
    );
    const { result } = renderHookWithClient(() => useDocumentVersions("d1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].version).toBe(2);
  });

  it("uploadNewVersion bumps the version, uploads, inserts version + updates doc", async () => {
    // First .from('pl_documents').select(...).single() returns current_version=2,
    // then the version insert + the doc update both go to builders we can inspect.
    const docLookupBuilder = makeBuilder({
      data: { id: "d1", project_id: "p1", current_version: 2 },
      error: null,
    });
    const versionsBuilder = makeBuilder({ data: null, error: null });
    __mock.from.mockImplementation(((table: string) =>
      table === "pl_document_versions" ? versionsBuilder : docLookupBuilder) as any);

    const { result } = renderHookWithClient(() => useDocumentVersions("d1"));
    const next = await result.current.uploadNewVersion.mutateAsync({
      documentId: "d1",
      file: fakeFile("Rev.pdf"),
      note: "rev C",
    });
    expect(next).toBe(3);

    const uploadPath = (__mock.storageUpload as any).mock.calls[0][0] as string;
    expect(uploadPath).toBe("ws-1/p1/d1/v3-Rev.pdf");

    const insertedVer = (versionsBuilder.insert as any).mock.calls[0][0];
    expect(insertedVer).toMatchObject({
      document_id: "d1",
      version: 3,
      storage_path: uploadPath,
      note: "rev C",
    });
    const updatedDoc = (docLookupBuilder.update as any).mock.calls[0][0];
    expect(updatedDoc).toMatchObject({ current_version: 3 });
  });

  it("uploadNewVersion rejects when the storage upload fails", async () => {
    __mock.storageUpload.mockResolvedValueOnce({
      data: null,
      error: { message: "upload failed" },
    } as any);
    __mock.from.mockReturnValue(
      makeBuilder({ data: { id: "d1", project_id: "p1", current_version: 1 }, error: null }),
    );
    const { result } = renderHookWithClient(() => useDocumentVersions("d1"));
    await expect(
      result.current.uploadNewVersion.mutateAsync({ documentId: "d1", file: fakeFile() }),
    ).rejects.toBeTruthy();
  });

  it("uploadNewVersion rejects when the doc lookup fails", async () => {
    __mock.from.mockReturnValue(
      makeBuilder({ data: null, error: { message: "not found" } as any }),
    );
    const { result } = renderHookWithClient(() => useDocumentVersions("d1"));
    await expect(
      result.current.uploadNewVersion.mutateAsync({ documentId: "d1", file: fakeFile() }),
    ).rejects.toBeTruthy();
  });
});

describe("useTransmittals", () => {
  beforeEach(() => {
    __mock.reset();
    vi.clearAllMocks();
  });

  it("transmittal list is disabled until a projectId is provided", () => {
    const { result } = renderHookWithClient(() => useTransmittals(null));
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("create stamps tenant + project + number and inserts items", async () => {
    __mock.rpc.mockResolvedValue({ data: "TX-003", error: null } as any);
    const txBuilder = makeBuilder({ data: { id: "tx-new" }, error: null });
    const itemsBuilder = makeBuilder({ data: null, error: null });
    __mock.from.mockImplementation(((table: string) =>
      table === "transmittal_items" ? itemsBuilder : txBuilder) as any);

    const { result } = renderHookWithClient(() => useTransmittals("p1"));
    const row = await result.current.create.mutateAsync({
      subject: "For review",
      documentIds: [{ id: "d1", version: 2 }],
    });
    expect((row as any).id).toBe("tx-new");

    const insertedTx = (txBuilder.insert as any).mock.calls[0][0];
    expect(insertedTx).toMatchObject({
      tenant_id: "ws-1",
      project_id: "p1",
      number: "TX-003",
      subject: "For review",
    });
    const insertedItems = (itemsBuilder.insert as any).mock.calls[0][0];
    expect(insertedItems[0]).toMatchObject({
      transmittal_id: "tx-new",
      document_id: "d1",
      version: 2,
    });
  });

  it("create stamps sent_at when markSent is set and skips items when none", async () => {
    __mock.rpc.mockResolvedValue({ data: "TX-004", error: null } as any);
    const txBuilder = makeBuilder({ data: { id: "tx-2" }, error: null });
    const itemsBuilder = makeBuilder({ data: null, error: null });
    __mock.from.mockImplementation(((table: string) =>
      table === "transmittal_items" ? itemsBuilder : txBuilder) as any);

    const { result } = renderHookWithClient(() => useTransmittals("p1"));
    await result.current.create.mutateAsync({
      subject: "Issued for construction",
      documentIds: [],
      markSent: true,
    });

    const insertedTx = (txBuilder.insert as any).mock.calls[0][0];
    expect(insertedTx.number).toBe("TX-004");
    expect(insertedTx.sent_at).toBeTruthy();
    // empty documentIds → no items insert
    expect((itemsBuilder.insert as any).mock.calls).toHaveLength(0);
  });

  it("create surfaces the numbering RPC error as a rejection", async () => {
    __mock.rpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } } as any);
    __mock.from.mockReturnValue(makeBuilder({ data: { id: "tx" }, error: null }));
    const { result } = renderHookWithClient(() => useTransmittals("p1"));
    await expect(
      result.current.create.mutateAsync({ subject: "x", documentIds: [] }),
    ).rejects.toBeTruthy();
  });
});
