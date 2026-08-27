import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { fileToBackgroundDoc } from "@/lib/ai/backgroundDoc";
import { Sparkles, Paperclip, X, FileText, Loader2, RefreshCw, ListPlus } from "lucide-react";

export interface ProposalAiDraft {
  title: string;
  overview: string;
  scope_bullets: string[];
  deliverables: string[];
  terms: string;
  overhead_pct?: number;
  profit_pct?: number;
  lines: {
    category: "labor" | "material" | "equipment" | "subcontract" | "other";
    description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
  }[];
}

export function ProposalAiDraftCard({
  projectId,
  defaultOverhead,
  defaultProfit,
  disabled,
  onApply,
  hasExistingContent = false,
}: {
  projectId: string;
  defaultOverhead: number;
  defaultProfit: number;
  disabled?: boolean;
  onApply: (draft: ProposalAiDraft, mode: "replace" | "append") => Promise<void>;
  hasExistingContent?: boolean;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<ProposalAiDraft | null>(null);
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
          overheadPct: defaultOverhead,
          profitPct: defaultProfit,
          document,
          documentName: file?.name,
        },
      });
      if (error) throw error;
      const draftResult = (data as { draft?: ProposalAiDraft })?.draft;
      if (!draftResult) throw new Error("No draft returned");
      setCandidate(draftResult);
      toast.success("AI draft ready for your review.");
    } catch (error) {
      toast.error(`Draft failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function apply(mode: "replace" | "append") {
    if (!candidate) return;
    setBusy(true);
    try {
      await onApply(candidate, mode);
      toast.success(mode === "replace" ? "Proposal draft replaced. Review every section before signing." : "AI scope and fee lines added to the proposal.");
      setCandidate(null);
      setText("");
      setFile(null);
    } catch (error) {
      toast.error(`Could not apply draft: ${(error as Error).message}`);
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
        {candidate ? (
          <div className="rounded-lg border border-[var(--apas-sapphire)]/30 bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{candidate.title || "AI proposal draft"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{candidate.scope_bullets?.length ?? 0} scope items · {candidate.deliverables?.length ?? 0} deliverables · {candidate.lines?.length ?? 0} priced lines</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCandidate(null)} disabled={busy}>Discard</Button>
            </div>
            {candidate.overview && <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{candidate.overview}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {hasExistingContent && <Button variant="outline" size="sm" onClick={() => apply("append")} disabled={busy}><ListPlus className="mr-1.5 h-4 w-4" />Add to current draft</Button>}
              <Button size="sm" onClick={() => apply("replace")} disabled={busy}><RefreshCw className="mr-1.5 h-4 w-4" />{hasExistingContent ? "Replace current draft" : "Use this draft"}</Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            AI prepares a candidate first. You choose whether to replace the current draft or add its fee lines; nothing is sent automatically.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
