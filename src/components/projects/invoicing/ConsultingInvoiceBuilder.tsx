import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useProjectScopes } from '@/hooks/useProjectScopes';
import { useConsultingInvoices, type NewInvoiceLine } from '@/hooks/useConsultingInvoices';
import { lineAmount } from '@/lib/consulting/billing';
import { money } from './invoiceMeta';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface ScopeRow extends NewInvoiceLine {
  included: boolean;
}

interface CustomRow {
  key: string;
  description: string;
  amount: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const recalc = lineAmount;
const newKey = () => `c-${Math.random().toString(36).slice(2, 9)}`;

export function ConsultingInvoiceBuilder({ open, onOpenChange, projectId }: Props) {
  const { data: scopes } = useProjectScopes(projectId);
  const { create } = useConsultingInvoices(projectId);

  const [mode, setMode] = useState<'scopes' | 'custom'>('scopes');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ScopeRow[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([
    { key: newKey(), description: '', amount: 0 },
  ]);

  useEffect(() => {
    if (!open) return;
    setIssueDate(todayIso());
    setDueDate('');
    setNotes('');
    const mapped = (scopes ?? []).map((s) => {
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
    });
    setRows(mapped);
    // If nothing is billable from scopes yet, default to custom lump-sum mode
    // so consulting invoices (proposal → invoice) still work without % progress.
    const hasBillable = mapped.some((r) => r.included && r.amount !== 0);
    setMode(hasBillable ? 'scopes' : 'custom');
    setCustomRows([{ key: newKey(), description: 'Professional services', amount: 0 }]);
  }, [open, scopes]);

  const setPct = (i: number, val: number) => setRows((prev) => prev.map((r, idx) =>
    idx === i ? { ...r, pct_this: val, amount: recalc(r.fee_amount, r.pct_prev, val) } : r));

  const included = rows.filter((r) => r.included);
  const scopeTotal = useMemo(() => included.reduce((s, r) => s + (Number(r.amount) || 0), 0), [rows]);
  const customTotal = useMemo(
    () => customRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [customRows],
  );
  const total = mode === 'scopes' ? scopeTotal : customTotal;
  const canCreate =
    mode === 'scopes'
      ? included.length > 0 && total !== 0
      : customRows.some((r) => r.description.trim() && Number(r.amount) !== 0);

  const handleCreate = async () => {
    try {
      const lines: NewInvoiceLine[] =
        mode === 'scopes'
          ? included.map(({ included: _omit, ...l }) => l)
          : customRows
              .filter((r) => r.description.trim() && Number(r.amount) !== 0)
              .map((r) => ({
                scope_id: null,
                description: r.description.trim(),
                fee_amount: Number(r.amount) || 0,
                pct_prev: 0,
                pct_this: 100,
                amount: Number(r.amount) || 0,
              }));

      await create.mutateAsync({
        issue_date: issueDate,
        due_date: dueDate || null,
        notes: notes.trim() || null,
        lines,
      });
      onOpenChange(false);
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[Playfair_Display] text-xl">New client invoice</DialogTitle>
          <DialogDescription>
            Bill against scope progress, or enter custom / lump-sum lines from an approved proposal.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'scopes' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scopes">From scopes</TabsTrigger>
            <TabsTrigger value="custom">Custom / lump sum</TabsTrigger>
          </TabsList>
        </Tabs>

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

        {mode === 'scopes' ? (
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
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No scopes yet. Switch to <button type="button" className="underline text-foreground" onClick={() => setMode('custom')}>Custom / lump sum</button> to invoice a proposal amount.
                    </td>
                  </tr>
                ) : rows.map((r, i) => (
                  <tr key={r.scope_id ?? i} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={r.included}
                        onCheckedChange={(v) => setRows((prev) => prev.map((x, idx) => idx === i ? { ...x, included: !!v } : x))}
                      />
                    </td>
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
        ) : (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Ideal for consulting engagements: enter the proposal line items or a single lump-sum fee.
            </p>
            {customRows.map((r, i) => (
              <div key={r.key} className="flex items-start gap-2">
                <Input
                  value={r.description}
                  onChange={(e) => setCustomRows((prev) => prev.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                  placeholder="Description (e.g. Phase 1 consulting fee)"
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={r.amount || ''}
                  onChange={(e) => setCustomRows((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: Number(e.target.value) } : x))}
                  placeholder="0.00"
                  className="w-32 text-right tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={customRows.length === 1}
                  onClick={() => setCustomRows((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCustomRows((prev) => [...prev, { key: newKey(), description: '', amount: 0 }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add line
            </Button>
          </div>
        )}

        <div className="flex justify-end items-baseline gap-3 pr-1">
          <span className="text-sm text-muted-foreground">Invoice total</span>
          <span className="text-lg font-semibold tabular-nums text-[var(--apas-sapphire)]">{money(total)}</span>
        </div>

        <div className="grid gap-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, PO number, thank-you note…" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || create.isPending}
            className="bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
