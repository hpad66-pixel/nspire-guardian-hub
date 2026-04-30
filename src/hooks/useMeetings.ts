/**
 * C5 · Meetings — templates, agenda, attendees, action items.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export function useMeetings(projectId: string | null) {
  return useQuery({
    queryKey: ["meetings", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_meetings" as any).select("*")
        .eq("project_id", projectId!)
        .order("scheduled_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMeetingAgenda(meetingId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["meeting-agenda", meetingId],
    enabled: Boolean(meetingId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_agenda_items" as any).select("*")
        .eq("meeting_id", meetingId!).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addItem = useMutation({
    mutationFn: async (input: { title: string; category?: string; presenterId?: string }) => {
      if (!meetingId) throw new Error("No meeting");
      const { data: current } = await supabase
        .from("meeting_agenda_items" as any).select("sort_order")
        .eq("meeting_id", meetingId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const nextOrder = ((current as any)?.sort_order ?? 0) + 1;
      const { data, error } = await supabase.from("meeting_agenda_items" as any).insert({
        meeting_id: meetingId,
        sort_order: nextOrder,
        title: input.title,
        category: input.category ?? null,
        presenter_id: input.presenterId ?? null,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-agenda", meetingId] }),
  });

  return { ...list, addItem };
}

export function useMeetingActionItems(agendaItemId: string | null) {
  const qc = useQueryClient();
  return {
    add: useMutation({
      mutationFn: async (input: { description: string; assigneeId?: string; dueDate?: string }) => {
        if (!agendaItemId) throw new Error("No agenda item");
        const { data, error } = await supabase.from("meeting_action_items" as any).insert({
          agenda_item_id: agendaItemId,
          description: input.description,
          assignee_id: input.assigneeId ?? null,
          due_date: input.dueDate ?? null,
        } as any).select().single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-agenda", agendaItemId] }),
    }),
  };
}

export function useMeetingTemplates() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["meeting-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_templates" as any).select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; defaultAgenda?: unknown[] }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("meeting_templates" as any).insert({
        tenant_id, name: input.name, default_agenda: input.defaultAgenda ?? [],
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting-templates"] }),
  });

  return { ...list, create };
}

/** When creating a meeting in a series, auto-copy OPEN action items from the prior meeting as carryover agenda items. */
export async function carryOverOpenActionItems(fromMeetingId: string, toMeetingId: string) {
  const { data: openItems } = await supabase
    .from("meeting_action_items" as any)
    .select("description, agenda_item_id")
    .eq("status", "open");
  const fromAgenda = (
    await supabase.from("meeting_agenda_items" as any).select("id").eq("meeting_id", fromMeetingId)
  ).data ?? [];
  const fromIds = new Set((fromAgenda as any[]).map((a) => a.id));
  const relevant = (openItems ?? []).filter((it: any) => fromIds.has(it.agenda_item_id));

  for (const it of relevant as any[]) {
    await supabase.from("meeting_agenda_items" as any).insert({
      meeting_id: toMeetingId,
      sort_order: 9999,
      title: `Carryover: ${it.description}`,
      is_carryover: true,
    } as any);
  }
  return relevant.length;
}
