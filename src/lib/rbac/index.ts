/**
 * A2 · RBAC — Permission Templates
 *
 * Canonical permission check for Procore Lite modules.
 * Uses the `can()` Postgres function which ranks:
 *   none (0) < read (1) < standard (2) < admin (3)
 */
import { supabase } from "@/integrations/supabase/client";

export type PermissionLevel = "none" | "read" | "standard" | "admin";

export type Module =
  | "rfis"
  | "submittals"
  | "punch"
  | "daily_log"
  | "meetings"
  | "drawings"
  | "specs"
  | "photos"
  | "documents"
  | "schedule"
  | "incidents"
  | "prime_contract"
  | "commitments"
  | "change_events"
  | "change_orders"
  | "direct_costs"
  | "budget"
  | "reports"
  | "admin"
  | "sub_portal"
  | "owner_portal"
  | "api"
  | "cost_codes"
  | "distribution_lists"
  | "permission_templates";

export type Action = "view" | "create" | "edit" | "delete" | "approve";

export interface PermissionCheckInput {
  userId: string;
  module: Module | string;
  action: Action | string;
  minLevel?: PermissionLevel;
}

/** Server-side permission check via `public.can()`. Returns false on any error. */
export async function can(input: PermissionCheckInput): Promise<boolean> {
  const { userId, module, action, minLevel = "read" } = input;
  const { data, error } = await supabase.rpc("can" as any, {
    p_user: userId,
    p_module: module,
    p_action: action,
    p_min_level: minLevel,
  } as any);
  if (error) {
    console.warn("[rbac.can] RPC error:", error.message);
    return false;
  }
  return Boolean(data);
}

/** Resolve the user's highest level for a module/action (for UI gating). */
export async function permissionLevel(
  userId: string,
  module: string,
  action: string,
): Promise<PermissionLevel> {
  const { data, error } = await supabase.rpc("permission_level" as any, {
    p_user: userId,
    p_module: module,
    p_action: action,
  } as any);
  if (error || !data) return "none";
  return data as PermissionLevel;
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireCan(input: PermissionCheckInput): Promise<void> {
  const ok = await can(input);
  if (!ok) throw new ForbiddenError(`${input.action} on ${input.module} denied`);
}
