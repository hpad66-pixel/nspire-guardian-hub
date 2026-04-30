/**
 * Multi-tenant helpers (A1).
 *
 * The SaaS tenant concept in this codebase = `public.workspaces`.
 * The `public.tenants` table is residential leasing and unrelated.
 *
 * JWT claims (injected by Supabase auth hook):
 *   tenant_id       — uuid of current workspace
 *   workspace_ids   — uuid[] of all workspaces the user belongs to
 *   role            — 'super_admin' | 'owner' | 'admin' | 'member' | ...
 */
import { supabase } from "@/integrations/supabase/client";

export interface TenantContext {
  tenant_id: string | null;
  workspace_ids: string[];
  is_super_admin: boolean;
}

const EMPTY_CONTEXT: TenantContext = {
  tenant_id: null,
  workspace_ids: [],
  is_super_admin: false,
};

/** Decode JWT payload without verifying signature (verification is server-side). */
function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as T;
  } catch {
    return null;
  }
}

/** Read tenant context from the current Supabase session's JWT. */
export async function getTenantContext(): Promise<TenantContext> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return EMPTY_CONTEXT;

  const payload = decodeJwtPayload<{
    tenant_id?: string;
    workspace_ids?: string[];
    role?: string;
  }>(token);
  if (!payload) return EMPTY_CONTEXT;

  return {
    tenant_id: payload.tenant_id ?? null,
    workspace_ids: payload.workspace_ids ?? [],
    is_super_admin: payload.role === "super_admin",
  };
}

/** Throws if no tenant context is available (use in guarded mutations). */
export async function requireTenantId(): Promise<string> {
  const ctx = await getTenantContext();
  if (!ctx.tenant_id) {
    throw new Error(
      "No tenant_id in JWT. User must be signed into a workspace before this action.",
    );
  }
  return ctx.tenant_id;
}
