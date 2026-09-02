/**
 * F1/F2 · Portal invitations + memberships.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface PortalInvitation {
  id: string; tenant_id: string; email: string;
  organization_id: string | null;
  project_id: string | null;
  portal_kind: "sub"|"owner";
  role: string;
  invited_at: string; accepted_at: string | null; expires_at: string;
  token: string;
}

export interface PortalMembership {
  id: string; tenant_id: string; user_id: string;
  organization_id: string | null;
  portal_kind: "main"|"sub"|"owner";
  role: string | null;
  is_active: boolean;
  created_at: string;
}

export function useMyPortalKind() {
  return useQuery<"main"|"sub"|"owner"|"ops">({
    queryKey: ["my-portal-kind"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_portal_kind" as any);
      if (error) return "main";
      return (data as "main"|"sub"|"owner"|"ops") ?? "main";
    },
    staleTime: 60_000,
  });
}

export interface ClientPortalContext {
  project_id: string;
  project_name: string;
  project_status: string | null;
  portal_name: string | null;
  client_name: string | null;
  brand_logo_url: string | null;
  brand_accent_color: string | null;
  portal_slug: string | null;
}

export interface OwnerPortalContract {
  id: string;
  project_id: string;
  title: string;
  project_name?: string | null;
  contract_no: string | null;
  status?: string;
  executed_date?: string | null;
  original_value?: number | null;
  retainage_pct?: number | null;
}

export interface OwnerPortalChangeOrder {
  id: string;
  prime_contract_id: string;
  title: string | null;
  co_no: string | number | null;
  co_type: string;
  status: string;
  amount: number | null;
}

export interface OwnerPortalPayApp {
  id: string;
  prime_contract_id: string;
  pay_app_no: string | number;
  period_end: string | null;
  status: string;
  submitted_amount: number | null;
}

export interface OwnerPortalProjectMeta {
  id: string;
  name: string;
  project_type?: string | null;
  module_config?: Record<string, boolean> | null;
  module_inherit_from_parent?: boolean | null;
  parent_project_id?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  status?: string | null;
}

export interface OwnerPortalData {
  primeContracts: OwnerPortalContract[];
  pendingOcos: OwnerPortalChangeOrder[];
  pendingPayApps: OwnerPortalPayApp[];
  /** Flat project list — includes jobs without a prime contract. */
  projects: OwnerPortalProjectMeta[];
  /** Project rows keyed by id — used for portal module visibility. */
  projectMeta: Record<string, OwnerPortalProjectMeta>;
}

export function useClientPortalContext(projectId?: string | null) {
  return useQuery<ClientPortalContext | null>({
    queryKey: ["client-portal-context", projectId ?? "default"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_owner_portal_context" as any,
        projectId ? { p_project_id: projectId } : {},
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as ClientPortalContext | null;
    },
    staleTime: 60_000,
  });
}

export function usePortalInvitations() {
  const qc = useQueryClient();

  const list = useQuery<PortalInvitation[]>({
    queryKey: ["portal-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_invitations" as any)
        .select("*")
        .is("accepted_at", null)
        .order("invited_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PortalInvitation[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      email: string;
      organizationId?: string;
      projectId?: string;
      portalKind: "sub"|"owner";
      role?: string;
    }) => {
      const tenant_id = await requireTenantId();
      let organizationId = input.organizationId ?? null;

      // Owner RLS is intentionally organization-scoped. Derive that boundary
      // from the project's prime contract so an accepted invitation can only
      // see the intended owner's records. A null owner organization would
      // create a valid login with an empty portal, so fail clearly instead.
      if (input.portalKind === "owner" && !organizationId && input.projectId) {
        const { data: resolvedOrg, error: orgError } = await supabase.rpc(
          "resolve_owner_org_for_project" as any,
          { p_project_id: input.projectId } as any,
        );
        if (orgError) throw orgError;
        organizationId = (resolvedOrg as string | null) ?? null;
        if (!organizationId) {
          const { data: contract, error: contractError } = await supabase
            .from("prime_contracts" as any)
            .select("owner_org_id")
            .eq("project_id", input.projectId)
            .not("owner_org_id", "is", null)
            .limit(1)
            .maybeSingle();
          if (contractError) throw contractError;
          organizationId = (contract as any)?.owner_org_id ?? null;
        }
      }

      if (input.portalKind === "owner" && !organizationId) {
        throw new Error("Add the client's organization to the prime contract before inviting them.");
      }

      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      const { data, error } = await supabase.from("portal_invitations" as any).insert({
        tenant_id,
        email: input.email,
        organization_id: organizationId,
        project_id: input.projectId ?? null,
        portal_kind: input.portalKind,
        role: input.role ?? (input.portalKind === "sub" ? "subcontractor_portal" : "owner_portal"),
        token,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as PortalInvitation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-invitations"] }),
  });

  return { ...list, create };
}

/** Sub-portal data: commitments the current user can see, their invoices, and their RFIs. */
export function useSubPortalData() {
  return useQuery({
    queryKey: ["sub-portal-data"],
    queryFn: async () => {
      const [commitments, invoices, rfis] = await Promise.all([
        supabase.from("commitments" as any).select("*"),
        supabase.from("commitment_invoices" as any).select("*"),
        supabase.from("project_rfis" as any).select("*"),
      ]);
      return {
        commitments: commitments.data ?? [],
        invoices: invoices.data ?? [],
        rfis: rfis.data ?? [],
      };
    },
  });
}

/** Owner-portal data: prime contract, pending OCOs, pending pay apps. */
export function useOwnerPortalData() {
  return useQuery<OwnerPortalData>({
    queryKey: ["owner-portal-data"],
    queryFn: async () => {
      const [primeContracts, projects, cos, payApps] = await Promise.all([
        supabase.from("prime_contracts" as any).select("*"),
        // module_config drives which portal nav items the client sees
        supabase.from("projects" as any).select(
          "id, name, status, project_type, module_config, module_inherit_from_parent, parent_project_id, client_id, client:clients(name)",
        ),
        supabase.from("change_orders" as any).select("*")
          .eq("co_type", "OCO")
          .in("status", ["pending","out_for_signature"]),
        supabase.from("prime_contract_pay_apps" as any).select("*")
          .in("status", ["submitted"]),
      ]);
      const projectRows = (projects.data ?? []) as Array<{
        id: string;
        name: string;
        status?: string | null;
        project_type?: string | null;
        module_config?: Record<string, boolean> | null;
        module_inherit_from_parent?: boolean | null;
        parent_project_id?: string | null;
        client_id?: string | null;
        client?: { name?: string | null } | null;
      }>;
      const projectList: OwnerPortalProjectMeta[] = projectRows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status ?? null,
        project_type: row.project_type,
        module_config: row.module_config,
        module_inherit_from_parent: row.module_inherit_from_parent,
        parent_project_id: row.parent_project_id,
        client_id: row.client_id ?? null,
        client_name: row.client?.name ?? null,
      }));
      const projectNames = new Map(projectList.map((project) => [project.id, project.name]));
      const metaRecord: Record<string, OwnerPortalProjectMeta> = {};
      for (const row of projectList) metaRecord[row.id] = row;
      return {
        primeContracts: ((primeContracts.data ?? []) as unknown as OwnerPortalContract[]).map((contract) => ({
          ...contract,
          project_name: projectNames.get(contract.project_id) ?? contract.project_name ?? contract.title,
        })),
        pendingOcos: (cos.data ?? []) as unknown as OwnerPortalChangeOrder[],
        pendingPayApps: (payApps.data ?? []) as unknown as OwnerPortalPayApp[],
        projects: projectList,
        projectMeta: metaRecord,
      };
    },
  });
}

export function useOwnerApproveOco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { coId: string; signaturePath?: string }) => {
      const { data, error } = await supabase.rpc("owner_approve_oco" as any, {
        p_co_id: input.coId,
        p_signature_path: input.signaturePath ?? null,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-portal-data"] });
      qc.invalidateQueries({ queryKey: ["change-orders"] });
    },
  });
}

export function useOwnerRejectOco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { coId: string; reason: string }) => {
      const { data, error } = await supabase.rpc("owner_reject_oco" as any, {
        p_co_id: input.coId,
        p_reason: input.reason,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-portal-data"] });
      qc.invalidateQueries({ queryKey: ["change-orders"] });
    },
  });
}

export function useOwnerApprovePayApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payAppId: string; approvedAmount: number }) => {
      const { data, error } = await supabase.rpc("owner_approve_pay_app" as any, {
        p_pay_app_id: input.payAppId,
        p_approved_amount: input.approvedAmount,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-portal-data"] });
      qc.invalidateQueries({ queryKey: ["pay-app"] });
      qc.invalidateQueries({ queryKey: ["financial-report-data"] });
    },
  });
}

export function useOwnerRejectPayApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payAppId: string; reason: string; comment?: string }) => {
      const { data, error } = await supabase.rpc("owner_reject_pay_app" as any, {
        p_pay_app_id: input.payAppId,
        p_reason: input.reason,
        p_comment: input.comment ?? null,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-portal-data"] });
      qc.invalidateQueries({ queryKey: ["pay-app"] });
    },
  });
}

export interface ClientPortfolioProject {
  id: string;
  name: string;
  status: string | null;
  client_id: string | null;
}

export interface ClientPortfolio {
  clientId: string | null;
  clientName: string | null;
  projects: ClientPortfolioProject[];
}

/** Staff-side: every project that shares this job's client. */
export function useClientPortfolio(projectId: string | undefined) {
  return useQuery<ClientPortfolio>({
    queryKey: ["client-portfolio", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data: project, error } = await supabase
        .from("projects" as any)
        .select("id, name, status, client_id, client:clients(name)")
        .eq("id", projectId!)
        .maybeSingle();
      if (error) throw error;
      const row = project as {
        id: string;
        name: string;
        status?: string | null;
        client_id?: string | null;
        client?: { name?: string | null } | null;
      } | null;
      if (!row) return { clientId: null, clientName: null, projects: [] };
      if (!row.client_id) {
        return {
          clientId: null,
          clientName: row.client?.name ?? null,
          projects: [{ id: row.id, name: row.name, status: row.status ?? null, client_id: null }],
        };
      }
      const { data: siblings, error: siblingError } = await supabase
        .from("projects" as any)
        .select("id, name, status, client_id")
        .eq("client_id", row.client_id)
        .order("name");
      if (siblingError) throw siblingError;
      return {
        clientId: row.client_id,
        clientName: row.client?.name ?? null,
        projects: ((siblings ?? []) as ClientPortfolioProject[]),
      };
    },
  });
}
