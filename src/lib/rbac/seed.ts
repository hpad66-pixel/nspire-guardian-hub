/**
 * Seed system permission templates for a tenant.
 * Called on workspace bootstrap (see useSeedPermissionTemplates hook).
 */
import { supabase } from "@/integrations/supabase/client";

type GrantLevel = "none" | "read" | "standard" | "admin";
interface TemplateSpec {
  name: string;
  description: string;
  grants: Array<{ module: string; action: string; level: GrantLevel }>;
}

const ALL_MODULES = [
  "rfis", "submittals", "punch", "daily_log", "meetings",
  "drawings", "specs", "photos", "documents", "schedule",
  "incidents", "prime_contract", "commitments", "change_events",
  "change_orders", "direct_costs", "budget", "reports",
  "admin", "cost_codes", "distribution_lists", "permission_templates",
];

const FINANCIAL_MODULES = new Set([
  "prime_contract", "commitments", "change_events",
  "change_orders", "direct_costs", "budget",
]);

function grantAll(level: GrantLevel, modules = ALL_MODULES) {
  const actions = ["view", "create", "edit", "delete", "approve"];
  return modules.flatMap((module) =>
    actions.map((action) => ({ module, action, level })),
  );
}

export const SYSTEM_TEMPLATES: TemplateSpec[] = [
  {
    name: "Super Admin",
    description: "Full platform access across all tenants.",
    grants: grantAll("admin"),
  },
  {
    name: "Owner",
    description: "Full access within a single tenant.",
    grants: grantAll("admin"),
  },
  {
    name: "Administrator",
    description: "All modules, cannot delete system data.",
    grants: grantAll("admin").map((g) =>
      g.action === "delete" && g.module === "admin" ? { ...g, level: "standard" as GrantLevel } : g,
    ),
  },
  {
    name: "Project Manager",
    description: "Full project execution; financial read only.",
    grants: [
      ...grantAll("admin", ALL_MODULES.filter((m) => !FINANCIAL_MODULES.has(m))),
      ...grantAll("read", [...FINANCIAL_MODULES]),
    ],
  },
  {
    name: "Superintendent",
    description: "Field modules + schedule.",
    grants: [
      ...grantAll("standard", ["rfis","submittals","punch","daily_log","meetings","photos","documents","schedule","incidents"]),
      ...grantAll("read", ["drawings","specs","commitments"]),
    ],
  },
  {
    name: "Inspector",
    description: "Punch, daily log, incidents, photos.",
    grants: [
      ...grantAll("standard", ["punch","daily_log","incidents","photos"]),
      ...grantAll("read", ["drawings","specs","rfis"]),
    ],
  },
  {
    name: "Clerk",
    description: "Documents and distribution admin.",
    grants: [
      ...grantAll("admin", ["documents","distribution_lists"]),
      ...grantAll("read", ["rfis","submittals","meetings"]),
    ],
  },
  {
    name: "Subcontractor",
    description: "Portal-only access, own submittals/RFIs.",
    grants: [
      ...grantAll("standard", ["rfis","submittals","punch","daily_log"]),
      ...grantAll("read", ["drawings","specs","documents"]),
    ],
  },
  {
    name: "Viewer",
    description: "Read-only across project.",
    grants: grantAll("read"),
  },
  {
    name: "Standard User",
    description: "Baseline; escalate via per-module assignments.",
    grants: [...grantAll("read"), ...grantAll("standard", ["rfis","submittals","daily_log"])],
  },
];

/** Idempotent: inserts only templates that don't already exist for the tenant. */
export async function seedSystemPermissionTemplates(tenantId: string) {
  for (const spec of SYSTEM_TEMPLATES) {
    const { data: existing } = await supabase
      .from("permission_templates" as any)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", spec.name)
      .eq("is_system", true)
      .maybeSingle();

    if (existing) continue;

    const { data: tpl, error: tplErr } = await supabase
      .from("permission_templates" as any)
      .insert({
        tenant_id: tenantId,
        name: spec.name,
        description: spec.description,
        is_system: true,
      } as any)
      .select("id")
      .single();
    if (tplErr || !tpl) continue;

    const rows = spec.grants.map((g) => ({ template_id: (tpl as any).id, ...g }));
    await supabase.from("permission_template_grants" as any).insert(rows as any);
  }
}
