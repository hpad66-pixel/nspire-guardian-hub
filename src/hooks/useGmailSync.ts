import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CorrespondenceTopicDef { key: string; label: string; description: string }

export interface CorrespondenceSettings {
  project_id: string;
  party_domains: string[];
  party_emails: string[];
  import_topics: string[];
  /** This project's own topic taxonomy — empty means it hasn't been configured yet
   *  and the sync falls back to a generic relevant/other split. */
  topics: CorrespondenceTopicDef[];
  extra_terms: string | null;
  lookback_days: number;
  last_synced_at: string | null;
  last_result: { scanned?: number; imported?: number; byTopic?: Record<string, number>; parties?: string[] } | null;
}

export interface SyncResult {
  scanned: number;
  imported: number;
  byTopic: Record<string, number>;
  parties: string[];
  discovered?: boolean;
  /** Distinct insert error messages, if any row failed to save (surfaced instead
   *  of silently showing a lower imported count with no explanation). */
  insertErrors?: string[];
}

// Per-project inbound Gmail sync + its stored settings. The sync runs entirely in
// the gmail-sync edge function (token never reaches the browser); this hook kicks
// it off and refreshes the trail when it returns.
export function useGmailSync(projectId: string | null) {
  const qc = useQueryClient();

  const settings = useQuery({
    queryKey: ["correspondence-settings", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<CorrespondenceSettings | null> => {
      const { data, error } = await supabase
        .from("correspondence_settings" as any)
        .select("*")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as CorrespondenceSettings | null;
    },
  });

  const sync = useMutation({
    mutationFn: async (overrides?: Partial<Pick<CorrespondenceSettings, "party_domains" | "import_topics" | "topics" | "extra_terms" | "lookback_days">>): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke("gmail-sync", {
        body: { project_id: projectId, ...overrides },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SyncResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-emails", projectId] });
      qc.invalidateQueries({ queryKey: ["correspondence-settings", projectId] });
      qc.invalidateQueries({ queryKey: ["gmail-connection"] });
    },
  });

  return { settings, sync };
}
