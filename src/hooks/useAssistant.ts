/**
 * useAssistant — chat state for the financial assistant. Sends the running
 * conversation + projectId to the `assistant-chat` edge function (curated
 * read-only tools, RLS-scoped) and appends the reply.
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage { role: "user" | "assistant"; content: string; }

export function useAssistant(projectId: string | null, audience: "gc" | "owner" = "gc") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !projectId || isLoading) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setIsLoading(true);
    const mySeq = ++seq.current;
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("assistant-chat", {
        body: { projectId, messages: next, audience },
      });
      if (mySeq !== seq.current) return; // a newer send superseded this one
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = String((data as any)?.reply ?? "").trim() || "Sorry, I couldn't answer that.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      if (mySeq !== seq.current) return;
      setError(e.message ?? "Something went wrong.");
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e.message ?? "Something went wrong."}` }]);
    } finally {
      if (mySeq === seq.current) setIsLoading(false);
    }
  }, [messages, projectId, isLoading, audience]);

  const reset = useCallback(() => { seq.current++; setMessages([]); setError(null); setIsLoading(false); }, []);

  return { messages, isLoading, error, send, reset };
}
