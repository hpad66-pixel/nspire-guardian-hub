import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProjectScopes } from '@/hooks/useProjectScopes';
import { useFinancialProposals } from '@/hooks/useFinancialProposals';
import { useConsultingInvoices, type NewInvoiceLine } from '@/hooks/useConsultingInvoices';
import {
  lineAmount,
  buildProposalBillingRows,
  buildInvoiceLinesFromProposals,
  type ProposalBillingRow,
} from '@/lib/consulting/billing';
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

type Mode = 'proposals' | 'scopes' | 'custom';

const todayIso = () => new Date().toISOString().slice(0, 10);
const recalc = lineAmount;
const newKey = () => `c-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Fetch non-void consulting invoice lines for the project and sum amounts by
 * proposal_id so we do not double-bill an approved proposal.
 */
function useBilledProposalAmounts(projectId: string, enabled: boolean): Record<string, number> {
  const { data: invoices = [] } = useConsultingInvoices(projectId);
  const [map, setMap] = useState<Record<string, number>>({});
  const invoiceKey = (invoices ?? []).map((i) => `${i.id}:${i.status}:${i.total}`).join('|');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const active = (invoices ?? []).filter((i) => i.status !== 'void');
      if (active.length === 0) {
        if (!cancelled) setMap({});
        return;
      }
      const ids = active.map((i) => i.id);
      const { data, error } = await (supabase.from('consulting_invoice_lines' as never) as any)
        .select('proposal_id, amount, invoice_id')
        .in('invoice_id', ids);
      if (cancelled) return;
      if (error) {
        setMap({});
        return;
      }
      const next: Record<string, number> = {};
      for (const row of data ?? []) {
        if (!row.proposal_id) continue;
        next[row.proposal_id] = Math.round(((next[row.proposal_id] ?? 0) + (Number(row.amount) || 0)) * 100) / 100;
      }
      setMap(next);
    })();

    return () => { cancelled = true; };
    // invoiceKey captures status/total changes without depending on array identity
  }, [enabled, projectId, invoiceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}

export function ConsultingInvoiceBuilder({ open, onOpenChange, projectId }: Props) {
  const { data: scopes } = useProjectScopes(projectId);
  const { data: proposals = [] } = useFinancialProposals(projectId);
  const { create } = useConsultingInvoices(projectId);
  const billedByProposal = useBilledProposalAmounts(projectId, open);

  const [mode, setMode] = useState<Mode>('proposals');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<ScopeRow[]>([]);
  const [proposalRows, setProposalRows] = useState<ProposalBillingRow[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([
    { key: newKey(), description: '', amount: 0 },
  ]);

  useEffect(() => {
    if (!open) return;
    setIssueDate(todayIso());
    setDueDate('');
    setNotes('');

    const mappedScopes = (scopes ?? []).map((s) => {
      const prev = Number(s.pct_billed) || 0;
      const thisPct = Math.max(prev, Number(s.pct_complete) || 0);
      return {
        included: thisPct > prev,
        scope_id: s.id,
        proposal_id: null as string | null,
        description: s.title,
        fee_amount: Number(s.fee_amount) || 0,
        pct_prev: prev,
        pct_this: thisPct,
        amount: recalc(Number(s.fee_amount) || 0, prev, thisPct),
      };
    });
    setRows(mappedScopes);

    const mappedProposals = buildProposalBillingRows(proposals, billedByProposal);
    setProposalRows(mappedProposals);

    const hasProposalBillable = mappedProposals.some((r) => r.included && r.remaining > 0);
    const hasScopeBillable = mappedScopes.some((r) => r.included && r.amount !== 0);

    // Prefer approved proposals for consulting (proposal → invoice). Fall back
    // to scopes, then blank custom lines.
    setMode(hasProposalBillable ? 'proposals' : hasScopeBillable ? 'scopes' : 'custom');
    setCustomRows(
      hasProposalBillable
        ? mappedProposals
            .filter((r) => r.included)
            .map((r) => ({
              key: newKey(),
              description: `${r.proposal_no} · ${r.title}`,
              amount: r.remaining,
            }))
        : [{ key: newKey(), description: 'Professional services', amount: 0 }],
    );
  }, [open, scopes, proposals, billedByProposal]);

  const setPct = (i: number, val: number) => setRows((prev) => prev.map((r, idx) =>
    idx === i ? { ...r, pct_this: val, amount: recalc(r.fee_amount, r.pct_prev, val) } : r));

  const includedScopes = rows.filter((r) => r.included);
  const scopeTotal = useMemo(
    () => includedScopes.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows],
  );
  const proposalFeeTotal = useMemo(
    () => proposalRows.reduce((s, r) => s + r.fee_amount, 0),
    [proposalRows],
  );
  const proposalTotal = useMemo(
    () => proposalRows.filter((r) => r.included).reduce((s, r) => s + r.remaining, 0),
    [proposalRows],
  );
  const customTotal = useMemo(
    () => customRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [customRows],
  );
  const total =
    mode === 'proposals' ? proposalTotal : mode === 'scopes' ? scopeTotal : customTotal;

  const canCreate =
    mode === 'proposals'
      ? proposalRows.some((r) => r.included && r.remaining > 0)
      : mode === 'scopes'
        ? includedScopes.length > 0 && total !== 0
        : customRows.some((r) => r.description.trim() && Number(r.amount) !== 0);

  const approvedCount = proposals.filter((p) => p.status === 'approved').length;

  const handleCreate = async () => {
    try {
      let lines: NewInvoiceLine[];
      if (mode === 'proposals') {
        lines = buildInvoiceLinesFromProposals(proposalRows);
      } else if (mode === 'scopes') {
        lines = includedScopes.map(({ included: _omit, ...l }) => l);
      } else {
        lines = customRows
          .filter((r) => r.description.trim() && Number(r.amount) !== 0)
          .map((r) => ({
            scope_id: null,
            proposal_id: null,
            description: r.description.trim(),
            fee_amount: Number(r.amount) || 0,
            pct_prev: 0,
            pct_this: 100,
            amount: Number(r.amount) || 0,
          }));
      }

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
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[Playfair_Display] text-xl">New client invoice</DialogTitle>
          <DialogDescription>
            Bill against approved proposals, scope progress, or custom lump-sum lines.
            {approvedCount > 0 && (
              <span className="block mt-1 text-foreground">
                {approvedCount} approved proposal{approvedCount === 1 ? '' : 's'} on this project
                {proposalFeeTotal > 0 ? ` · ${money(proposalFeeTotal)} total fee` : ''}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="proposals" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Approved proposals
            </TabsTrigger>
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

        {mode === 'proposals' ? (
          <div className="rounded-lg border overflow-hidden mt-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b bg-muted/40">
                  <th className="px-2 py-2 w-8"></th>
                  <th className="font-medium px-2 py-2">Proposal</th>
                  <th className="font-medium px-2 py-2 text-right">Approved</th>
                  <th className="font-medium px-2 py-2 text-right">Billed</th>
                  <th className="font-medium px-2 py-2 text-right">This invoice</th>
                </tr>
              </thead>
              <tbody>
                {proposalRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No approved proposals yet. Approve a proposal under Financials → Proposals,
                      or switch to Custom / lump sum.
                    </td>
                  </tr>
                ) : proposalRows.map((r) => (
                  <tr key={r.proposal_id} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={r.included}
                        disabled={r.remaining <= 0}
                        onCheckedChange={(v) => setProposalRows((prev) =>
                          prev.map((x) => x.proposal_id === r.proposal_id ? { ...x, included: !!v } : x))}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{r.proposal_no}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.title}</div>
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">{money(r.fee_amount)}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                      {money(r.previously_billed)}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums font-medium text-[var(--apas-sapphire)]">
                      {money(r.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : mode === 'scopes' ? (
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
                      No scopes yet. Switch to{' '}
                      <button type="button" className="underline text-foreground" onClick={() => setMode('proposals')}>
                        Approved proposals
                      </button>
                      {' '}or Custom / lump sum.
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
              Ideal for one-off lines. Prefer the Approved proposals tab when the fee is already on a signed proposal.
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
