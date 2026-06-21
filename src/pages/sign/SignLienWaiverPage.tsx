import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LienWaiverDocument } from "@/lib/lienWaiver/LienWaiverDocument";
import { downloadWaiverPdf } from "@/lib/lienWaiver/lienWaiverPdf";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, FileDown, Upload, CheckCircle2, Loader2 } from "lucide-react";
import type { LienWaiverSpec } from "@/lib/lienWaiver/types";

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

export default function SignLienWaiverPage() {
  const { token } = useParams<{ token: string }>();
  const docRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data: d, error } = await supabase.functions.invoke("lien-countersign", { body: { token, action: "get" } });
    if (error || (d as any)?.error) setErr((d as any)?.error || error?.message || "Not found");
    else { setData(d); setName((d as any).signed_name ?? ""); setTitle((d as any).spec?.signature?.title ?? ""); }
    setLoading(false);
  }
  useEffect(() => { if (token) load(); /* eslint-disable-next-line */ }, [token]);

  const spec: LienWaiverSpec | undefined = data?.spec;
  const signed = !!data?.signature_url;
  const notarized = !!data?.notarized_url;

  async function sign() {
    if (!name.trim() || !sig) return toast.error("Type your name and pick a signature style.");
    setBusy(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("lien-countersign", {
        body: { token, action: "sign", name: name.trim(), title: title.trim(), dateStr: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), signatureDataUrl: sig },
      });
      if (error || (r as any)?.error) throw new Error((r as any)?.error || error?.message);
      toast.success("Signed. Now download, print, and notarize.");
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function downloadPdf() {
    if (!docRef.current) return;
    setBusy(true);
    try { await downloadWaiverPdf(docRef.current, `lien-waiver-${spec?.doc.waiver_no || "signed"}.pdf`); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function uploadNotarized(file: File) {
    setBusy(true);
    try {
      const b64 = await fileToDataUrl(file);
      const { data: r, error } = await supabase.functions.invoke("lien-countersign", { body: { token, action: "notarize", fileBase64: b64, filename: file.name } });
      if (error || (r as any)?.error) throw new Error((r as any)?.error || error?.message);
      toast.success("Notarized copy uploaded — thank you.");
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (err || !spec) return <div className="min-h-screen grid place-items-center p-6 text-center"><div><ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="font-medium">This waiver link isn’t available.</p><p className="text-sm text-muted-foreground">{err}</p></div></div>;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold flex items-center justify-center gap-2"><ShieldCheck className="h-5 w-5 text-[var(--apas-sapphire)]" /> {data.title}</h1>
          <p className="text-sm text-muted-foreground">For {data.claimant || spec.parties.claimant.name} · {spec.parties.project}</p>
        </div>

        {/* Action panel */}
        {!signed ? (
          <Card><CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">1 · Sign below, then download to print &amp; notarize.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
              <div><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. President" /></div>
            </div>
            <TypedSignaturePad defaultName={name} onChange={setSig} onNameChange={setName} />
            <div className="flex justify-end"><Button disabled={busy} onClick={sign}>{busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}Apply signature</Button></div>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Signed by {data.signed_name}.</p>
            <div className="rounded-md border border-[var(--apas-amber)]/40 bg-[var(--apas-amber)]/5 px-3 py-2 text-sm">
              <p className="font-medium">2 · Print → get it notarized → upload it back here.</p>
              <p className="text-muted-foreground text-xs mt-0.5">A notary must witness your wet-ink signature and stamp the printed copy. Then scan/photograph it and upload below.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={downloadPdf}><FileDown className="h-4 w-4 mr-1.5" />Download to print</Button>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNotarized(f); e.currentTarget.value = ""; }} />
              <Button disabled={busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1.5" />Upload notarized copy</Button>
            </div>
            {notarized && <p className="text-sm text-emerald-700 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Notarized copy received. You’re all set — nothing more to do.</p>}
          </CardContent></Card>
        )}

        {/* Document preview */}
        <div className="bg-white rounded-lg border overflow-auto">
          <div style={{ transform: "scale(0.96)", transformOrigin: "top left" }}>
            <LienWaiverDocument ref={docRef} spec={spec} signatureUrl={data.signature_url} />
          </div>
        </div>
      </div>
    </div>
  );
}
