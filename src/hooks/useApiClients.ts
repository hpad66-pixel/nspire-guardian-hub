/**
 * F3 · API clients, webhooks, usage hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface ApiClient {
  id: string; tenant_id: string; name: string;
  client_id: string; client_secret_hash: string;
  scopes: string[]; rate_limit: number;
  is_active: boolean; created_at: string; revoked_at: string | null;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes = 32): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useApiClients() {
  const qc = useQueryClient();

  const list = useQuery<ApiClient[]>({
    queryKey: ["api-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_clients" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApiClient[];
    },
  });

  /** Returns the plaintext client_secret ONCE — caller must copy it. */
  const create = useMutation({
    mutationFn: async (input: { name: string; scopes: string[]; rateLimit?: number }) => {
      const tenant_id = await requireTenantId();
      const clientId = `pk_${randomHex(8)}`;
      const clientSecret = `sk_${randomHex(32)}`;
      const secretHash = await sha256Hex(clientSecret);

      const { error } = await supabase.from("api_clients" as any).insert({
        tenant_id,
        name: input.name,
        client_id: clientId,
        client_secret_hash: secretHash,
        scopes: input.scopes,
        rate_limit: input.rateLimit ?? 600,
      } as any);
      if (error) throw error;
      return { client_id: clientId, client_secret: clientSecret };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-clients"] }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_clients" as any).update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-clients"] }),
  });

  return { ...list, create, revoke };
}

export interface WebhookSubscription {
  id: string; tenant_id: string; name: string | null;
  url: string; events: string[]; secret: string;
  is_active: boolean; created_at: string;
}

export function useWebhookSubscriptions() {
  const qc = useQueryClient();
  const list = useQuery<WebhookSubscription[]>({
    queryKey: ["webhook-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_subscriptions" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WebhookSubscription[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name?: string; url: string; events: string[] }) => {
      const tenant_id = await requireTenantId();
      const secret = `whsec_${randomHex(32)}`;
      const { data, error } = await supabase.from("webhook_subscriptions" as any).insert({
        tenant_id,
        name: input.name ?? null,
        url: input.url,
        events: input.events,
        secret,
      } as any).select().single();
      if (error) throw error;
      return data as WebhookSubscription;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-subscriptions"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_subscriptions" as any)
        .update({ is_active: false } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-subscriptions"] }),
  });

  return { ...list, create, remove };
}

export function useWebhookDeliveries(subscriptionId: string | null) {
  return useQuery({
    queryKey: ["webhook-deliveries", subscriptionId],
    enabled: Boolean(subscriptionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_deliveries" as any).select("*")
        .eq("webhook_subscription_id", subscriptionId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApiUsage(days = 30) {
  return useQuery({
    queryKey: ["api-usage", days],
    queryFn: async () => {
      const start = new Date();
      start.setDate(start.getDate() - days);
      const { data, error } = await supabase
        .from("api_usage_daily" as any).select("*")
        .gte("date", start.toISOString().split("T")[0])
        .order("date");
      if (error) throw error;
      return data ?? [];
    },
  });
}
