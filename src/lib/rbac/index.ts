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

/**
 * Workspace-role helpers for the LEGACY role surfaces (training hub, dashboards,
 * people management, workspace settings) that predate the A2 permission-template
 * engine and operate on the workspace-level app_role rather than per-project
 * Procore-module permissions.
 *
 * Procore-module gating MUST still go through can()/permissionLevel() — these
 * helpers exist only to keep workspace-admin role determination in ONE auditable
 * place instead of scattering `role === 'admin'` string literals across feature
 * code (CLAUDE.md rule 5). When the legacy subsystems are migrated onto the
 * permission-template engine, replace these call sites with can()/canUseFeature().
 */
export const ADMIN_ROLES = ["admin", "owner", "administrator"] as const;
export const MANAGER_ROLES = [...ADMIN_ROLES, "manager", "project_manager"] as const;

/** True for workspace administrators (admin / owner / administrator). */
export function isAdminRole(role?: string | null): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/** True for admins plus managers (admin / owner / administrator / manager / project_manager). */
export function isManagerRole(role?: string | null): boolean {
  return !!role && (MANAGER_ROLES as readonly string[]).includes(role);
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
