import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WAIVER_TYPES } from "@/lib/lienWaiver/defaults";
import { isUnconditional } from "@/lib/lienWaiver/types";
import type { LienWaiverSpec } from "@/lib/lienWaiver/types";

/**
 * Shared structured editor for a lien-waiver spec. Controlled: takes `spec` and
 * an `onPatch(updater)` that mutates a draft copy. Used by the generator (new
 * waiver) and the detail page (edit a saved, not-yet-signed waiver).
 */
export function LienWaiverEditor({ spec, onPatch }: { spec: LienWaiverSpec; onPatch: (updater: (s: LienWaiverSpec) => void) => void }) {
  const conditional = !isUnconditional(spec.type);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Waiver type</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {WAIVER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => onPatch((s) => { s.type = t.value; })}
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
          <div><Label>Waiver No.</Label><Input value={spec.doc.waiver_no} onChange={(e) => onPatch((s) => { s.doc.waiver_no = e.target.value; })} /></div>
          <div><Label>Pay App No.</Label><Input value={spec.doc.pay_app_no ?? ""} onChange={(e) => onPatch((s) => { s.doc.pay_app_no = e.target.value; })} /></div>
          <div><Label>Date</Label><Input value={spec.doc.date} onChange={(e) => onPatch((s) => { s.doc.date = e.target.value; })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Claimant (the party signing / waiving)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Claimant name</Label><Input placeholder="e.g. D'Shin Plumbing LLC" value={spec.parties.claimant.name} onChange={(e) => onPatch((s) => { s.parties.claimant.name = e.target.value; })} /></div>
          <div className="col-span-2"><Label>Address</Label><Input value={spec.parties.claimant.address ?? ""} onChange={(e) => onPatch((s) => { s.parties.claimant.address = e.target.value; })} /></div>
          <div><Label>Signed by (name)</Label><Input value={spec.signature.name ?? ""} onChange={(e) => onPatch((s) => { s.signature.name = e.target.value; })} /></div>
          <div><Label>Title</Label><Input value={spec.signature.title ?? ""} onChange={(e) => onPatch((s) => { s.signature.title = e.target.value; })} /></div>
          <div className="col-span-2"><Label>Claimant email (for sending)</Label><Input value={spec.parties.claimant.email ?? ""} onChange={(e) => onPatch((s) => { s.parties.claimant.email = e.target.value; })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Project &amp; parties</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div><Label>Customer (who claimant billed)</Label><Input value={spec.parties.customer} onChange={(e) => onPatch((s) => { s.parties.customer = e.target.value; })} /></div>
          <div><Label>Property Owner</Label><Input value={spec.parties.owner} onChange={(e) => onPatch((s) => { s.parties.owner = e.target.value; })} /></div>
          <div className="col-span-2"><Label>Work (scope)</Label><Input placeholder="e.g. Sanitary sewer plumbing" value={spec.parties.scope ?? ""} onChange={(e) => onPatch((s) => { s.parties.scope = e.target.value; })} /></div>
          <div><Label>Project</Label><Input value={spec.parties.project} onChange={(e) => onPatch((s) => { s.parties.project = e.target.value; })} /></div>
          <div><Label>Property</Label><Input value={spec.parties.property} onChange={(e) => onPatch((s) => { s.parties.property = e.target.value; })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Payment</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div><Label>{conditional ? "Amount of payment" : "Amount received"} ($)</Label><Input value={spec.payment.amount} onChange={(e) => onPatch((s) => { s.payment.amount = e.target.value; })} /></div>
          <div><Label>Through / Effective date</Label><Input value={spec.payment.through_date} onChange={(e) => onPatch((s) => { s.payment.through_date = e.target.value; })} /></div>
          {conditional && <div><Label>Method of payment</Label><Input placeholder="Wire Transfer / Check #" value={spec.payment.method ?? ""} onChange={(e) => onPatch((s) => { s.payment.method = e.target.value; })} /></div>}
          {conditional && <div><Label>Maker of payment</Label><Input value={spec.payment.maker ?? ""} onChange={(e) => onPatch((s) => { s.payment.maker = e.target.value; })} /></div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Exceptions (reserved rights)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div><Label>Disputed claims ($)</Label><Input value={spec.exceptions.disputed_amount ?? ""} onChange={(e) => onPatch((s) => { s.exceptions.disputed_amount = e.target.value; })} /></div>
          <div className="col-span-2"><Label>Other exceptions</Label><Textarea rows={2} value={spec.exceptions.other ?? ""} onChange={(e) => onPatch((s) => { s.exceptions.other = e.target.value; })} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
