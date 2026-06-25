import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface TenantSsoConfig {
  id: string;
  tenant_id: string;
  provider: "saml" | "oidc";
  idp_metadata_xml: string | null;
  idp_sso_url: string | null;
  idp_entity_id: string | null;
  idp_certificate: string | null;
  acs_url: string;
  sp_entity_id: string;
  is_enforced: boolean;
  default_template_id: string | null;
  attribute_mapping: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ScimToken {
  id: string;
  tenant_id: string;
  name: string;
  token_prefix: string;
  hashed_token: string;
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export function useSsoConfig() {
  const qc = useQueryClient();

  const query = useQuery<TenantSsoConfig | null>({
    queryKey: ["sso-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_sso_configs" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as TenantSsoConfig | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<TenantSsoConfig>) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase
        .from("tenant_sso_configs" as any)
        .upsert(
          { tenant_id, ...input } as any,
          { onConflict: "tenant_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TenantSsoConfig;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sso-config"] }),
  });

  return { ...query, upsert };
}

export function useScimTokens() {
  const qc = useQueryClient();

  const list = useQuery<ScimToken[]>({
    queryKey: ["scim-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_scim_tokens" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ScimToken[];
    },
  });

  /**
   * Generate a new SCIM bearer token. Returns the PLAINTEXT token ONCE —
   * caller MUST copy it immediately. Only the SHA-256 hash is stored.
   */
  const create = useMutation({
    mutationFn: async (input: { name: string }) => {
      const tenant_id = await requireTenantId();
      const raw = `scim_${crypto.randomUUID().replace(/-/g, "")}_${crypto.randomUUID().replace(/-/g, "")}`;
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
      const hashed = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const { error } = await supabase.from("tenant_scim_tokens" as any).insert({
        tenant_id,
        name: input.name,
        token_prefix: raw.slice(0, 12),
        hashed_token: hashed,
      } as any);
      if (error) throw error;
      return { raw };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scim-tokens"] }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tenant_scim_tokens" as any)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scim-tokens"] }),
  });

  return { ...list, create, revoke };
}

export function useSsoLoginEvents(limit = 50) {
  return useQuery({
    queryKey: ["sso-login-events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sso_login_events" as any)
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
