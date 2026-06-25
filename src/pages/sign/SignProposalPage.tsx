/**
 * Public, token-gated page where a recipient reviews a proposal and e-signs it.
 * No app login required — the sign_token in the URL is the capability, validated
 * by the proposal-countersign edge function. Mirrors the change-order sign flow.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposal-countersign`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface ProposalSummary {
  title: string;
  content_html: string;
  project: string;
  recipient_name: string;
  recipient_company: string;
  status: string;
  signed: boolean;
  signed_name: string | null;
  signature_path: string | null;
  signable: boolean;
}

export default function SignProposalPage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<ProposalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sigData, setSigData] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FN_BASE}?token=${token}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setDoc(data);
        setDone(Boolean(data.signed));
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
        body: JSON.stringify({ token, signature: sigData, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  if (err && !doc) return <div className="min-h-screen flex items-center justify-center text-destructive">{err}</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF9] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold">{doc?.title}</h1>
          {doc?.project && <p className="text-muted-foreground text-sm">{doc.project}</p>}
        </div>

        {/* Proposal document */}
        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <div
            className="prose max-w-none mx-auto p-8"
            style={{ width: 760, maxWidth: "100%" }}
            dangerouslySetInnerHTML={{ __html: doc?.content_html ?? "" }}
          />
          {done && doc?.signature_path && (
            <div className="border-t p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Signed by {doc.signed_name}</p>
              <img src={doc.signature_path} alt="signature" className="h-16" />
            </div>
          )}
        </div>

        {done ? (
          <div className="rounded-lg border bg-emerald-50 text-emerald-800 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Proposal signed. Thank you.</p>
            <p className="text-sm mt-1">A confirmation has been emailed to you.</p>
          </div>
        ) : doc?.signable ? (
          <div className="rounded-lg border bg-white p-5 space-y-3">
            <TypedSignaturePad onChange={setSigData} onNameChange={setName} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button className="w-full" onClick={submit} disabled={!sigData || !name.trim() || busy}>
              {busy ? "Submitting…" : "Sign proposal"}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
            This proposal isn't available for signature.
          </div>
        )}
      </div>
    </div>
  );
}
