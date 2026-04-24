/**
 * D1 · PayAppBuilder — per-SOV-line work this period + materials stored.
 * Locked once pay-app.status is 'approved' or 'paid' (trigger-enforced).
 */
import { useMemo } from "react";
import { usePrimeContractSov, type PrimeContractSovLine } from "@/hooks/usePrimeContract";
import { usePayApp, type PayAppLine } from "@/hooks/usePayApp";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

export interface PayAppBuilderProps {
  payAppId: string;
  primeContractId: string;
  readOnly?: boolean;
}

export function PayAppBuilder({ payAppId, primeContractId, readOnly = false }: PayAppBuilderProps) {
  const { data: sov = [] } = usePrimeContractSov(primeContractId);
  const { lines, detail, upsertLine } = usePayApp(payAppId);
  const locked = readOnly
    || detail.data?.status === "approved"
    || detail.data?.status === "paid";

  const lineByS = useMemo(() => {
    const m = new Map<string, PayAppLine>();
    for (const l of lines.data ?? []) m.set(l.sov_line_id, l);
    return m;
  }, [lines.data]);

  const totals = useMemo(() => {
    let scheduled = 0, thisPeriod = 0, materials = 0;
    for (const s of sov) {
      scheduled += Number(s.scheduled_value ?? 0);
      const l = lineByS.get(s.id);
      if (l) {
        thisPeriod += Number(l.work_this_period ?? 0);
        materials += Number(l.materials_stored ?? 0);
      }
    }
    return { scheduled, thisPeriod, materials, completed: thisPeriod + materials };
  }, [sov, lineByS]);

  async function handleChange(
    s: PrimeContractSovLine,
    patch: Partial<Pick<PayAppLine, "work_this_period" | "materials_stored">>,
  ) {
    const current = lineByS.get(s.id);
    try {
      const work = patch.work_this_period
        ?? current?.work_this_period ?? 0;
      const mats = patch.materials_stored
        ?? current?.materials_stored ?? 0;
      const sv = Number(s.scheduled_value ?? 0);
      const pct = sv > 0 ? Number(((Number(work) + Number(mats)) / sv) * 100) : null;
      await upsertLine.mutateAsync({
        sov_line_id: s.id,
        work_this_period: Number(work),
        materials_stored: Number(mats),
        pct_complete: pct,
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className="font-mono">Scheduled {money(totals.scheduled)}</Badge>
        <Badge variant="outline" className="font-mono">This period {money(totals.thisPeriod)}</Badge>
        <Badge variant="outline" className="font-mono">Materials {money(totals.materials)}</Badge>
        <Badge className="font-mono">Completed {money(totals.completed)}</Badge>
        {locked && <Badge variant="secondary">Locked · {detail.data?.status}</Badge>}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-14 p-2 text-left font-medium">#</th>
              <th className="p-2 text-left font-medium">Description</th>
              <th className="w-32 p-2 text-right font-medium">Scheduled</th>
              <th className="w-32 p-2 text-right font-medium">This period</th>
              <th className="w-32 p-2 text-right font-medium">Materials</th>
              <th className="w-20 p-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {sov.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">
                No SOV lines on the contract.
              </td></tr>
            )}
            {sov.map((s) => {
              const l = lineByS.get(s.id);
              const sv = Number(s.scheduled_value ?? 0);
              const thisP = Number(l?.work_this_period ?? 0);
              const mats = Number(l?.materials_stored ?? 0);
              const pct = sv > 0 ? ((thisP + mats) / sv) * 100 : 0;
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2 font-mono text-xs text-muted-foreground">L{s.line_no}</td>
                  <td className="p-2">{s.description}</td>
                  <td className="p-2 text-right font-mono">{money(sv)}</td>
                  <td className="p-1">
                    <Input
                      type="number" inputMode="decimal" step="0.01" min="0"
                      value={thisP}
                      onChange={(e) => handleChange(s, { work_this_period: Number(e.target.value) || 0 })}
                      className="text-right font-mono" disabled={locked}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      type="number" inputMode="decimal" step="0.01" min="0"
                      value={mats}
                      onChange={(e) => handleChange(s, { materials_stored: Number(e.target.value) || 0 })}
                      className="text-right font-mono" disabled={locked}
                    />
                  </td>
                  <td className="p-2 text-right font-mono">{pct.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
