/**
 * A3 · Distribution Lists service.
 *
 * Canonical API for resolving recipients across every workflow module.
 * NEVER hardcode recipient arrays — use resolveDistribution() instead.
 */
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface Recipient {
  user_id: string | null;
  contact_id: string | null;
  email: string;
  role_label: string | null;
}

export type RecordType =
  | "rfi" | "submittal" | "punch" | "change_order" | "change_event"
  | "daily_log" | "meeting" | "pay_app" | "commitment" | "incident";

/** Resolve unique recipients from list_ids + individual user_ids + extra emails. */
export async function resolveDistribution(input: {
  listIds?: string[];
  userIds?: string[];
  extraEmails?: string[];
}): Promise<Recipient[]> {
  const { data, error } = await supabase.rpc("resolve_distribution" as any, {
    p_list_ids: input.listIds ?? [],
    p_user_ids: input.userIds ?? [],
    p_extra_emails: input.extraEmails ?? [],
  } as any);
  if (error) throw error;
  return (data ?? []) as Recipient[];
}

/** Audit the send: write workflow_distributions rows. Returns count written. */
export async function logDistribution(input: {
  recordType: RecordType;
  recordId: string;
  recipients: Recipient[];
  reason: "fyi" | "response" | "approve";
  listIds?: string[];
}): Promise<number> {
  const tenant_id = await requireTenantId();
  const rows = input.recipients.map((r) => ({
    tenant_id,
    record_id: input.recordId,
    record_type: input.recordType,
    list_id: input.listIds?.[0] ?? null,
    user_id: r.user_id,
    email: r.email,
    reason: input.reason,
  }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("workflow_distributions" as any).insert(rows as any);
  if (error) throw error;
  return rows.length;
}
