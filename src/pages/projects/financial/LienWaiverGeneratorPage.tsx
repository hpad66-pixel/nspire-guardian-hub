import { useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLienWaivers } from "@/hooks/useLienWaivers";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProject } from "@/hooks/useProjects";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { useCoSettings } from "@/hooks/useCoSettings";
import { Button } from "@/components/ui/button";
import { LienWaiverEditor } from "@/components/financial/LienWaiverEditor";
import { LienWaiverDocument } from "@/lib/lienWaiver/LienWaiverDocument";
import { blankWaiverSpec, fmtLongDate } from "@/lib/lienWaiver/defaults";
import { downloadWaiverPdf } from "@/lib/lienWaiver/lienWaiverPdf";
import type { LienWaiverSpec } from "@/lib/lienWaiver/types";
import { FileDown, ChevronRight, LayoutDashboard, ShieldCheck } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

export default function LienWaiverGeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const { data: contract } = usePrimeContract(projectId ?? null);
  const { data: coSettings } = useCoSettings();
  const navigate = useNavigate();
  const { create } = useLienWaivers(projectId ?? null);
  const docRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave(thenSend: boolean) {
    if (!projectId) return;
    if (!spec.parties.claimant.name.trim()) return toast.error("Add the Claimant name.");
    if (thenSend && !spec.parties.claimant.email?.trim()) return toast.error("Add the Claimant email to send it.");
    setSaving(true);
    try {
      const row = await create.mutateAsync({ spec });
      toast.success(`Waiver saved${spec.doc.waiver_no ? ` (${spec.doc.waiver_no})` : ""}`);
      navigate(`/projects/${projectId}/financials/lien-releases/${row.id}${thenSend ? "?send=1" : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  }

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
          <Button variant="outline" disabled={busy} onClick={exportPdf}><FileDown className="h-4 w-4 mr-1.5" />{busy ? "…" : "PDF"}</Button>
          <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}>Save draft</Button>
          <Button disabled={saving} onClick={() => handleSave(true)}>{saving ? "Saving…" : "Save & send"}</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="print:hidden">
          <LienWaiverEditor spec={spec} onPatch={patch} />
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
