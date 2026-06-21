/**
 * Public, token-gated page where the client (owner) reviews a signed change order
 * and counter-signs it. No app login required — the sign_token in the URL is the
 * capability, validated by the co-countersign edge function.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PenLine, Loader2 } from "lucide-react";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/co-countersign`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);

interface CoSummary {
  co_label: string; title: string; amount: number; pdf_url: string | null;
  project: string; from: string; to: string; accepted: boolean; signable: boolean;
}

export default function CounterSignChangeOrderPage() {
  const { token } = useParams<{ token: string }>();
  const [co, setCo] = useState<CoSummary | null>(null);
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
        setCo(data);
        setDone(Boolean(data.accepted));
      } catch (e) { setErr((e as Error).message); }
      finally { setLoading(false); }
    })();
  }, [token]);

  async function submit() {
    if (!sigData || !name.trim()) return;
    setBusy(true);
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
  if (err && !co) return <div className="min-h-screen flex items-center justify-center text-destructive">{err}</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF9] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="text-center">
          <div className="text-lg font-bold tracking-wide">{co?.from || "APAS CONSULTING"}</div>
          <div className="h-1 w-20 bg-[#C4A35A] mx-auto my-2 rounded" />
          <h1 className="text-2xl font-bold">{co?.co_label} — {co?.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{co?.project} · Amount {money(co?.amount ?? 0)}</p>
        </div>

        {co?.pdf_url && (
          <object data={co.pdf_url} type="application/pdf" className="w-full rounded-lg border bg-white" style={{ height: 600 }}>
            <a href={co.pdf_url} target="_blank" rel="noopener noreferrer" className="text-[#1D6FE8] underline">Open the change order PDF</a>
          </object>
        )}

        {done ? (
          <div className="rounded-lg border bg-emerald-50 text-emerald-800 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Change order accepted. Thank you.</p>
            <p className="text-sm mt-1">The contractor has been notified.</p>
          </div>
        ) : co?.signable ? (
          <div className="rounded-lg border bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold"><PenLine className="h-4 w-4" /> Accept &amp; sign</div>
            <TypedSignaturePad onChange={setSigData} onNameChange={setName} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button className="w-full" onClick={submit} disabled={!sigData || !name.trim() || busy}>{busy ? "Submitting…" : "Accept & sign"}</Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">This change order isn't available for signature.</div>
        )}
      </div>
    </div>
  );
}
