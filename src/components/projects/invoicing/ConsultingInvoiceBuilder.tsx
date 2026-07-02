import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useProjectScopes } from '@/hooks/useProjectScopes';
import { useConsultingInvoices, type NewInvoiceLine } from '@/hooks/useConsultingInvoices';
import { lineAmount } from '@/lib/consulting/billing';
import { money } from './invoiceMeta';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface Row extends NewInvoiceLine {
  included: boolean;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const recalc = lineAmount;

export function ConsultingInvoiceBuilder({ open, onOpenChange, projectId }: Props) {
  const { data: scopes } = useProjectScopes(projectId);
  const { create } = useConsultingInvoices(projectId);

  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    setIssueDate(todayIso());
    setDueDate('');
    setNotes('');
    setRows((scopes ?? []).map((s) => {
      const prev = Number(s.pct_billed) || 0;
      const thisPct = Math.max(prev, Number(s.pct_complete) || 0);
      return {
        included: thisPct > prev,
        scope_id: s.id,
        description: s.title,
        fee_amount: Number(s.fee_amount) || 0,
        pct_prev: prev,
        pct_this: thisPct,
        amount: recalc(Number(s.fee_amount) || 0, prev, thisPct),
      };
    }));
  }, [open, scopes]);

  const setPct = (i: number, val: number) => setRows((prev) => prev.map((r, idx) =>
    idx === i ? { ...r, pct_this: val, amount: recalc(r.fee_amount, r.pct_prev, val) } : r));

  const included = rows.filter((r) => r.included);
  const total = useMemo(() => included.reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows]);
  const canCreate = included.length > 0 && total !== 0;

  const handleCreate = async () => {
    try {
      await create.mutateAsync({
        issue_date: issueDate,
        due_date: dueDate || null,
        notes: notes.trim() || null,
        lines: included.map(({ included: _omit, ...l }) => l),
      });
      onOpenChange(false);
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Bill the progress made since the last invoice. Amounts are fee × (this % − previously billed %).</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Issue date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden mt-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/40">
                <th className="px-2 py-2 w-8"></th>
                <th className="font-medium px-2 py-2">Scope</th>
                <th className="font-medium px-2 py-2 text-right">Fee</th>
                <th className="font-medium px-2 py-2 text-right">Prev</th>
                <th className="font-medium px-2 py-2 text-right w-[92px]">This %</th>
                <th className="font-medium px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No scopes to bill. Add scopes first.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.scope_id ?? i} className="border-b last:border-0">
                  <td className="px-2 py-2"><Checkbox checked={r.included} onCheckedChange={(v) => setRows((prev) => prev.map((x, idx) => idx === i ? { ...x, included: !!v } : x))} /></td>
                  <td className="px-2 py-2">{r.description}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{money(r.fee_amount)}</td>
                  <td className="px-2 py-2 text-right text-muted-foreground">{Math.round(r.pct_prev)}%</td>
                  <td className="px-2 py-2 text-right">
                    <Input type="number" min={r.pct_prev} max={100} value={r.pct_this} onChange={(e) => setPct(i, Number(e.target.value))} className="h-8 text-right" />
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap font-medium">{money(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end items-baseline gap-3 pr-1">
          <span className="text-sm text-muted-foreground">Invoice total</span>
          <span className="text-lg font-semibold">{money(total)}</span>
        </div>

        <div className="grid gap-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, PO number, thank-you note…" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleCreate} disabled={!canCreate || create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
