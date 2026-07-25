import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GmailStatus {
  connected: boolean;
  email: string | null;
  last_synced_at: string | null;
  status: string | null;
}

// Gmail connection for the current user (per-workspace). The token lives only in
// the edge function; this hook only ever sees safe status fields.
export function useGmailConnection() {
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["gmail-connection"],
    // Always re-check on mount / tab focus so the button reflects a just-completed
    // connect without needing a hard refresh.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<GmailStatus> => {
      const { data, error } = await supabase.functions.invoke("gmail", { body: { action: "status" } });
      if (error) throw error;
      return (data ?? { connected: false, email: null, last_synced_at: null, status: null }) as GmailStatus;
    },
  });

  // Redirects the browser to Google's consent screen.
  const connect = useMutation({
    mutationFn: async (returnTo?: string) => {
      const { data, error } = await supabase.functions.invoke("gmail", {
        body: { action: "start", returnTo: returnTo ?? window.location.pathname, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Could not start Gmail connection.");
      window.location.href = data.url;
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("gmail", { body: { action: "disconnect" } });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["gmail-connection"] }),
  });

  return { status, connect, disconnect };
}
