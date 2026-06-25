/**
 * D3 · Change Events hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface ChangeEvent {
  id: string; tenant_id: string; project_id: string;
  event_no: number; title: string; description: string | null;
  originator_id: string | null;
  reason_code: "owner_request"|"design_change"|"field_condition"|"code_change"|"rfi_response"|"other"|null;
  status: "open"|"in_review"|"pending"|"void"|"closed";
  rom_value: number | null;
  event_date: string;
  rfi_id: string | null;
  created_at: string; updated_at: string;
}

export interface ChangeEventLine {
  id: string; change_event_id: string;
  cost_code_id: string; description: string;
  estimated_cost: number;
  status_bucket: "pending"|"approved"|"not_included"|"void";
  pco_id: string | null;
}

export function useChangeEvents(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<ChangeEvent[]>({
    queryKey: ["change-events", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_events" as any).select("*")
        .eq("project_id", projectId!).order("event_no", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ChangeEvent[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<ChangeEvent> & { title: string }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("change_events" as any).insert({
        tenant_id, project_id: projectId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as ChangeEvent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["change-events", projectId] }),
  });

  return { ...list, create };
}

export function useChangeEventLines(eventId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<ChangeEventLine[]>({
    queryKey: ["change-event-lines", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_event_lines" as any).select("*")
        .eq("change_event_id", eventId!);
      if (error) throw error;
      return (data ?? []) as unknown as ChangeEventLine[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (input: Omit<ChangeEventLine, "id"|"change_event_id"|"pco_id">) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("change_event_lines" as any).insert({
        tenant_id, change_event_id: eventId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as ChangeEventLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["change-event-lines", eventId] }),
  });

  const setBucket = useMutation({
    mutationFn: async (input: { lineId: string; bucket: ChangeEventLine["status_bucket"] }) => {
      const { error } = await supabase.from("change_event_lines" as any)
        .update({ status_bucket: input.bucket } as any)
        .eq("id", input.lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change-event-lines", eventId] });
      qc.invalidateQueries({ queryKey: ["change-events"] });
    },
  });

  /** Promote selected lines to a single PCO. */
  const promoteToPco = useMutation({
    mutationFn: async (input: {
      projectId: string; primeContractId: string; title: string;
      lineIds: string[];
    }) => {
      const tenant_id = await requireTenantId();

      const { data: lines } = await supabase
        .from("change_event_lines" as any).select("*")
        .in("id", input.lineIds);
      const totalAmount = (lines ?? []).reduce((s: number, l: any) => s + Number(l.estimated_cost ?? 0), 0);

      const { data: co, error: coErr } = await supabase.from("change_orders" as any).insert({
        tenant_id,
        project_id: input.projectId,
        prime_contract_id: input.primeContractId,
        co_type: "PCO",
        title: input.title,
        amount: totalAmount,
        status: "draft",
      } as any).select().single();
      if (coErr) throw coErr;

      const { error: colErr } = await supabase.from("change_order_lines" as any).insert(
        (lines as any[]).map((l) => ({
          tenant_id,
          change_order_id: (co as any).id,
          cost_code_id: l.cost_code_id,
          description: l.description,
          amount: l.estimated_cost,
        })) as any,
      );
      if (colErr) throw colErr;

      await supabase.from("change_event_lines" as any)
        .update({ status_bucket: "approved", pco_id: (co as any).id } as any)
        .in("id", input.lineIds);

      return co;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change-event-lines", eventId] });
      qc.invalidateQueries({ queryKey: ["change-orders"] });
    },
  });

  return { ...list, addLine, setBucket, promoteToPco };
}
