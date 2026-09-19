import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Plus, Trash2, FileText, Info, LockKeyhole, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useProjectScopes } from '@/hooks/useProjectScopes';
import { useFinancialProposals } from '@/hooks/useFinancialProposals';
import {
  useConsultingInvoices,
  useInvoiceDetail,
  useProposalBillingMaps,
  type NewInvoiceLine,
  type InvoiceHeaderInput,
} from '@/hooks/useConsultingInvoices';
import {
  lineAmount,
  buildProposalBillingRows,
  buildInvoiceLinesFromProposals,
  buildProposalAccountSummaries,
  proposalAmountToReachBillingPercent,
  defaultPaymentTerms,
  defaultInvoiceSubject,
  type ProposalBillingRow,
} from '@/lib/consulting/billing';
import { APAS_COMPANY_BRANDS, invoiceDocumentLabelForCompany, type ApasCompanyBrand } from '@/lib/financial/apasCompanyBranding';
import { money } from './invoiceMeta';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface InvoiceClientSeed {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName?: string;
  clientSeed?: InvoiceClientSeed | null;
  /** When set, opens in edit mode for an existing draft. */
  editInvoiceId?: string | null;
  /** Preselect one executed proposal when launched from its Create invoice action. */
  initialProposalId?: string | null;
  billingBrand?: ApasCompanyBrand;
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
const money2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ConsultingInvoiceBuilder({
  open,
  onOpenChange,
  projectId,
  projectName = 'Project',
  clientSeed,
  editInvoiceId,
  initialProposalId,
  billingBrand = APAS_COMPANY_BRANDS.apas_consulting,
}: Props) {
  const { data: scopes } = useProjectScopes(projectId);
  const { data: proposals = [] } = useFinancialProposals(projectId);
  const { create, update, data: invoices = [] } = useConsultingInvoices(projectId);
  const { data: editDetail } = useInvoiceDetail(open && editInvoiceId ? editInvoiceId : null);
  const { billedByProposal, paidByProposal } = useProposalBillingMaps(projectId, open);
  const editing = !!editInvoiceId;
  const existing = useMemo(
    () => editDetail?.invoice ?? (editInvoiceId ? invoices.find((i) => i.id === editInvoiceId) : null) ?? null,
    [editDetail, editInvoiceId, invoices],
  );

  const [mode, setMode] = useState<Mode>('proposals');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDaysIso(todayIso(), 30));
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(defaultPaymentTerms());
  const [poNumber, setPoNumber] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToCompany, setBillToCompany] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToPhone, setBillToPhone] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToCity, setBillToCity] = useState('');
  const [billToState, setBillToState] = useState('');
  const [billToPostal, setBillToPostal] = useState('');
  const [rows, setRows] = useState<ScopeRow[]>([]);
  const [proposalRows, setProposalRows] = useState<ProposalBillingRow[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([
    { key: newKey(), description: '', amount: 0 },
  ]);

  useEffect(() => {
    if (!open) return;

    const seedBillTo = () => {
      setBillToName(existing?.bill_to_name || clientSeed?.name || '');
      setBillToCompany(existing?.bill_to_company || clientSeed?.company || '');
      setBillToEmail(existing?.bill_to_email || clientSeed?.email || '');
      setBillToPhone(existing?.bill_to_phone || clientSeed?.phone || '');
      setBillToAddress(existing?.bill_to_address || clientSeed?.address || '');
      setBillToCity(existing?.bill_to_city || clientSeed?.city || '');
      setBillToState(existing?.bill_to_state || clientSeed?.state || '');
      setBillToPostal(existing?.bill_to_postal || clientSeed?.postal || '');
    };

    if (existing) {
      setIssueDate(existing.issue_date);
      setDueDate(existing.due_date || addDaysIso(existing.issue_date, 30));
      setNotes(existing.notes || '');
      setSubject(existing.subject || '');
      setPaymentTerms(existing.payment_terms || defaultPaymentTerms());
      setPoNumber(existing.po_number || '');
      seedBillTo();
    } else {
      setIssueDate(todayIso());
      setDueDate(addDaysIso(todayIso(), 30));
      setNotes('');
      setPoNumber('');
      seedBillTo();
    }

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

    // When editing, subtract this invoice's own lines from billed map so
    // remaining / this_amount reflect the draft being edited.
    const billedForEdit = { ...billedByProposal };
    const paidForEdit = { ...paidByProposal };
    if (existing && editDetail?.lines) {
      for (const l of editDetail.lines) {
        if (!l.proposal_id) continue;
        billedForEdit[l.proposal_id] = money2(
          Math.max(0, (billedForEdit[l.proposal_id] ?? 0) - (Number(l.amount) || 0)),
        );
      }
    }
    let mappedProposals = buildProposalBillingRows(proposals, billedForEdit, paidForEdit);
    if (!existing && initialProposalId) {
      mappedProposals = mappedProposals.map((row) => ({
        ...row,
        included: row.proposal_id === initialProposalId && row.remaining > 0,
        this_amount: row.proposal_id === initialProposalId ? row.this_amount : 0,
      }));
    }
    if (existing && editDetail?.lines?.length) {
      // Restore this draft's amounts onto the matching proposal rows.
      mappedProposals = mappedProposals.map((r) => {
        const match = editDetail.lines.find((l) => l.proposal_id === r.proposal_id);
        if (!match) return r;
        const amt = money2(Number(match.amount) || 0);
        return {
          ...r,
          this_amount: amt,
          included: amt > 0,
          remaining: money2(r.remaining + amt),
        };
      });
      const hasProposalLines = editDetail.lines.some((l) => l.proposal_id);
      const hasScopeLines = editDetail.lines.some((l) => l.scope_id);
      if (hasProposalLines) {
        setMode('proposals');
      } else if (hasScopeLines) {
        setMode('scopes');
        setRows(
          editDetail.lines.map((l) => ({
            included: true,
            scope_id: l.scope_id,
            proposal_id: l.proposal_id ?? null,
            description: l.description,
            fee_amount: Number(l.fee_amount) || 0,
            pct_prev: Number(l.pct_prev) || 0,
            pct_this: Number(l.pct_this) || 0,
            amount: Number(l.amount) || 0,
          })),
        );
      } else {
        setMode('custom');
        setCustomRows(
          editDetail.lines.map((l) => ({
            key: newKey(),
            description: l.description,
            amount: Number(l.amount) || 0,
          })),
        );
      }
    }
    setProposalRows(mappedProposals);

    const hasProposalBillable = mappedProposals.some((r) => r.included && r.remaining > 0);
    const firstTerms = mappedProposals.find((r) => r.included && r.terms)?.terms;
    if (!existing) {
      setPaymentTerms(defaultPaymentTerms(firstTerms));
      const nos = mappedProposals.filter((r) => r.included).map((r) => r.proposal_no);
      setSubject(defaultInvoiceSubject(projectName, nos));
      // Prefer proposal client contact when present
      const propClient = mappedProposals.find((r) => r.included && r.client_name);
      if (propClient?.client_name && !clientSeed?.name) setBillToName(propClient.client_name);
      if (propClient?.client_email && !clientSeed?.email) setBillToEmail(propClient.client_email);
    }

    if (!(existing && editDetail?.lines?.length)) {
      setMode('proposals');
      setCustomRows(
        hasProposalBillable
          ? mappedProposals
              .filter((r) => r.included)
              .map((r) => ({
                key: newKey(),
                description: `${r.proposal_no} · ${r.title}`,
                amount: r.this_amount,
              }))
          : [{ key: newKey(), description: 'Professional services', amount: 0 }],
      );
    }
  }, [open, scopes, proposals, billedByProposal, paidByProposal, existing, editDetail, clientSeed, projectName, initialProposalId]);

  // Keep subject in sync when proposal selection changes (create only).
  useEffect(() => {
    if (!open || editing) return;
    if (mode !== 'proposals') return;
    const nos = proposalRows.filter((r) => r.included && r.this_amount > 0).map((r) => r.proposal_no);
    setSubject(defaultInvoiceSubject(projectName, nos));
  }, [proposalRows, mode, open, editing, projectName]);

  const setPct = (i: number, val: number) => setRows((prev) => prev.map((r, idx) =>
    idx === i ? { ...r, pct_this: val, amount: recalc(r.fee_amount, r.pct_prev, val) } : r));

  const setProposalAmount = (proposalId: string, amount: number) => {
    setProposalRows((prev) =>
      prev.map((r) => {
        if (r.proposal_id !== proposalId) return r;
        const capped = money2(Math.max(0, Math.min(r.remaining, amount)));
        return { ...r, this_amount: capped, included: capped > 0 };
      }),
    );
  };

  const setProposalPercent = (proposalId: string, percent: number) => {
    setProposalRows((prev) =>
      prev.map((r) => {
        if (r.proposal_id !== proposalId) return r;
        const amount = proposalAmountToReachBillingPercent(r, percent);
        return { ...r, this_amount: amount, included: amount > 0 };
      }),
    );
  };

  const includedScopes = useMemo(() => rows.filter((r) => r.included), [rows]);
  const scopeTotal = useMemo(
    () => includedScopes.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [includedScopes],
  );
  const proposalFeeTotal = useMemo(
    () => proposalRows.reduce((s, r) => s + r.fee_amount, 0),
    [proposalRows],
  );
  const proposalTotal = useMemo(
    () => proposalRows.filter((r) => r.included).reduce((s, r) => s + r.this_amount, 0),
    [proposalRows],
  );
  const customTotal = useMemo(
    () => customRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [customRows],
  );
  const total =
    mode === 'proposals' ? proposalTotal : mode === 'scopes' ? scopeTotal : customTotal;

  const accountSummaries = useMemo(
    () => (mode === 'proposals' ? buildProposalAccountSummaries(proposalRows) : []),
    [mode, proposalRows],
  );

  const approvedCount = proposals.filter((p) => p.status === 'approved').length;
  const hasApprovedProposals = approvedCount > 0;
  const hasBillableProposalBalance = proposalRows.some((r) => r.remaining > 0);
  const hasSelectedProposalAmount = proposalRows.some((r) => r.included && r.this_amount > 0);
  const proposalWorkflowLocked = mode !== 'proposals';
  const invoiceBlocker = !hasApprovedProposals
    ? 'Approve or import the client proposal before creating this invoice.'
    : !hasBillableProposalBalance
      ? 'All approved proposals on this project are already fully billed. Add an approved amendment before invoicing more.'
      : proposalWorkflowLocked
        ? 'Use Approved proposals for client invoices so billing stays tied to the approved amount.'
        : !hasSelectedProposalAmount
          ? 'Select at least one proposal amount to bill.'
          : null;
  const canCreate = !invoiceBlocker;
  const saving = create.isPending || update.isPending;
  const consultingBrand = billingBrand;
  const invoiceDocumentLabel = invoiceDocumentLabelForCompany(consultingBrand);
  const setupSteps = [
    'Open the proposal intake page for this project.',
    'Choose one path: write from scratch with AI, or upload the already signed proposal as the permanent source record.',
    'For uploaded proposals, type the approved value lines by hand and select contractors or consultants from the project directory.',
    'Approve the proposal so those value lines become the billing authority.',
    'Return here and bill a percent complete, the remaining balance, or a typed amount inside the approved balance.',
  ];

  const buildHeader = (): InvoiceHeaderInput => ({
    issue_date: issueDate,
    due_date: dueDate || null,
    notes: notes.trim() || null,
    subject: subject.trim() || null,
    payment_terms: paymentTerms.trim() || null,
    po_number: poNumber.trim() || null,
    bill_to_name: billToName.trim() || null,
    bill_to_company: billToCompany.trim() || null,
    bill_to_email: billToEmail.trim() || null,
    bill_to_phone: billToPhone.trim() || null,
    bill_to_address: billToAddress.trim() || null,
    bill_to_city: billToCity.trim() || null,
    bill_to_state: billToState.trim() || null,
    bill_to_postal: billToPostal.trim() || null,
  });

  const buildLines = (): NewInvoiceLine[] => {
    if (mode === 'proposals') return buildInvoiceLinesFromProposals(proposalRows);
    if (mode === 'scopes') return includedScopes.map(({ included: _omit, ...l }) => l);
    return customRows
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
  };

  const handleSave = async () => {
    try {
      if (invoiceBlocker) {
        toast.error(invoiceBlocker);
        return;
      }
      const header = buildHeader();
      const lines = buildLines();
      if (editing && editInvoiceId) {
        await update.mutateAsync({ id: editInvoiceId, ...header, lines });
      } else {
        await create.mutateAsync({ ...header, lines });
      }
      onOpenChange(false);
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[Playfair_Display] text-xl">
            {editing ? `Edit invoice #${existing?.invoice_no ?? ''}` : 'New client invoice'}
          </DialogTitle>
          <DialogDescription>
            {consultingBrand.legalName} client invoice. Prior billed and paid amounts for each proposal stay connected automatically.
            {approvedCount > 0 && (
              <span className="block mt-1 text-foreground">
                {approvedCount} approved proposal{approvedCount === 1 ? '' : 's'}
                {proposalFeeTotal > 0 ? ` · ${money(proposalFeeTotal)} total fee` : ''}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-lg border p-3"
          style={{ borderColor: `${consultingBrand.accent}66`, background: consultingBrand.surface, color: consultingBrand.ink, fontFamily: consultingBrand.fontFamily }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: consultingBrand.accent }}>{consultingBrand.wordmark}</p>
              <p className="text-sm font-black">{invoiceDocumentLabel}</p>
            </div>
            <p className="text-xs" style={{ color: consultingBrand.muted }}>
              Branded PDF, account tab, report attachment package, client sign-off, and delivery email.
            </p>
          </div>
        </div>

        {!hasApprovedProposals && !editing && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Start the project correctly before invoicing</AlertTitle>
            <AlertDescription>
              <p>This invoice is locked until the approved proposal is fed into the project. That keeps stucco, consulting, and subcontractor billing tied to the real approved amount.</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {setupSteps.map((step, index) => (
                  <li key={step} className="flex gap-2 rounded-md bg-white/70 p-2 text-xs leading-5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 font-bold text-amber-950">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
                onClick={() => { window.location.href = `/projects/${projectId}/financials/proposals`; }}
              >
                Open proposal intake
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {hasApprovedProposals && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Proposal-linked billing is active</p>
                <p className="mt-1 text-xs leading-5 text-emerald-900">
                  Pick the approved proposal, choose a billing percent or amount, and the system caps the invoice at the remaining approved balance. Drafts can be edited or deleted. Once issued, the invoice stays locked in the audit trail.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-emerald-900">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1"><CheckCircle2 className="h-3 w-3" />Approved amount controls the ceiling</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1"><CheckCircle2 className="h-3 w-3" />Drafts stay editable until issued</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <TooltipProvider>
        <Tabs value={mode} onValueChange={(v) => {
          if (v !== 'proposals') {
            toast.info('Use Approved proposals for client invoices so billing stays tied to the approved project amount.');
            return;
          }
          setMode(v as Mode);
        }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="proposals" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Approved proposals
            </TabsTrigger>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="min-w-0">
                  <TabsTrigger value="scopes" disabled className="w-full">From scopes</TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Scope billing is legacy support. Create the approved proposal first, then invoice from that proposal.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="min-w-0">
                  <TabsTrigger value="custom" disabled className="w-full">Custom / lump sum</TabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Custom client invoices are disabled because they can drift from the approved proposal amount.
              </TooltipContent>
            </Tooltip>
          </TabsList>
        </Tabs>
        </TooltipProvider>

        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#C4A35A]">Bill to</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Contact name</Label>
              <Input value={billToName} onChange={(e) => setBillToName(e.target.value)} placeholder="Chris Sullivan" />
            </div>
            <div className="grid gap-1.5">
              <Label>Company</Label>
              <Input value={billToCompany} onChange={(e) => setBillToCompany(e.target.value)} placeholder="Client company" />
            </div>
            <div className="grid gap-1.5 col-span-2">
              <Label>Address</Label>
              <Input value={billToAddress} onChange={(e) => setBillToAddress(e.target.value)} placeholder="Street address" />
            </div>
            <div className="grid gap-1.5">
              <Label>City</Label>
              <Input value={billToCity} onChange={(e) => setBillToCity(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>State</Label>
                <Input value={billToState} onChange={(e) => setBillToState(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>ZIP</Label>
                <Input value={billToPostal} onChange={(e) => setBillToPostal(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input value={billToPhone} onChange={(e) => setBillToPhone(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Subject / RE</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Professional services — PROP-001 — Project" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="grid gap-1.5">
            <Label>Issue date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>PO / Ref</Label>
            <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid gap-1.5 md:col-span-1 col-span-2">
            <Label>Payment terms</Label>
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
        </div>

        {mode === 'proposals' ? (
          <TooltipProvider>
          <div className="rounded-lg border overflow-hidden mt-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b bg-muted/40">
                  <th className="px-2 py-2 w-8"></th>
                  <th className="font-medium px-2 py-2">Proposal</th>
                  <th className="font-medium px-2 py-2 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center gap-1">
                          Approved <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">The total approved proposal amount. This is the ceiling for all invoices tied to this proposal.</TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="font-medium px-2 py-2 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center gap-1">
                          Billed <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">Amount already included on non-void invoices for this proposal.</TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="font-medium px-2 py-2 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center gap-1">
                          Paid <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">Cash received and allocated back to this proposal from invoice payments.</TooltipContent>
                    </Tooltip>
                  </th>
                  <th className="font-medium px-2 py-2 text-right w-[220px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center gap-1">
                          This invoice <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">Choose a percent complete or type an amount. The amount cannot exceed the remaining approved balance.</TooltipContent>
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {proposalRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No approved proposals yet. Go to Financials, create or import the proposal, then mark it approved before invoicing.
                    </td>
                  </tr>
                ) : proposalRows.map((r) => (
                  <tr key={r.proposal_id} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={r.included}
                        disabled={r.remaining <= 0 && !r.included}
                        onCheckedChange={(v) => setProposalRows((prev) =>
                          prev.map((x) => x.proposal_id === r.proposal_id
                            ? { ...x, included: Boolean(v), this_amount: v ? (x.this_amount || x.remaining) : 0 }
                            : x))}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{r.proposal_no}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.title}</div>
                      {r.previously_billed > 0 && (
                        <div className="text-[11px] text-[var(--apas-sapphire)] mt-0.5">
                          Prior open A/R {money(Math.max(0, r.previously_billed - r.previously_paid))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums">{money(r.fee_amount)}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                      {money(r.previously_billed)}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                      {money(r.previously_paid)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="mb-1 flex flex-wrap justify-end gap-1">
                        {[25, 50, 100].map((percent) => (
                          <Button
                            key={percent}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={r.remaining <= 0}
                            className={cn(
                              'h-7 px-2 text-[11px]',
                              r.included && money2(r.this_amount) === proposalAmountToReachBillingPercent(r, percent) && 'border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]',
                            )}
                            onClick={() => setProposalPercent(r.proposal_id, percent)}
                          >
                            {percent}%
                          </Button>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={r.remaining <= 0}
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setProposalAmount(r.proposal_id, r.remaining)}
                        >
                          Remaining
                        </Button>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={r.remaining || undefined}
                        disabled={r.remaining <= 0 && !r.included}
                        value={r.included ? r.this_amount : ''}
                        onChange={(e) => setProposalAmount(r.proposal_id, Number(e.target.value))}
                        className="h-8 text-right tabular-nums"
                      />
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Left after this: {money(Math.max(0, r.remaining - (r.included ? r.this_amount : 0)))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </TooltipProvider>
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
                      No scopes yet. Switch to Approved proposals or Custom / lump sum.
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
              Ideal for one-off lines. Prefer Approved proposals when the fee is already on a signed proposal.
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

        {accountSummaries.length > 0 && (
          <div className="rounded-lg border border-[var(--apas-sapphire)]/20 bg-[var(--apas-sapphire)]/5 p-3 text-xs space-y-1">
            <div className="font-semibold uppercase tracking-wide text-[var(--apas-sapphire)]">Running tab</div>
            {accountSummaries.map((s) => (
              <div key={s.proposal_id} className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                <span className="font-medium text-foreground">{s.proposal_no}</span>
                <span>Prior billed {money(s.previously_billed)}</span>
                <span>Prior paid {money(s.previously_paid)}</span>
                <span className="text-[var(--apas-sapphire)] font-medium">This invoice {money(s.this_invoice)}</span>
                <span>Left after {money(s.remaining_after)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end items-baseline gap-3 pr-1">
          <span className="text-sm text-muted-foreground">Invoice total</span>
          <span className="text-lg font-semibold tabular-nums text-[var(--apas-sapphire)]">{money(total)}</span>
        </div>

        <div className="grid gap-1.5">
          <Label>Notes (shown on PDF)</Label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thank you for your business. Wire instructions, remittance address, or special notes…"
          />
        </div>

        {invoiceBlocker && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Invoice cannot be created yet</p>
              <p className="mt-0.5 text-xs leading-5">{invoiceBlocker}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canCreate || saving}
            className="bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Create proposal-linked invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
