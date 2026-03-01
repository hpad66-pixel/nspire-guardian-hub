import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GenerateProposalParams {
  projectId: string;
  proposalType: string;
  templateId?: string;
  userNotes?: string;
  subject?: string;
  milestoneIds?: string[];
}

interface UseProposalGenerationOptions {
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export function useProposalGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (params: GenerateProposalParams, options: UseProposalGenerationOptions) => {
      const { onDelta, onDone, onError } = options;

      setIsGenerating(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-proposal`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify(params),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          if (response.status === 402) {
            throw new Error("AI credits exhausted. Please add credits.");
          }
          
          throw new Error(errorData.error || "Failed to generate proposal");
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process line-by-line
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                onDelta(content);
              }
            } catch {
              // Incomplete JSON, put it back
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) {
                onDelta(content);
              }
            } catch {
              // Ignore
            }
          }
        }

        onDone();
      } catch (error) {
        console.error("Error generating proposal:", error);
        onError(error instanceof Error ? error : new Error("Unknown error"));
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    generate,
    isGenerating,
  };
}
