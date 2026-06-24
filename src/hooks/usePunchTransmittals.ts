/**
 * Punch list transmittals — group items, email them to a subcontractor, and track
 * the response. The create() mutation writes the transmittal + item links and
 * returns the row (incl. respond_token for the public link); the list query feeds
 * the audit panel (sent / viewed / responded timeline + per-item sub status).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export interface PunchTransmittal {
  id: string;
  project_id: string;
  commitment_id: string | null;
  recipient_name: string | null;
  recipient_email: string;
  subject: string | null;
  message: string | null;
  status: "draft" | "sent" | "viewed" | "responded" | "closed";
  respond_token: string;
  item_count: number;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
  items?: { id: string; description: string; location: string; sub_status: string | null; photos?: string[] }[];
}

export interface CreateTransmittalInput {
  projectId: string;
  commitmentId: string | null;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  message: string;
  punchItemIds: string[];
}

export function useCreatePunchTransmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransmittalInput): Promise<PunchTransmittal> => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { data: tx, error } = await supabase.from("punch_transmittals" as any).insert({
        tenant_id, project_id: input.projectId, commitment_id: input.commitmentId,
        recipient_name: input.recipientName || null, recipient_email: input.recipientEmail,
        subject: input.subject || null, message: input.message || null,
        status: "sent", item_count: input.punchItemIds.length, sent_by: user?.id, sent_at: now,
      } as any).select().single();
      if (error) throw error;
      const transmittal = tx as unknown as PunchTransmittal;

      if (input.punchItemIds.length) {
        const links = input.punchItemIds.map((pid) => ({ tenant_id, transmittal_id: transmittal.id, punch_item_id: pid }));
        const { error: linkErr } = await supabase.from("punch_transmittal_items" as any).insert(links as any);
        if (linkErr) throw linkErr;
        // Assign these items to the sub for at-a-glance tracking.
        if (input.commitmentId) {
          await supabase.from("punch_items" as any)
            .update({ commitment_id: input.commitmentId } as any)
            .in("id", input.punchItemIds);
        }
      }
      return transmittal;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["punch-transmittals", v.projectId] });
      qc.invalidateQueries({ queryKey: ["punch-items"] });
    },
  });
}

export function usePunchTransmittals(projectId: string | null) {
  return useQuery<PunchTransmittal[]>({
    queryKey: ["punch-transmittals", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("punch_transmittals" as any)
        .select("*, punch_transmittal_items(punch_items(id, description, location, sub_status))")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const txs = ((data ?? []) as any[]).map((t) => ({
        ...t,
        items: (t.punch_transmittal_items ?? []).map((l: any) => l.punch_items).filter(Boolean),
      }));

      // Attach response photos (accumulated across responses) to each item.
      const itemIds = txs.flatMap((t) => t.items.map((i: any) => i.id));
      if (itemIds.length) {
        const { data: resp } = await supabase
          .from("punch_item_responses" as any)
          .select("punch_item_id, photos")
          .in("punch_item_id", itemIds);
        const byItem: Record<string, string[]> = {};
        for (const r of (resp ?? []) as any[]) {
          if (Array.isArray(r.photos) && r.photos.length) byItem[r.punch_item_id] = [...(byItem[r.punch_item_id] ?? []), ...r.photos];
        }
        for (const t of txs) for (const i of t.items as any[]) i.photos = byItem[i.id] ?? [];
      }
      return txs as PunchTransmittal[];
    },
  });
}
