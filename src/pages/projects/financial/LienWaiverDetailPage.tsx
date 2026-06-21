import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useLienWaiver, useLienWaivers } from "@/hooks/useLienWaivers";
import { SendLienWaiverDialog } from "@/components/financial/SendLienWaiverDialog";
import { LienWaiverEditor } from "@/components/financial/LienWaiverEditor";
import { LienWaiverDocument } from "@/lib/lienWaiver/LienWaiverDocument";
import { downloadWaiverPdf } from "@/lib/lienWaiver/lienWaiverPdf";
import { waiverTitle } from "@/lib/lienWaiver/templates";
import type { LienWaiverSpec } from "@/lib/lienWaiver/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ChevronRight, LayoutDashboard, Send, FileDown, CheckCircle2, Lock, ExternalLink, Pencil, X } from "lucide-react";

const fmtDateTime = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");
const toIsoDate = (s?: string) => {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const parseAmount = (s?: string) => {
  const n = parseFloat(String(s ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export default function LienWaiverDetailPage() {
  const { projectId, waiverId } = useParams<{ projectId: string; waiverId: string }>();
  const { data: w, refetch } = useLienWaiver(waiverId ?? null);
  const { update } = useLienWaivers(projectId ?? null);
  const docRef = useRef<HTMLDivElement>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<LienWaiverSpec | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("send") === "1" && w) {
      setSendOpen(true);
      const n = new URLSearchParams(searchParams); n.delete("send"); setSearchParams(n, { replace: true });
    }
  }, [searchParams, w, setSearchParams]);

  if (!w) return <div className="p-6 text-muted-foreground">Loading waiver…</div>;
  const spec = w.spec as LienWaiverSpec | null;
  const signed = !!w.claimant_signature_path;
  const notarized = !!w.notarized_path;
  const executed = w.status === "approved" || w.locked;
  const canEdit = !!spec && !signed && !notarized && !executed;

  function startEdit() {
    if (!spec) return;
    setDraft(structuredClone(spec));
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }
  function patchDraft(updater: (s: LienWaiverSpec) => void) {
    setDraft((prev) => { if (!prev) return prev; const n = structuredClone(prev); updater(n); return n; });
  }
  async function saveEdit() {
    if (!draft) return;
    if (!draft.parties.claimant.name.trim()) return toast.error("Add the Claimant name.");
    setBusy(true);
    try {
      await update.mutateAsync({
        id: w.id,
        patch: {
          spec: draft,
          release_type: draft.type,
          through_date: toIsoDate(draft.payment.through_date),
          amount: parseAmount(draft.payment.amount),
          waiver_no: draft.doc.waiver_no || null,
          title: waiverTitle(draft.type),
          claimant_name: draft.parties.claimant.name || null,
          claimant_email: draft.parties.claimant.email || null,
        },
      });
      toast.success("Waiver updated.");
      setEditing(false);
      setDraft(null);
      refetch();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function downloadPdf() {
    if (!docRef.current) return;
    setBusy(true);
    try { await downloadWaiverPdf(docRef.current, `lien-waiver-${spec?.doc?.waiver_no || "waiver"}.pdf`); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function execute() {
    if (!notarized && !window.confirm("No notarized copy has been uploaded yet. Execute anyway?")) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await update.mutateAsync({ id: w.id, patch: { status: "approved", executed_at: new Date().toISOString(), executed_by: user?.id ?? null, locked: true } });
      toast.success("Waiver executed — the AP payment gate is satisfied.");
      refetch();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const statusColor = executed ? "bg-emerald-100 text-emerald-800" : signed ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800";
  const statusLabel = executed ? "Executed" : notarized ? "Notarized — awaiting execution" : signed ? "Signed — awaiting notarization" : w.sent_at ? "Sent — awaiting signature" : "Draft";

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-5">
      <FinancialSubNav />
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/projects/${projectId}/financials/lien-releases`} className="hover:text-foreground">Lien Releases</Link>
        <ChevronRight className="h-3.5 w-3.5" /><span className="text-foreground font-medium truncate">{w.title}</span>
      </nav>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">{w.title}</h1>
            <p className="text-muted-foreground text-sm">{w.claimant_name || spec?.parties?.claimant?.name} · {spec?.parties?.project}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusColor}>{statusLabel}</Badge>
          {executed && <Badge className="bg-emerald-600 text-white gap-1"><Lock className="h-3 w-3" /> Locked</Badge>}
        </div>
      </div>

      <Card><CardContent className="p-4 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button disabled={busy} onClick={saveEdit}><CheckCircle2 className="h-4 w-4 mr-1.5" />{busy ? "Saving…" : "Save changes"}</Button>
            <Button variant="ghost" disabled={busy} onClick={cancelEdit}><X className="h-4 w-4 mr-1.5" />Cancel</Button>
            <span className="text-xs text-muted-foreground ml-1">Editing — changes apply to the document on save.</span>
          </>
        ) : (
          <>
            {canEdit && <Button variant="outline" onClick={startEdit}><Pencil className="h-4 w-4 mr-1.5" />Edit</Button>}
            {!executed && <Button variant="outline" onClick={() => setSendOpen(true)}><Send className="h-4 w-4 mr-1.5" />{w.sent_at ? "Re-send to claimant" : "Send to claimant"}</Button>}
            <Button variant="outline" disabled={busy} onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1.5" />{busy ? "…" : "Download PDF"}</Button>
            {w.notarized_path && <a href={w.notarized_path} target="_blank" rel="noopener noreferrer"><Button variant="outline"><ExternalLink className="h-4 w-4 mr-1.5" />Notarized copy</Button></a>}
            {!executed && <Button disabled={busy} onClick={execute}><CheckCircle2 className="h-4 w-4 mr-1.5" />Execute</Button>}
          </>
        )}
      </CardContent></Card>

      {/* Status timeline */}
      <Card><CardContent className="p-4 grid sm:grid-cols-4 gap-3 text-sm">
        <Step done={!!w.sent_at} label="Sent to claimant" sub={fmtDateTime(w.sent_at)} />
        <Step done={signed} label="Claimant signed" sub={signed ? `${w.claimant_signed_name} · ${fmtDateTime(w.claimant_signed_at)}` : "—"} />
        <Step done={notarized} label="Notarized uploaded" sub={notarized ? fmtDateTime(w.notarized_uploaded_at) : "—"} />
        <Step done={executed} label="Executed" sub={executed ? fmtDateTime(w.executed_at) : "—"} />
      </CardContent></Card>

      {/* Document (+ editor when editing) */}
      {editing && draft ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <LienWaiverEditor spec={draft} onPatch={patchDraft} />
          <div className="lg:sticky lg:top-4 self-start">
            <div className="text-xs text-muted-foreground mb-2">Live preview</div>
            <div className="border rounded-lg bg-muted/30 p-3 overflow-auto max-h-[calc(100vh-140px)]">
              <div style={{ transform: "scale(0.92)", transformOrigin: "top left" }}>
                <LienWaiverDocument ref={docRef} spec={draft} signatureUrl={w.claimant_signature_path} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg bg-muted/30 p-3 overflow-auto">
          {spec ? <LienWaiverDocument ref={docRef} spec={spec} signatureUrl={w.claimant_signature_path} /> : <p className="text-sm text-muted-foreground p-4">No document.</p>}
        </div>
      )}

      <SendLienWaiverDialog open={sendOpen} onOpenChange={setSendOpen} waiver={w} onSent={refetch} />
    </div>
  );
}

function Step({ done, label, sub }: { done: boolean; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${done ? "text-emerald-600" : "text-muted-foreground/30"}`} />
      <div>
        <div className={`font-medium ${done ? "" : "text-muted-foreground"}`}>{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
