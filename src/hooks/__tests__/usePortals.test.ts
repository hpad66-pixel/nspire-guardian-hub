import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useClientPortalContext, useOwnerPortalData } from "@/hooks/usePortals";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe("useClientPortalContext", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  it("requests branding for the selected project", async () => {
    mockRpc.mockResolvedValue({
      data: [{ project_id: "p1", project_name: "Sewer", portal_name: "Glorieta" }],
      error: null,
    });
    const { result } = renderHook(() => useClientPortalContext("p1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledWith("get_owner_portal_context", { p_project_id: "p1" });
    expect(result.current.data?.project_name).toBe("Sewer");
  });
});

describe("useOwnerPortalData", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  it("attaches project names onto contracts for portal tabs", async () => {
    const chain = (data: unknown) => {
      const api: any = {
        select: () => api,
        eq: () => api,
        in: () => api,
        then: (resolve: (value: { data: unknown; error: null }) => unknown) => resolve({ data, error: null }),
      };
      return api;
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "prime_contracts") return chain([{ id: "c1", project_id: "p1", title: "PC-01" }]);
      if (table === "projects") return chain([{ id: "p1", name: "Sewer close-out" }]);
      if (table === "change_orders") return chain([]);
      if (table === "prime_contract_pay_apps") return chain([]);
      return chain([]);
    });

    const { result } = renderHook(() => useOwnerPortalData(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.primeContracts[0].project_name).toBe("Sewer close-out");
  });
});
