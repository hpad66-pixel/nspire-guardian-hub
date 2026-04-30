/**
 * G4 · useWebhooks
 *
 * Webhook subscription CRUD + signing-secret rotation. Rotate
 * goes through the webhook-secret-rotate edge function so the
 * plaintext secret is generated server-side and revealed
 * exactly once.
 *
 * The existing useWebhookSubscriptions hook in useApiClients.ts
 * is preserved for backward compatibility; new code should use
 * this hook.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface Webhook {
  id: string;
  tenant_id: string;
  name: string | null;
  url: string;
  events: string[];
  secret: string;            // legacy plaintext, '' after rotate
  secret_hash: string | null; // new salted hash
  is_active: boolean;
  created_at: string;
}

export interface CreateWebhookInput {
  name?: string;
  url: string;
  events: string[];
}

export interface RotatedSecret {
  webhook_id: string;
  signing_secret: string; // plaintext, REVEAL ONCE
}

export function useWebhooks() {
  const qc = useQueryClient();

  const list = useQuery<Webhook[]>({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_subscriptions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Webhook[];
    },
  });

  /** Create a webhook. Plaintext secret is also returned once. */
  const create = useMutation({
    mutationFn: async (input: CreateWebhookInput): Promise<Webhook> => {
      if (!input.url) throw new Error("url is required");
      if (!Array.isArray(input.events) || input.events.length === 0) {
        throw new Error("at least one event_type is required");
      }
      const tenant_id = await requireTenantId();
      // Initial secret is generated client-side (will be rotated
      // server-side on first rotation). The temporary plaintext
      // is the same value the legacy hook produced.
      const secret = `whsec_${crypto.getRandomValues(new Uint8Array(32))
        .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}`;
      const { data, error } = await supabase
        .from("webhook_subscriptions" as any)
        .insert({
          tenant_id,
          name: input.name ?? null,
          url: input.url,
          events: input.events,
          secret,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Webhook;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  /** Soft-delete: flip is_active false. */
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("webhook_subscriptions" as any)
        .update({ is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  /** Rotate signing secret via edge function. Plaintext returned ONCE. */
  const rotate = useMutation({
    mutationFn: async (id: string): Promise<RotatedSecret> => {
      const { data, error } = await supabase.functions.invoke(
        "webhook-secret-rotate",
        { body: { webhook_id: id } },
      );
      if (error) throw error;
      const payload = data as RotatedSecret | undefined;
      if (!payload?.signing_secret) {
        throw new Error("rotate did not return a plaintext secret");
      }
      return payload;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  return { ...list, create, remove, rotate };
}
