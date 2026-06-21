import { Fragment, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useSovProgress, type SovProgressRow } from "@/hooks/useSovProgress";
import { useChangeOrderLineItems } from "@/hooks/useChangeOrderLineItems";
import { downloadQuantitiesPdf } from "@/lib/financial/quantitiesPdf";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useProject } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { QuantitiesEmailDialog } from "@/components/financial/QuantitiesEmailDialog";
import { Download, Mail, ChevronDown, ChevronRight, Ruler } from "lucide-react";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);
const qfmt = (n: number) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
};
const pfmt = (n: number) => `${Number(n || 0).toFixed(1)}%`;

function Bar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="h-1.5 w-full min-w-[60px] rounded-full bg-muted overflow-hidden print:border print:border-muted-foreground/40">
      <div className="h-full bg-[var(--apas-sapphire)]" style={{ width: `${v}%` }} />
    </div>
  );
}

function roll(list: SovProgressRow[]) {
  const sv = list.reduce((s, r) => s + r.scheduled_value, 0);
  const vd = list.reduce((s, r) => s + r.value_to_date, 0);
  return { sv, vd, rem: sv - vd, pct: sv ? (vd / sv) * 100 : 0, ret: list.reduce((s, r) => s + r.retainage, 0) };
}

export default function QuantitiesProgressPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const { data: rows = [], isLoading } = useSovProgress(projectId ?? null);
  const { data: coLines = {} } = useChangeOrderLineItems(projectId ?? null);

  const [showMoney, setShowMoney] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [coOpen, setCoOpen] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (coId: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(coId) ? n.delete(coId) : n.add(coId); return n; });
  const coLineColSpan = showMoney ? 10 : 7;
  const qc = useQueryClient();
  async function saveUnit(id: string, value: string) {
    const unit = value.trim() || null;
    await supabase.from("sov_line_items" as any).update({ unit }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sov-progress", projectId] });
  }
  const exportLines = () => (selected.size > 0 ? rows.filter((r) => selected.has(r.sov_line_item_id)) : rows);

  const base = useMemo(() => rows.filter((r) => r.kind === "base"), [rows]);
  const cos = useMemo(() => rows.filter((r) => r.kind === "change_order"), [rows]);
  const baseRoll = roll(base), coRoll = roll(cos), allRoll = roll(rows);
  const latestPayApp = rows.find((r) => r.latest_pay_app_no != null)?.latest_pay_app_no ?? null;

  const toggleRow = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const hasSelection = selected.size > 0;
  // In print: if nothing is ticked, print everything; else only ticked rows.
  const rowPrintHidden = (id: string) => hasSelection && !selected.has(id);

  const colCount = showMoney ? 11 : 6;

  function Th() {
    return (
      <thead>
        <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
          <th className="p-2 text-left print:hidden w-8" />
          <th className="p-2 text-left">#</th>
          <th className="p-2 text-left">Description</th>
          <th className="p-2 text-center">Unit</th>
          <th className="p-2 text-right">Sched Qty</th>
          <th className="p-2 text-right">Built to Date</th>
          <th className="p-2 text-right">Remaining</th>
          <th className="p-2 text-left w-[130px]">% Complete</th>
          {showMoney && <th className="p-2 text-right">Sched Value</th>}
          {showMoney && <th className="p-2 text-right">Earned</th>}
          {showMoney && <th className="p-2 text-right">To Complete</th>}
        </tr>
      </thead>
    );
  }

  function Row({ r, expandable, expanded, onToggle }: { r: SovProgressRow; expandable?: boolean; expanded?: boolean; onToggle?: () => void }) {
    return (
      <tr className={`border-b last:border-0 hover:bg-muted/20 ${rowPrintHidden(r.sov_line_item_id) ? "print:hidden" : ""}`}>
        <td className="p-2 print:hidden">
          <Checkbox checked={selected.has(r.sov_line_item_id)} onCheckedChange={() => toggleRow(r.sov_line_item_id)} />
        </td>
        <td className="p-2 font-mono text-xs text-muted-foreground">{r.item_no}</td>
        <td className="p-2">
          {expandable ? (
            <button onClick={onToggle} className="inline-flex items-center gap-1 text-left hover:text-[var(--apas-sapphire)] print:cursor-default">
              {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 print:hidden" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 print:hidden" />}
              {r.description}
            </button>
          ) : r.description}
        </td>
        <td className="p-2 text-center">
          <span className="hidden print:inline">{r.unit ?? "—"}</span>
          <input
            key={`u-${r.sov_line_item_id}-${r.unit ?? ""}`}
            defaultValue={r.unit ?? ""}
            placeholder="—"
            aria-label="Unit of measure"
            title="Click to edit the unit of measure"
            onBlur={(e) => { if ((e.target.value.trim() || null) !== (r.unit ?? null)) saveUnit(r.sov_line_item_id, e.target.value); }}
            className="print:hidden w-12 text-center text-xs text-muted-foreground bg-transparent rounded border border-dashed border-transparent hover:border-muted-foreground/40 focus:border-[var(--apas-sapphire)] focus:text-foreground outline-none"
          />
        </td>
        <td className="p-2 text-right font-mono">{qfmt(r.scheduled_qty)}</td>
        <td className="p-2 text-right font-mono">{qfmt(r.qty_to_date)}</td>
        <td className={`p-2 text-right font-mono ${r.qty_remaining > 0 ? "text-[var(--apas-amber)] font-medium" : "text-muted-foreground"}`}>
          {qfmt(r.qty_remaining)}
        </td>
        <td className="p-2">
          <div className="flex items-center gap-2">
            <Bar value={r.pct_complete} />
            <span className="text-xs tabular-nums w-11 text-right">{pfmt(r.pct_complete)}</span>
          </div>
        </td>
        {showMoney && <td className="p-2 text-right font-mono text-muted-foreground">{money(r.scheduled_value)}</td>}
        {showMoney && <td className="p-2 text-right font-mono text-emerald-600">{money(r.value_to_date)}</td>}
        {showMoney && <td className="p-2 text-right font-mono">{money(r.value_remaining)}</td>}
      </tr>
    );
  }

  function SectionFoot({ r }: { r: ReturnType<typeof roll> }) {
    return (
      <tfoot>
        <tr className="bg-muted/60 font-semibold text-sm border-t">
          <td className="print:hidden" />
          <td className="p-2" colSpan={6}>Subtotal</td>
          <td className="p-2 text-left">{pfmt(r.pct)}</td>
          {showMoney && <td className="p-2 text-right font-mono">{money(r.sv)}</td>}
          {showMoney && <td className="p-2 text-right font-mono text-emerald-600">{money(r.vd)}</td>}
          {showMoney && <td className="p-2 text-right font-mono">{money(r.rem)}</td>}
        </tr>
      </tfoot>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-5 print:p-0 print:max-w-none">
      <div className="print:hidden">
        <FinancialSubNav />
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-3">
        <h1 className="text-xl font-bold">{project?.name ?? "Project"} — Quantities & Progress</h1>
        <p className="text-sm text-muted-foreground">
          Through Pay App #{latestPayApp ?? "—"} · {showMoney ? "with dollar values" : "quantities only"}
        </p>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap print:hidden">
        <div className="flex items-start gap-2">
          <Ruler className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Quantities &amp; Progress</h1>
            <p className="text-muted-foreground text-sm">
              Originally scheduled vs. built to date{latestPayApp != null ? ` (through Pay App #${latestPayApp})` : ""}.
              Tick lines and Print to send a list to your subs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="money" checked={showMoney} onCheckedChange={setShowMoney} />
            <Label htmlFor="money" className="text-sm cursor-pointer">Show dollars</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)} disabled={rows.length === 0}>
            <Mail className="h-4 w-4 mr-1.5" />
            Email{hasSelection ? ` (${selected.size})` : ""}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => downloadQuantitiesPdf({ lines: exportLines(), showMoney, projectName: project?.name ?? "Project", payAppNo: latestPayApp })}
          >
            <Download className="h-4 w-4 mr-1.5" />
            PDF{hasSelection ? ` (${selected.size})` : ""}
          </Button>
        </div>
      </div>

      <QuantitiesEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        rows={rows}
        selectedIds={selected}
        showMoney={showMoney}
        projectName={project?.name ?? "Project"}
        payAppNo={latestPayApp}
      />

      {/* Roll-up cards */}
      <div className="grid grid-cols-3 gap-3 print:hidden">
        {[
          { label: "Base Contract", r: baseRoll },
          { label: "Change Orders", r: coRoll },
          { label: "Overall", r: allRoll, accent: true },
        ].map((c) => (
          <Card key={c.label} className={c.accent ? "border-[var(--apas-sapphire)]/40" : ""}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{c.label}</p>
              <p className={`text-2xl font-bold ${c.accent ? "text-[var(--apas-sapphire)]" : ""}`}>{pfmt(c.r.pct)}</p>
              <div className="mt-2"><Bar value={c.r.pct} /></div>
              {showMoney && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {money(c.r.vd)} earned · {money(c.r.rem)} to complete
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground p-4">Loading…</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No schedule-of-values quantities on this project yet.</CardContent></Card>
      ) : (
        <>
          {/* Base contract */}
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-2.5 border-b font-semibold text-sm flex items-center justify-between">
                <span>Base Contract</span>
                <span className="text-muted-foreground font-normal">{pfmt(baseRoll.pct)} complete</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <Th />
                  <tbody>{base.map((r) => <Row key={r.sov_line_item_id} r={r} />)}</tbody>
                  <SectionFoot r={baseRoll} />
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Change orders — collapsible */}
          {cos.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <button
                  onClick={() => setCoOpen((o) => !o)}
                  className="w-full px-4 py-2.5 border-b font-semibold text-sm flex items-center justify-between hover:bg-muted/20 print:cursor-default"
                >
                  <span className="flex items-center gap-1.5">
                    {coOpen ? <ChevronDown className="h-4 w-4 print:hidden" /> : <ChevronRight className="h-4 w-4 print:hidden" />}
                    Change Orders ({cos.length})
                  </span>
                  <span className="text-muted-foreground font-normal">{pfmt(coRoll.pct)} earned</span>
                </button>
                {(coOpen) && (
                  <div className="overflow-x-auto print:!block">
                    <table className="w-full text-sm">
                      <Th />
                      <tbody>
                        {cos.map((r) => {
                          const coId = r.change_order_id;
                          const lines = coId ? coLines[coId] : undefined;
                          const isOpen = coId ? expanded.has(coId) : false;
                          return (
                            <Fragment key={r.sov_line_item_id}>
                              <Row r={r} expandable={!!lines?.length} expanded={isOpen} onToggle={() => coId && toggleExpand(coId)} />
                              {isOpen && lines?.length ? (
                                <tr className="bg-muted/20">
                                  <td className="print:hidden" />
                                  <td colSpan={coLineColSpan} className="p-0">
                                    <div className="px-6 py-2">
                                      <p className="text-xs text-muted-foreground mb-1">{lines.length} priced line{lines.length === 1 ? "" : "s"} on this change order:</p>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground border-b">
                                            <th className="text-left p-1 font-normal">Item</th>
                                            <th className="text-center p-1 font-normal">Unit</th>
                                            <th className="text-right p-1 font-normal">Qty</th>
                                            <th className="text-right p-1 font-normal">Unit Price</th>
                                            <th className="text-right p-1 font-normal">Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {lines.map((l) => (
                                            <tr key={l.id} className="border-b last:border-0">
                                              <td className="p-1">{l.description}{l.basis ? <span className="text-muted-foreground"> · {l.basis}</span> : null}</td>
                                              <td className="p-1 text-center text-muted-foreground">{l.unit ?? "—"}</td>
                                              <td className="p-1 text-right font-mono">{qfmt(l.qty)}</td>
                                              <td className="p-1 text-right font-mono text-muted-foreground">{money(l.unit_price)}</td>
                                              <td className="p-1 text-right font-mono">{money(l.extended_value)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                      <SectionFoot r={coRoll} />
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
