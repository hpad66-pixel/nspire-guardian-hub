import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { fileToBackgroundDoc } from "@/lib/ai/backgroundDoc";
import { Sparkles, Paperclip, X, FileText, Loader2 } from "lucide-react";

export interface ProposalAiDraft {
  title: string;
  scope_notes: string;
  terms: string;
  markup_pct?: number;
  lines: {
    category: "labor" | "material" | "equipment" | "subcontract" | "other";
    description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    markup_pct: number;
  }[];
}

export function ProposalAiDraftCard({
  projectId,
  defaultMarkup,
  disabled,
  onApply,
}: {
  projectId: string;
  defaultMarkup: number;
  disabled?: boolean;
  onApply: (draft: ProposalAiDraft) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function draft() {
    if (!text.trim() && !file) {
      toast.error("Dictate what you want, or attach a subconsultant document.");
      return;
    }
    setBusy(true);
    try {
      let document: Record<string, string> | undefined;
      if (file) {
        try {
          document = { ...(await fileToBackgroundDoc(file)) };
        } catch (error) {
          toast.error((error as Error).message);
          setBusy(false);
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke("draft-financial-proposal", {
        body: {
          description: text.trim() || undefined,
          projectId,
          markupPct: defaultMarkup,
          document,
          documentName: file?.name,
        },
      });
      if (error) throw error;
      const draftResult = (data as { draft?: ProposalAiDraft })?.draft;
      if (!draftResult) throw new Error("No draft returned");
      await onApply(draftResult);
      toast.success("AI draft applied. Review and edit the lines below.");
      setText("");
      setFile(null);
    } catch (error) {
      toast.error(`Draft failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-[var(--apas-sapphire)]/30 bg-[var(--apas-sapphire)]/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-[var(--apas-sapphire)]" />
          Draft this proposal with AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <VoiceDictationTextareaWithAI
          value={text}
          onValueChange={setText}
          rows={4}
          context="notes"
          placeholder="Dictate or type what the proposal is for — the scope, deliverables, quantities, pricing, and any terms. Claude writes it up, addressed to this project's client."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Paperclip className="mr-2 h-4 w-4" />
            {file ? "Change attachment" : "Attach subconsultant doc"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.tsv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {file && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs">
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="max-w-[180px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <Button className="ml-auto" size="sm" onClick={draft} disabled={busy || disabled}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy ? "Drafting…" : "Draft with AI"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The draft fills in the scope, priced line items, and terms. Nothing is sent — you review and edit everything first.
        </p>
      </CardContent>
    </Card>
  );
}
