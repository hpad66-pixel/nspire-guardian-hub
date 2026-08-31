/**
 * Public, token-gated page where a client reviews and e-signs an authored
 * correspondence document. No app login — sign_token is the capability.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, PenLine, Loader2, XCircle } from "lucide-react";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { ESignStamp } from "@/components/correspondence/ESignStamp";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-countersign`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface DocSummary {
  title: string;
  project: string;
  mime_type: string | null;
  source_file_name: string | null;
  contractor_signed_at: string | null;
  contractor_signed_name: string | null;
  contractor_signature_data: string | null;
  client_signed_at: string | null;
  client_signed_name: string | null;
  accepted: boolean;
  signable: boolean;
  preview_html: string | null;
  has_pdf: boolean;
  pdf_base64: string | null;
}

export default function SignAuthoredDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<DocSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sigData, setSigData] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"sign" | "reject">("sign");
  const [comments, setComments] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FN_BASE}?token=${token}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setDoc(data);
        setDone(Boolean(data.accepted));
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function submit() {
    if (!sigData || !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(FN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, action: "accept", signature: sigData, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!name.trim() || comments.trim().length < 2) {
      setErr("Add your name and a comment explaining the rejection.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(FN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ token, action: "reject", name, comments: comments.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setErr("Response recorded. The sender has been notified.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FDFCF9]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FDFCF9] p-6">
        <div className="max-w-md text-center">
          <XCircle className="h-10 w-10 mx-auto text-rose-500 mb-3" />
          <h1 className="text-xl font-bold">Document unavailable</h1>
          <p className="text-sm text-muted-foreground mt-2">{err || "This signature link is invalid or expired."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF9]">
      <div className="bg-gradient-to-r from-[#0D3B30] to-[#1A1714] text-[#FAF8F4] px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">APAS · Correspondence</div>
          <h1 className="mt-2 font-display text-3xl font-bold">{doc.title}</h1>
          {doc.project && <p className="mt-1 text-sm text-[#D9D4CB]">{doc.project}</p>}
          {doc.contractor_signed_name && (
            <p className="mt-2 text-xs text-[#C4A35A]">Already signed by {doc.contractor_signed_name}</p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {done ? (
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600" />
            <div className="flex justify-center">
              <ESignStamp name={name || doc.client_signed_name || "Client"} signedAt={new Date().toISOString()} />
            </div>
            <h2 className="text-xl font-bold">Document executed</h2>
            <p className="text-sm text-muted-foreground">Thank you. Your signature has been recorded on “{doc.title}”.</p>
          </div>
        ) : (
          <>
            {doc.contractor_signed_name && (
              <div className="flex justify-start">
                <ESignStamp name={doc.contractor_signed_name} signedAt={doc.contractor_signed_at} />
              </div>
            )}
            <div className="relative rounded-2xl border bg-white overflow-hidden shadow-sm">
              {doc.contractor_signed_name && (
                <div className="pointer-events-none absolute right-3 top-3 z-10">
                  <ESignStamp name={doc.contractor_signed_name} signedAt={doc.contractor_signed_at} compact />
                </div>
              )}
              {doc.has_pdf && doc.pdf_base64 ? (
                <iframe
                  title="Document PDF"
                  src={`data:application/pdf;base64,${doc.pdf_base64}`}
                  className="w-full h-[70vh] bg-white"
                />
              ) : doc.preview_html ? (
                <div className="p-6 max-h-[70vh] overflow-auto prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: doc.preview_html }} />
              ) : (
                <div className="p-10 text-center text-muted-foreground text-sm">Preview unavailable — you can still sign below.</div>
              )}
            </div>

            {doc.contractor_signature_data && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center gap-3">
                <img src={doc.contractor_signature_data} alt="Contractor signature" className="h-12 object-contain" />
                <div className="text-sm">
                  <div className="font-medium text-emerald-950">APAS electronically signed</div>
                  <div className="text-xs text-emerald-800">{doc.contractor_signed_name}</div>
                </div>
              </div>
            )}

            {doc.signable ? (
              <div className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-[var(--apas-sapphire)]" />
                  <h2 className="font-semibold">Your electronic signature</h2>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={mode === "sign" ? "default" : "outline"} onClick={() => setMode("sign")}>Sign</Button>
                  <Button size="sm" variant={mode === "reject" ? "destructive" : "outline"} onClick={() => setMode("reject")}>Reject with comments</Button>
                </div>
                {mode === "sign" ? (
                  <>
                    <TypedSignaturePad onChange={setSigData} onNameChange={setName} />
                    {err && <p className="text-sm text-rose-600">{err}</p>}
                    <Button onClick={submit} disabled={busy || !sigData || !name.trim()} className="w-full">
                      {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PenLine className="h-4 w-4 mr-1.5" />}
                      Sign &amp; execute
                    </Button>
                  </>
                ) : (
                  <>
                    <TypedSignaturePad onChange={() => {}} onNameChange={setName} />
                    <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Explain what needs to change…" />
                    {err && <p className="text-sm text-rose-600">{err}</p>}
                    <Button variant="destructive" onClick={reject} disabled={busy || !name.trim()} className="w-full">
                      {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                      Reject document
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                This document is not currently open for signature.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
