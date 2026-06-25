/**
 * F1/F2 · Portal invitations + memberships.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface PortalInvitation {
  id: string; tenant_id: string; email: string;
  organization_id: string | null;
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
  return useQuery<"main"|"sub"|"owner">({
    queryKey: ["my-portal-kind"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_portal_kind" as any);
      if (error) return "main";
      return (data as "main"|"sub"|"owner") ?? "main";
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
      portalKind: "sub"|"owner";
      role?: string;
    }) => {
      const tenant_id = await requireTenantId();
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      const { data, error } = await supabase.from("portal_invitations" as any).insert({
        tenant_id,
        email: input.email,
        organization_id: input.organizationId ?? null,
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
  return useQuery({
    queryKey: ["owner-portal-data"],
    queryFn: async () => {
      const [primeContracts, cos, payApps] = await Promise.all([
        supabase.from("prime_contracts" as any).select("*"),
        supabase.from("change_orders" as any).select("*")
          .eq("co_type", "OCO")
          .in("status", ["pending","out_for_signature","draft"]),
        supabase.from("prime_contract_pay_apps" as any).select("*")
          .in("status", ["submitted"]),
      ]);
      return {
        primeContracts: primeContracts.data ?? [],
        pendingOcos: cos.data ?? [],
        pendingPayApps: payApps.data ?? [],
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
