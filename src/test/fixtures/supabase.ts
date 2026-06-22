/**
 * G5 · Supabase mock fixtures.
 *
 * Used by hook unit tests to assert the call shape without a
 * live database. Each function returns a `vi.fn()` so tests can
 * inspect arguments and toggle return values per case.
 *
 * Pattern:
 *   vi.mock("@/integrations/supabase/client", () =>
 *     import("@/test/fixtures/supabase"));
 *
 * Then in each test:
 *   import { __mock } from "@/integrations/supabase/client";
 *   __mock.from.mockReturnValue({ select: ..., insert: ..., ... })
 */
import { vi } from "vitest";

export interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  overlaps: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

export function makeBuilder(
  result: { data?: unknown; error?: unknown } = { data: [], error: null },
): MockBuilder {
  const b: any = {};
  const chain = vi.fn(() => b);
  b.select = vi.fn(() => b);
  b.insert = vi.fn(() => b);
  b.update = vi.fn(() => b);
  b.upsert = vi.fn(() => b);
  b.delete = chain;
  // Filter operators — all chainable (return self); awaiting the builder or a
  // terminal (.single/.maybeSingle/.limit) resolves the configured result.
  b.eq = vi.fn(() => b);
  b.neq = vi.fn(() => b);
  b.in = vi.fn(() => b);
  b.or = vi.fn(() => b);
  b.not = vi.fn(() => b);
  b.is = vi.fn(() => b);
  b.ilike = vi.fn(() => b);
  b.like = vi.fn(() => b);
  b.contains = vi.fn(() => b);
  b.overlaps = vi.fn(() => b);
  b.filter = vi.fn(() => b);
  b.range = vi.fn(() => b);
  b.gte = vi.fn(() => b);
  b.lte = vi.fn(() => b);
  b.order = vi.fn(() => b);
  // Chainable AND awaitable: supports both `await q.limit(n)` (via b.then) and
  // `q.limit(n).single()` / `.maybeSingle()` chains used by single-row queries.
  b.limit = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(result));
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Awaitable terminal -- list queries do `await supabase.from(t).select().order(...)`
  // and expect a thenable with `{ data, error }`.
  b.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  return b as MockBuilder;
}

/**
 * Build a fake streaming `Response` for SSE hooks that read `resp.body.getReader()`
 * (e.g. useGenerateProgressReport). `chunks` are raw strings emitted in order by
 * successive `reader.read()` calls (encoded to Uint8Array). Set `ok:false` +
 * `errorBody` to exercise the HTTP-error branch, or `noBody:true` for the
 * missing-body branch.
 *
 *   stubGlobal('fetch', vi.fn(() => Promise.resolve(makeSseResponse([
 *     'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
 *     'data: [DONE]\n',
 *   ]))))
 */
export function makeSseResponse(
  chunks: string[] = [],
  opts: { ok?: boolean; status?: number; errorBody?: unknown; noBody?: boolean } = {},
): any {
  const { ok = true, status = 200, errorBody, noBody = false } = opts;
  const encoder = new TextEncoder();
  let i = 0;
  const reader = {
    read: () =>
      i < chunks.length
        ? Promise.resolve({ value: encoder.encode(chunks[i++]), done: false })
        : Promise.resolve({ value: undefined, done: true }),
    cancel: () => Promise.resolve(),
  };
  return {
    ok,
    status,
    json: () => Promise.resolve(errorBody ?? {}),
    text: () => Promise.resolve(typeof errorBody === "string" ? errorBody : ""),
    body: ok && !noBody ? { getReader: () => reader } : null,
  };
}

const fromMock = vi.fn(() => makeBuilder());
const rpcMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
const invokeMock = vi.fn(() => Promise.resolve({ data: null, error: null }));

// Storage: `supabase.storage.from(bucket).upload/getPublicUrl/remove/...`.
// upload/remove/createSignedUrl/download resolve {data,error}; getPublicUrl is
// sync and returns a public URL object (matching the real client).
const storageUploadMock = vi.fn(() => Promise.resolve({ data: { path: "uploads/file" }, error: null }));
const storageRemoveMock = vi.fn(() => Promise.resolve({ data: [], error: null }));
const storageSignedUrlMock = vi.fn(() => Promise.resolve({ data: { signedUrl: "https://signed/url" }, error: null }));
const storageDownloadMock = vi.fn(() => Promise.resolve({ data: new Blob(), error: null }));
const storageBucket = {
  upload: storageUploadMock,
  remove: storageRemoveMock,
  createSignedUrl: storageSignedUrlMock,
  download: storageDownloadMock,
  getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://public/${path}` } })),
};
const storageFromMock = vi.fn(() => storageBucket);

export const supabase = {
  from: fromMock,
  rpc: rpcMock,
  functions: { invoke: invokeMock },
  storage: { from: storageFromMock },
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "u1" } }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
};

/** Test-side handle for re-arming mocks per case. */
export const __mock = {
  from: fromMock,
  rpc: rpcMock,
  invoke: invokeMock,
  storageFrom: storageFromMock,
  storageUpload: storageUploadMock,
  reset() {
    fromMock.mockReset();
    fromMock.mockImplementation(() => makeBuilder());
    rpcMock.mockReset();
    rpcMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    invokeMock.mockReset();
    invokeMock.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    storageUploadMock.mockClear();
    storageUploadMock.mockImplementation(() => Promise.resolve({ data: { path: "uploads/file" }, error: null }));
    storageFromMock.mockClear();
    storageFromMock.mockImplementation(() => storageBucket);
  },
};
