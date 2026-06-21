import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { useChangeOrdersByProject } from "@/hooks/useChangeOrders";
import { useProject } from "@/hooks/useProjects";
import { useCoWorkflow } from "@/hooks/useCoWorkflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChangeOrderDocument } from "@/lib/changeOrder/ChangeOrderDocument";
import { nodeToPdfBlob } from "@/lib/changeOrder/generatePdf";
import { recomputePricing } from "@/lib/changeOrder/pricing";
import {
  partiesFromContract, signatoriesFromContract, blankSpec, fmtLongDate, money,
} from "@/lib/changeOrder/defaults";
import type { CoSpec, CoPricingRow, CoMarkup } from "@/lib/changeOrder/types";
import { Plus, Trash2, FileText, ChevronRight, LayoutDashboard } from "lucide-react";

const todayLong = () => fmtLongDate(new Date().toISOString().slice(0, 10));

export default function ChangeOrderGeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId ?? null);
  const { data: contract } = usePrimeContract(projectId ?? null);
  const { data: existingCos = [] } = useChangeOrdersByProject(projectId ?? null);
  const { create } = useCoWorkflow(projectId ?? null);
  const docRef = useRef<HTMLDivElement>(null);

  const nextNo = useMemo(() => {
    const nums = existingCos.filter((c: any) => c.co_type === "PCO" && !c.commitment_id).map((c: any) => Number(c.co_no) || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }, [existingCos]);

  const [spec, setSpec] = useState<CoSpec>(() => {
    const parties = partiesFromContract(contract as any, (project as any)?.name);
    const sigs = signatoriesFromContract(contract as any);
    const s = blankSpec(parties, sigs);
    s.doc.date = todayLong();
    s.signatures.submitted.date = todayLong();
    return s;
  });

  // Re-seed parties once the contract loads (first time only).
  const seeded = useRef(false);
  if (!seeded.current && contract) {
    seeded.current = true;
    setSpec((prev) => ({
      ...prev,
      parties: { ...partiesFromContract(contract as any, (project as any)?.name), subject: prev.parties.subject, basis: prev.parties.basis },
      signatures: { ...signatoriesFromContract(contract as any), submitted: { ...signatoriesFromContract(contract as any).submitted, date: prev.signatures.submitted.date } },
    }));
  }

  const coNo = spec.doc.co_number || String(nextNo);
  const livePricing = useMemo(() => recomputePricing(spec.pricing), [spec.pricing]);
  const [saving, setSaving] = useState(false);

  function patch(updater: (s: CoSpec) => void) {
    setSpec((prev) => { const next = structuredClone(prev); updater(next); return next; });
  }

  async function handleSave(thenSign: boolean) {
    if (!projectId) return;
    const finalSpec = structuredClone(spec);
    if (!finalSpec.doc.co_number) finalSpec.doc.co_number = String(nextNo);
    if (!finalSpec.doc.co_label) finalSpec.doc.co_label = `PCO-${String(finalSpec.doc.co_number).padStart(3, "0")}`;
    finalSpec.pricing = recomputePricing(finalSpec.pricing);
    if (!finalSpec.doc.title.trim()) return toast.error("Add a title for the change order.");
    setSaving(true);
    try {
      // Preview PDF is best-effort — html2canvas can choke on themed CSS, and it
      // must never block creating the change order or its .docx (the real output).
      let previewPdf: Blob | null = null;
      try {
        if (docRef.current) previewPdf = await nodeToPdfBlob(docRef.current);
      } catch (pdfErr) {
        console.warn("CO preview PDF generation failed (continuing):", pdfErr);
      }
      const row = await create.mutateAsync({ projectId, primeContractId: (contract as any)?.id ?? null, spec: finalSpec, previewPdf });
      toast.success(`Change order ${finalSpec.doc.co_label} created`);
      navigate(`/projects/${projectId}/financials/cos/${row.id}${thenSign ? "?sign=1" : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-4">
      <FinancialSubNav projectId={projectId ?? ""} />
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/projects/${projectId}/financials/change-orders`} className="hover:text-foreground">Change Orders</Link>
        <ChevronRight className="h-3.5 w-3.5" /><span className="text-foreground font-medium">New (PCO-{String(coNo).padStart(3, "0")})</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Generate Change Order</h1>
          <p className="text-muted-foreground text-sm">Parties auto-fill from the prime contract · edit anything · live preview on the right.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}><FileText className="h-4 w-4 mr-1.5" />Save draft</Button>
          <Button disabled={saving} onClick={() => handleSave(true)}>{saving ? "Saving…" : "Save & sign"}</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Editor ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Header</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div><Label>CO number</Label><Input value={spec.doc.co_number} placeholder={String(nextNo)} onChange={(e) => patch((s) => { s.doc.co_number = e.target.value; s.doc.co_label = e.target.value ? `PCO-${String(e.target.value).padStart(3, "0")}` : ""; })} /></div>
              <div><Label>Date</Label><Input value={spec.doc.date} onChange={(e) => patch((s) => { s.doc.date = e.target.value; })} /></div>
              <div className="col-span-2"><Label>Title</Label><Input value={spec.doc.title} placeholder="e.g. Concrete Demolition and Disposal, Line 3" onChange={(e) => patch((s) => { s.doc.title = e.target.value; })} /></div>
              <div><Label>Subject (optional)</Label><Input value={spec.parties.subject ?? ""} onChange={(e) => patch((s) => { s.parties.subject = e.target.value; })} /></div>
              <div><Label>Basis (optional)</Label><Input value={spec.parties.basis ?? ""} placeholder="Lump Sum" onChange={(e) => patch((s) => { s.parties.basis = e.target.value; })} /></div>
            </CardContent>
          </Card>

          {/* Sections (pre-pricing) */}
          {spec.sections.map((sec, si) => (
            <Card key={si}>
              <CardHeader className="pb-2"><Input className="font-semibold" value={sec.heading} onChange={(e) => patch((s) => { s.sections[si].heading = e.target.value; })} /></CardHeader>
              <CardContent className="space-y-2">
                {sec.blocks.map((blk, bi) => (
                  <div key={bi}>
                    {"p" in blk && <Textarea rows={2} value={blk.p} placeholder="Paragraph…" onChange={(e) => patch((s) => { (s.sections[si].blocks[bi] as any).p = e.target.value; })} />}
                    {"bullets" in blk && (
                      <div className="space-y-1">
                        {blk.bullets.map((bl, li) => (
                          <div key={li} className="flex gap-1.5">
                            <Input value={bl} placeholder="Bullet…" onChange={(e) => patch((s) => { (s.sections[si].blocks[bi] as any).bullets[li] = e.target.value; })} />
                            <Button variant="ghost" size="icon" onClick={() => patch((s) => { (s.sections[si].blocks[bi] as any).bullets.splice(li, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => patch((s) => { (s.sections[si].blocks[bi] as any).bullets.push(""); })}><Plus className="h-3.5 w-3.5 mr-1" />Bullet</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input value={spec.pricing.groups[0].label} placeholder="A. Group label" onChange={(e) => patch((s) => { s.pricing.groups[0].label = e.target.value; })} />
              <div className="space-y-2">
                {spec.pricing.groups[0].rows.map((r, ri) => (
                  <div key={ri} className="grid grid-cols-[1fr_56px_44px_72px_64px_auto] gap-1.5 items-center">
                    <Input className="h-8 text-xs" placeholder="Description" value={r.desc} onChange={(e) => patch((s) => { s.pricing.groups[0].rows[ri].desc = e.target.value; })} />
                    <Input className="h-8 text-xs" placeholder="Unit" value={r.unit} onChange={(e) => patch((s) => { s.pricing.groups[0].rows[ri].unit = e.target.value; })} />
                    <Input className="h-8 text-xs" placeholder="Qty" value={r.qty} onChange={(e) => patch((s) => { s.pricing.groups[0].rows[ri].qty = e.target.value; })} />
                    <Input className="h-8 text-xs" placeholder="Unit $" value={r.unit_cost} onChange={(e) => patch((s) => { s.pricing.groups[0].rows[ri].unit_cost = e.target.value; })} />
                    <Input className="h-8 text-xs" placeholder="Basis" value={r.basis} onChange={(e) => patch((s) => { s.pricing.groups[0].rows[ri].basis = e.target.value; })} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => patch((s) => { s.pricing.groups[0].rows.splice(ri, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => patch((s) => { s.pricing.groups[0].rows.push({ n: String(s.pricing.groups[0].rows.length + 1), desc: "", unit: "LS", qty: "1", unit_cost: "", extended: "", basis: "Firm" } as CoPricingRow); })}><Plus className="h-3.5 w-3.5 mr-1" />Line item</Button>
              </div>

              <div className="border-t pt-2 space-y-2">
                <Label className="text-xs text-muted-foreground">Markups (amount or e.g. "10%")</Label>
                {spec.pricing.markups.map((m, mi) => (
                  <div key={mi} className="grid grid-cols-[1fr_90px_auto] gap-1.5 items-center">
                    <Input className="h-8 text-xs" placeholder="APAS 10% Overhead" value={m.label} onChange={(e) => patch((s) => { s.pricing.markups[mi].label = e.target.value; })} />
                    <Input className="h-8 text-xs" placeholder="10% or $1,100" value={m.amount} onChange={(e) => patch((s) => { s.pricing.markups[mi].amount = e.target.value; })} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => patch((s) => { s.pricing.markups.splice(mi, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => patch((s) => { s.pricing.markups.push({ label: "", amount: "", basis: "" } as CoMarkup); })}><Plus className="h-3.5 w-3.5 mr-1" />Markup</Button>
              </div>

              <Input value={spec.pricing.grand_total.label} placeholder="GRAND TOTAL label" onChange={(e) => patch((s) => { s.pricing.grand_total.label = e.target.value; })} />
              <div className="flex justify-between items-center bg-[var(--apas-sapphire)]/5 rounded px-3 py-2">
                <span className="text-sm font-medium">{livePricing.grand_total.label}</span>
                <span className="text-lg font-bold text-[var(--apas-sapphire)]">{livePricing.grand_total.amount}</span>
              </div>
            </CardContent>
          </Card>

          {/* After-pricing sections */}
          {spec.sections_after_pricing.map((sec, si) => (
            <Card key={si}>
              <CardHeader className="pb-2"><Input className="font-semibold" value={sec.heading} onChange={(e) => patch((s) => { s.sections_after_pricing[si].heading = e.target.value; })} /></CardHeader>
              <CardContent className="space-y-2">
                {sec.blocks.map((blk, bi) => (
                  <div key={bi}>
                    {"p" in blk && <Textarea rows={2} value={blk.p} onChange={(e) => patch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).p = e.target.value; })} />}
                    {"bullets" in blk && (
                      <div className="space-y-1">
                        {blk.bullets.map((bl, li) => (
                          <div key={li} className="flex gap-1.5">
                            <Input value={bl} onChange={(e) => patch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).bullets[li] = e.target.value; })} />
                            <Button variant="ghost" size="icon" onClick={() => patch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).bullets.splice(li, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => patch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).bullets.push(""); })}><Plus className="h-3.5 w-3.5 mr-1" />Bullet</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Live preview ───────────────────────────────────── */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="text-xs text-muted-foreground mb-2">Live preview · {money(Number(livePricing.grand_total.amount.replace(/[^0-9.-]/g, "")))}</div>
          <div className="border rounded-lg overflow-auto max-h-[calc(100vh-140px)] bg-muted/30 p-3">
            <div style={{ transform: "scale(0.92)", transformOrigin: "top left" }}>
              <ChangeOrderDocument ref={docRef} spec={{ ...spec, doc: { ...spec.doc, co_number: coNo, co_label: spec.doc.co_label || `PCO-${String(coNo).padStart(3, "0")}` } }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
