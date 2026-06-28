/**
 * Public, token-gated page where the client (owner) reviews a signed change order
 * and counter-signs it. No app login required — the sign_token in the URL is the
 * capability, validated by the co-countersign edge function.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, PenLine, Loader2, FileDown, XCircle } from "lucide-react";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { ChangeOrderDocument } from "@/lib/changeOrder/ChangeOrderDocument";
import { buildCoPdf } from "@/lib/changeOrder/coPdf";
import type { CoSpec } from "@/lib/changeOrder/types";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/co-countersign`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);

interface CoSummary {
  co_label: string; title: string; amount: number; pdf_url: string | null;
  project: string; from: string; to: string; accepted: boolean; signable: boolean;
  rejected?: boolean; status?: string; client_comments?: string | null;
  spec: CoSpec | null; submitted_signature_path: string | null; accepted_signature_path: string | null;
}

export default function CounterSignChangeOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [co, setCo] = useState<CoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sigData, setSigData] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"sign" | "reject">("sign");
  const [comments, setComments] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FN_BASE}?token=${token}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setCo(data);
        setDone(Boolean(data.accepted));
        setRejected(Boolean(data.rejected));
      } catch (e) { setErr((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [token]);

  async function submit() {
    if (!sigData || !name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(FN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, action: "accept", signature: sigData, name, comments: comments.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function reject() {
    if (!name.trim() || comments.trim().length < 2) return setErr("Add your name and a comment explaining the rejection.");
    setBusy(true); setErr(null);
    try {
      const res = await fetch(FN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, action: "reject", name, comments: comments.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRejected(true);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  if (err && !co) return <div className="min-h-screen flex items-center justify-center text-destructive">{err}</div>;

  async function downloadPdf() {
    if (!co?.spec) { if (co?.pdf_url) window.open(co.pdf_url, "_blank"); return; }
    const pdf = await buildCoPdf(co.spec, { submitted: co.submitted_signature_path });
    pdf.save(`${co.spec.doc.co_label || "change-order"}.pdf`);
  }

  return (
    <div className="min-h-screen bg-[#FDFCF9] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{co?.co_label} — {co?.title}</h1>
            <p className="text-muted-foreground text-sm">{co?.project} · {money(co?.amount ?? 0)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1.5" /> Download PDF</Button>
        </div>

        {/* Full document, rendered like a Word page — not a cramped viewer */}
        {co?.spec ? (
          <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
            <div className="mx-auto" style={{ width: 720, maxWidth: "100%" }}>
              <ChangeOrderDocument spec={co.spec} executed={done || co.status === "executed"} signatures={{ submitted: co.submitted_signature_path, accepted: done ? co.accepted_signature_path : null }} />
            </div>
          </div>
        ) : co?.pdf_url ? (
          <object data={co.pdf_url} type="application/pdf" className="w-full rounded-lg border bg-white" style={{ height: "80vh" }}>
            <a href={co.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[#1D6FE8] underline">Open the change order PDF</a>
          </object>
        ) : null}

        {done ? (
          <div className="rounded-lg border bg-emerald-50 text-emerald-800 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Change order executed. Thank you.</p>
            <p className="text-sm mt-1">A copy of the fully-executed change order has been emailed to you, and the contractor has been notified.</p>
          </div>
        ) : rejected ? (
          <div className="rounded-lg border bg-rose-50 text-rose-800 p-6 text-center">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Change order rejected.</p>
            <p className="text-sm mt-1">Your comments have been sent to the contractor.</p>
            {co?.client_comments && <p className="text-sm mt-2 italic">“{co.client_comments}”</p>}
          </div>
        ) : co?.signable ? (
          <div className="rounded-lg border bg-white p-5 space-y-3">
            <div className="flex gap-2">
              <Button variant={mode === "sign" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMode("sign")}><PenLine className="h-4 w-4 mr-1.5" />Accept &amp; sign</Button>
              <Button variant={mode === "reject" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMode("reject")}><XCircle className="h-4 w-4 mr-1.5" />Reject with comments</Button>
            </div>

            {mode === "sign" ? (
              <>
                <TypedSignaturePad onChange={setSigData} onNameChange={setName} />
                <div>
                  <label className="text-xs text-muted-foreground">Comments (optional)</label>
                  <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Any note to include with your acceptance" />
                </div>
                {err && <p className="text-sm text-destructive">{err}</p>}
                <Button className="w-full" onClick={submit} disabled={!sigData || !name.trim() || busy}>{busy ? "Submitting…" : "Accept & sign"}</Button>
                <p className="text-xs text-muted-foreground text-center">On acceptance, a fully-executed copy is emailed to you automatically.</p>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Your name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Reason for rejection</label>
                  <Textarea rows={4} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Tell the contractor what needs to change…" />
                </div>
                {err && <p className="text-sm text-destructive">{err}</p>}
                <Button variant="destructive" className="w-full" onClick={reject} disabled={!name.trim() || comments.trim().length < 2 || busy}>{busy ? "Sending…" : "Reject & send comments"}</Button>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
            {co?.status === "rejected" ? "This change order was rejected." : "This change order isn't available for signature."}
            {co?.client_comments && <p className="text-sm mt-2 italic">“{co.client_comments}”</p>}
          </div>
        )}
      </div>
    </div>
  );
}
