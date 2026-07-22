/**
 * CoSpecEditor — the shared structured editor for a change-order spec
 * (header · narrative sections · pricing · after-pricing sections).
 *
 * Controlled: takes the current `spec` and an `onPatch(updater)` that mutates a
 * draft copy. Used by the generator (new CO) and the detail page (edit a saved
 * draft) so both stay in lockstep.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { recomputePricing } from "@/lib/changeOrder/pricing";
import type { CoSpec, CoPricingRow, CoMarkup } from "@/lib/changeOrder/types";

export function CoSpecEditor({
  spec,
  onPatch,
  coNumberPlaceholder = "",
}: {
  spec: CoSpec;
  onPatch: (updater: (s: CoSpec) => void) => void;
  coNumberPlaceholder?: string;
}) {
  const livePricing = useMemo(() => recomputePricing(spec.pricing), [spec.pricing]);

  // Overhead / Profit are stored as "<n>%" markups; recomputePricing turns them
  // into dollars off the change subtotal. These read/write just the percentage.
  const pctOf = (m: CoMarkup | undefined) => (m?.amount ?? "").toString().replace("%", "").trim();
  function setMarkupPct(idx: number, label: string, value: string) {
    onPatch((s) => {
      while (s.pricing.markups.length <= idx) s.pricing.markups.push({ label: "", amount: "0%", basis: "" } as CoMarkup);
      s.pricing.markups[idx].label = s.pricing.markups[idx].label || label;
      s.pricing.markups[idx].amount = value === "" ? "0%" : `${value}%`;
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div><Label>CO number</Label><Input value={spec.doc.co_number} placeholder={coNumberPlaceholder} onChange={(e) => onPatch((s) => { s.doc.co_number = e.target.value; s.doc.co_label = e.target.value ? `PCO-${String(e.target.value).padStart(3, "0")}` : ""; })} /></div>
          <div><Label>Date</Label><Input value={spec.doc.date} onChange={(e) => onPatch((s) => { s.doc.date = e.target.value; })} /></div>
          <div className="col-span-2"><Label>Title</Label><Input value={spec.doc.title} placeholder="e.g. Concrete Demolition and Disposal, Line 3" onChange={(e) => onPatch((s) => { s.doc.title = e.target.value; })} /></div>
          <div><Label>Subject (optional)</Label><Input value={spec.parties.subject ?? ""} onChange={(e) => onPatch((s) => { s.parties.subject = e.target.value; })} /></div>
          <div><Label>Basis (optional)</Label><Input value={spec.parties.basis ?? ""} placeholder="Lump Sum" onChange={(e) => onPatch((s) => { s.parties.basis = e.target.value; })} /></div>
        </CardContent>
      </Card>

      {/* Sections (pre-pricing) */}
      {spec.sections.map((sec, si) => (
        <Card key={si}>
          <CardHeader className="pb-2"><Input className="font-semibold" value={sec.heading} onChange={(e) => onPatch((s) => { s.sections[si].heading = e.target.value; })} /></CardHeader>
          <CardContent className="space-y-2">
            {sec.blocks.map((blk, bi) => (
              <div key={bi}>
                {"p" in blk && <Textarea rows={2} value={blk.p} placeholder="Paragraph…" onChange={(e) => onPatch((s) => { (s.sections[si].blocks[bi] as any).p = e.target.value; })} />}
                {"bullets" in blk && (
                  <div className="space-y-1">
                    {blk.bullets.map((bl, li) => (
                      <div key={li} className="flex gap-1.5">
                        <Input value={bl} placeholder="Bullet…" onChange={(e) => onPatch((s) => { (s.sections[si].blocks[bi] as any).bullets[li] = e.target.value; })} />
                        <Button variant="ghost" size="icon" onClick={() => onPatch((s) => { (s.sections[si].blocks[bi] as any).bullets.splice(li, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => onPatch((s) => { (s.sections[si].blocks[bi] as any).bullets.push(""); })}><Plus className="h-3.5 w-3.5 mr-1" />Bullet</Button>
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
          <Input value={spec.pricing.groups[0].label} placeholder="A. Group label" onChange={(e) => onPatch((s) => { s.pricing.groups[0].label = e.target.value; })} />
          <div className="space-y-2">
            {spec.pricing.groups[0].rows.map((r, ri) => {
              // A row tied to a base SOV line (guided "+ Change order" flow) inherits
              // that line's unit + unit price — lock them so the CO can't drift from
              // the contract price. Only the (signed) delta quantity is editable.
              const tied = Boolean(r.source_sov_line_item_id);
              return (
              <div key={ri} className="grid grid-cols-[1fr_56px_44px_72px_64px_auto] gap-1.5 items-center">
                <Input className="h-8 text-xs" placeholder="Description" value={r.desc} onChange={(e) => onPatch((s) => { s.pricing.groups[0].rows[ri].desc = e.target.value; })} />
                <Input className="h-8 text-xs" placeholder="Unit" value={r.unit} disabled={tied} title={tied ? "Inherited from the base line" : undefined} onChange={(e) => onPatch((s) => { s.pricing.groups[0].rows[ri].unit = e.target.value; })} />
                <Input className="h-8 text-xs" placeholder="Qty" value={r.qty} onChange={(e) => onPatch((s) => { s.pricing.groups[0].rows[ri].qty = e.target.value; })} />
                <Input className="h-8 text-xs" placeholder="Unit $" value={r.unit_cost} disabled={tied} title={tied ? "Locked to the base line's unit price" : undefined} onChange={(e) => onPatch((s) => { s.pricing.groups[0].rows[ri].unit_cost = e.target.value; })} />
                <Input className="h-8 text-xs" placeholder="Basis" value={r.basis} onChange={(e) => onPatch((s) => { s.pricing.groups[0].rows[ri].basis = e.target.value; })} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPatch((s) => { s.pricing.groups[0].rows.splice(ri, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => onPatch((s) => { s.pricing.groups[0].rows.push({ n: String(s.pricing.groups[0].rows.length + 1), desc: "", unit: "LS", qty: "1", unit_cost: "", extended: "", basis: "Firm" } as CoPricingRow); })}><Plus className="h-3.5 w-3.5 mr-1" />Line item</Button>
          </div>

          {/* Overhead & Profit — enter the percentages, the proposal calculates the rest. */}
          <div className="border-t pt-3 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Markup — enter %, we calculate the dollars</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Overhead %</Label>
                <Input className="h-8" type="number" step="any" min="0" placeholder="10"
                  value={pctOf(spec.pricing.markups[0])}
                  onChange={(e) => setMarkupPct(0, "APAS Overhead", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Profit %</Label>
                <Input className="h-8" type="number" step="any" min="0" placeholder="5"
                  value={pctOf(spec.pricing.markups[1])}
                  onChange={(e) => setMarkupPct(1, "APAS Profit", e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Set Profit to 0 to waive it (shows as $0.00 in the proposal).</p>
          </div>

          {/* Live calculated breakdown */}
          <div className="border-t pt-3 space-y-1.5 text-sm">
            <Input value={spec.pricing.grand_total.label} placeholder="GRAND TOTAL label" className="mb-2" onChange={(e) => onPatch((s) => { s.pricing.grand_total.label = e.target.value; })} />
            <div className="flex justify-between text-muted-foreground"><span>Change subtotal (cost of work)</span><span className="font-mono">{livePricing.groups[0]?.subtotal?.amount ?? "$0.00"}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{livePricing.markups[0]?.label || "Overhead"}</span><span className="font-mono">{livePricing.markups[0]?.amount ?? "$0.00"}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>{livePricing.markups[1]?.label || "Profit"}</span><span className="font-mono">{livePricing.markups[1]?.amount ?? "$0.00"}</span></div>
            <div className="flex justify-between items-center bg-[var(--apas-sapphire)]/5 rounded px-3 py-2 mt-1">
              <span className="font-medium">{livePricing.grand_total.label}</span>
              <span className="text-lg font-bold text-[var(--apas-sapphire)]">{livePricing.grand_total.amount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* After-pricing sections */}
      {spec.sections_after_pricing.map((sec, si) => (
        <Card key={si}>
          <CardHeader className="pb-2"><Input className="font-semibold" value={sec.heading} onChange={(e) => onPatch((s) => { s.sections_after_pricing[si].heading = e.target.value; })} /></CardHeader>
          <CardContent className="space-y-2">
            {sec.blocks.map((blk, bi) => (
              <div key={bi}>
                {"p" in blk && <Textarea rows={2} value={blk.p} onChange={(e) => onPatch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).p = e.target.value; })} />}
                {"bullets" in blk && (
                  <div className="space-y-1">
                    {blk.bullets.map((bl, li) => (
                      <div key={li} className="flex gap-1.5">
                        <Input value={bl} onChange={(e) => onPatch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).bullets[li] = e.target.value; })} />
                        <Button variant="ghost" size="icon" onClick={() => onPatch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).bullets.splice(li, 1); })}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => onPatch((s) => { (s.sections_after_pricing[si].blocks[bi] as any).bullets.push(""); })}><Plus className="h-3.5 w-3.5 mr-1" />Bullet</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
