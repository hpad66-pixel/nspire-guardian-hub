/**
 * useTenantContext — React hook that exposes the current JWT tenant claims.
 * (A1)
 */
import { useQuery } from "@tanstack/react-query";
import { getTenantContext, type TenantContext } from "@/lib/tenant";

export function useTenantContext() {
  return useQuery<TenantContext>({
    queryKey: ["tenant-context"],
    queryFn: getTenantContext,
    staleTime: 60_000,
  });
}

/** Convenience: just the tenant_id (null if not signed in / no workspace). */
export function useTenantId(): string | null {
  const { data } = useTenantContext();
  return data?.tenant_id ?? null;
}
