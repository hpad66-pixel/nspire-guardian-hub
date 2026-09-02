import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useClientUpdates, useClientUpdatesForProjects } from "@/hooks/useClientUpdates";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

function chain(data: unknown, capture: Record<string, unknown> = {}) {
  const api: any = {
    select: () => api,
    eq: (col: string, val: unknown) => { capture[col] = val; return api; },
    in: (col: string, val: unknown) => { capture[`${col}_in`] = val; return api; },
    order: () => api,
    then: (resolve: (value: { data: unknown; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return api;
}

describe("useClientUpdates", () => {
  beforeEach(() => mockFrom.mockReset());

  it("lists briefings for one project", async () => {
    const capture: Record<string, unknown> = {};
    mockFrom.mockReturnValue(chain([{ id: "u1", project_id: "p1", title: "Storm-drain cleanout complete", status: "published" }], capture));
    const { result } = renderHook(() => useClientUpdates("p1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capture.project_id).toBe("p1");
    expect(result.current.data?.[0].title).toMatch(/Storm-drain/i);
  });

  it("lists published briefings across a client portfolio", async () => {
    const capture: Record<string, unknown> = {};
    mockFrom.mockReturnValue(chain([
      { id: "u1", project_id: "p2", title: "Storm-drain cleanout complete", status: "published" },
    ], capture));
    const { result } = renderHook(() => useClientUpdatesForProjects(["p2", "p1"], { publishedOnly: true }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capture.project_id_in).toEqual(["p1", "p2"]);
    expect(capture.status).toBe("published");
    expect(result.current.data).toHaveLength(1);
  });
});
