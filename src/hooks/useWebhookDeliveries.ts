/**
 * G4 · useWebhookDeliveries
 *
 * Paginated delivery log per webhook + manual redeliver via
 * the webhook-redeliver edge function.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WebhookDelivery {
  id: string;
  tenant_id: string;
  webhook_subscription_id: string;
  event_type: string;
  payload: unknown;
  response_status: number | null;
  response_body: string | null;
  attempt_no: number;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export function useWebhookDeliveries(webhookId: string | null, limit = 100) {
  const qc = useQueryClient();

  const list = useQuery<WebhookDelivery[]>({
    queryKey: ["webhook-deliveries", webhookId, limit],
    enabled: Boolean(webhookId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_deliveries" as any)
        .select("*")
        .eq("webhook_subscription_id", webhookId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as WebhookDelivery[];
    },
  });

  const redeliver = useMutation({
    mutationFn: async (deliveryId: string): Promise<{ new_delivery_id: string }> => {
      const { data, error } = await supabase.functions.invoke(
        "webhook-redeliver",
        { body: { delivery_id: deliveryId } },
      );
      if (error) throw error;
      return data as { new_delivery_id: string };
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["webhook-deliveries", webhookId] }),
  });

  return { ...list, redeliver };
}
