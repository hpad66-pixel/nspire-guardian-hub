import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProject } from "@/hooks/useProjects";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { useCoSettings } from "@/hooks/useCoSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LienWaiverDocument } from "@/lib/lienWaiver/LienWaiverDocument";
import { blankWaiverSpec, WAIVER_TYPES, fmtLongDate } from "@/lib/lienWaiver/defaults";
import { downloadWaiverPdf } from "@/lib/lienWaiver/lienWaiverPdf";
import { isUnconditional } from "@/lib/lienWaiver/types";
import type { LienWaiverSpec } from "@/lib/lienWaiver/types";
import { FileDown, Printer, ChevronRight, LayoutDashboard, ShieldCheck } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

export default function LienWaiverGeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const { data: contract } = usePrimeContract(projectId ?? null);
  const { data: coSettings } = useCoSettings();
  const docRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const [spec, setSpec] = useState<LienWaiverSpec>(() => blankWaiverSpec({ date: fmtLongDate(today()) }));
  const seeded = useRef(false);
  if (!seeded.current && (project || contract || coSettings)) {
    seeded.current = true;
    setSpec((prev) => ({
      ...prev,
      doc: {
        ...prev.doc,
        wordmark: (coSettings as any)?.wordmark || prev.doc.wordmark,
        footer: (coSettings as any)?.footer || prev.doc.footer,
      },
      parties: {
        ...prev.parties,
        owner: prev.parties.owner || (contract as any)?.owner_name || "",
        customer: prev.parties.customer || (coSettings as any)?.company_name || (contract as any)?.contractor_name || "",
        project: prev.parties.project || (project as any)?.name || (contract as any)?.title || "",
        property: prev.parties.property || (contract as any)?.project_address || "",
      },
    }));
  }

  function patch(updater: (s: LienWaiverSpec) => void) {
    setSpec((prev) => { const n = structuredClone(prev); updater(n); return n; });
  }
  const conditional = !isUnconditional(spec.type);

  async function exportPdf() {
    if (!docRef.current) return;
    setBusy(true);
    try {
      await downloadWaiverPdf(docRef.current, `waiver-${spec.doc.waiver_no || "draft"}.pdf`);
    } catch (e) {
      toast.error(`PDF failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-4">
      <FinancialSubNav />
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap print:hidden">
        <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/projects/${projectId}/financials/lien-releases`} className="hover:text-foreground">Lien Releases</Link>
        <ChevronRight className="h-3.5 w-3.5" /><span className="text-foreground font-medium">New Waiver</span>
      </nav>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Lien Waiver &amp; Release</h1>
            <p className="text-muted-foreground text-sm">Our branded format · edit any field · live preview on the right. Print to notarize.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          <Button disabled={busy} onClick={exportPdf}><FileDown className="h-4 w-4 mr-1.5" />{busy ? "Preparing…" : "Download PDF"}</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Waiver type</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {WAIVER_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => patch((s) => { s.type = t.value; })}
                  className={`text-left rounded-lg border p-2.5 transition-colors ${spec.type === t.value ? "border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/5" : "hover:border-muted-foreground/40"}`}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.hint}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Header</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div><Label>Waiver No.</Label><Input value={spec.doc.waiver_no} onChange={(e) => patch((s) => { s.doc.waiver_no = e.target.value; })} /></div>
              <div><Label>Pay App No.</Label><Input value={spec.doc.pay_app_no ?? ""} onChange={(e) => patch((s) => { s.doc.pay_app_no = e.target.value; })} /></div>
              <div><Label>Date</Label><Input value={spec.doc.date} onChange={(e) => patch((s) => { s.doc.date = e.target.value; })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Claimant (the party signing / waiving)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Claimant name</Label><Input placeholder="e.g. D'Shin Plumbing LLC" value={spec.parties.claimant.name} onChange={(e) => patch((s) => { s.parties.claimant.name = e.target.value; })} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={spec.parties.claimant.address ?? ""} onChange={(e) => patch((s) => { s.parties.claimant.address = e.target.value; })} /></div>
              <div><Label>Signed by (name)</Label><Input value={spec.signature.name ?? ""} onChange={(e) => patch((s) => { s.signature.name = e.target.value; })} /></div>
              <div><Label>Title</Label><Input value={spec.signature.title ?? ""} onChange={(e) => patch((s) => { s.signature.title = e.target.value; })} /></div>
              <div className="col-span-2"><Label>Claimant email (for sending)</Label><Input value={spec.parties.claimant.email ?? ""} onChange={(e) => patch((s) => { s.parties.claimant.email = e.target.value; })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Project &amp; parties</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label>Customer (who claimant billed)</Label><Input value={spec.parties.customer} onChange={(e) => patch((s) => { s.parties.customer = e.target.value; })} /></div>
              <div><Label>Property Owner</Label><Input value={spec.parties.owner} onChange={(e) => patch((s) => { s.parties.owner = e.target.value; })} /></div>
              <div className="col-span-2"><Label>Work (scope)</Label><Input placeholder="e.g. Sanitary sewer plumbing" value={spec.parties.scope ?? ""} onChange={(e) => patch((s) => { s.parties.scope = e.target.value; })} /></div>
              <div><Label>Project</Label><Input value={spec.parties.project} onChange={(e) => patch((s) => { s.parties.project = e.target.value; })} /></div>
              <div><Label>Property</Label><Input value={spec.parties.property} onChange={(e) => patch((s) => { s.parties.property = e.target.value; })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label>{conditional ? "Amount of payment" : "Amount received"} ($)</Label><Input value={spec.payment.amount} onChange={(e) => patch((s) => { s.payment.amount = e.target.value; })} /></div>
              <div><Label>Through / Effective date</Label><Input value={spec.payment.through_date} onChange={(e) => patch((s) => { s.payment.through_date = e.target.value; })} /></div>
              {conditional && <div><Label>Method of payment</Label><Input placeholder="Wire Transfer / Check #" value={spec.payment.method ?? ""} onChange={(e) => patch((s) => { s.payment.method = e.target.value; })} /></div>}
              {conditional && <div><Label>Maker of payment</Label><Input value={spec.payment.maker ?? ""} onChange={(e) => patch((s) => { s.payment.maker = e.target.value; })} /></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Exceptions (reserved rights)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label>Disputed claims ($)</Label><Input value={spec.exceptions.disputed_amount ?? ""} onChange={(e) => patch((s) => { s.exceptions.disputed_amount = e.target.value; })} /></div>
              <div className="col-span-2"><Label>Other exceptions</Label><Textarea rows={2} value={spec.exceptions.other ?? ""} onChange={(e) => patch((s) => { s.exceptions.other = e.target.value; })} /></div>
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="text-xs text-muted-foreground mb-2 print:hidden">Live preview</div>
          <div className="border rounded-lg overflow-auto max-h-[calc(100vh-140px)] bg-muted/30 p-3 print:border-0 print:max-h-none print:overflow-visible print:bg-white print:p-0">
            <div style={{ transform: "scale(0.92)", transformOrigin: "top left" }} className="print:!transform-none">
              <LienWaiverDocument ref={docRef} spec={spec} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
