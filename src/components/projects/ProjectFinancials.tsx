import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Receipt,
  GitMerge,
  Layers,
  HardHat,
  BarChart3,
  ChevronRight,
  FileSignature,
  CreditCard,
  AlertTriangle,
  Code2,
  ReceiptText,
  Ruler,
  ShieldCheck,
  Megaphone,
  BookOpen,
  Inbox,
} from 'lucide-react';
import { ChangeOrdersList } from './ChangeOrdersList';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ChangeOrderRow = Database['public']['Tables']['change_orders']['Row'];

interface ProjectFinancialsProps {
  project: ProjectRow & { property?: { name: string } };
  changeOrders: ChangeOrderRow[];
  projectName?: string;
}

export function ProjectFinancials({ project, changeOrders, projectName }: ProjectFinancialsProps) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const originalBudget = Number(project.budget) || 0;

  // "Spent" = costs actually incurred on the build: vendor/sub invoices received
  // (commitment_invoiced) + direct costs logged. Falls back to the legacy
  // project.spent field only if the rollup has no data.
  const { summary } = useProjectFinancials(project.id);
  const { data: directCostsTotal = 0 } = useQuery({
    queryKey: ['direct-costs-total', project.id],
    enabled: Boolean(project.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('direct_costs' as any)
        .select('amount')
        .eq('project_id', project.id);
      if (error) throw error;
      return (data ?? []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
    },
  });
  const rolledSpent = Number(summary.data?.commitment_invoiced ?? 0) + directCostsTotal;
  const spent = rolledSpent > 0 ? rolledSpent : Number(project.spent) || 0;

  const approvedCOs = changeOrders.filter((co) => co.status === 'approved');
  const pendingCOs = changeOrders.filter((co) => co.status === 'pending');
  const rejectedCOs = changeOrders.filter((co) => co.status === 'rejected');

  const approvedAmount = approvedCOs.reduce((sum, co) => sum + (Number(co.amount) || 0), 0);
  const pendingAmount = pendingCOs.reduce((sum, co) => sum + (Number(co.amount) || 0), 0);

  const adjustedBudget = originalBudget + approvedAmount;
  const remaining = adjustedBudget - spent;
  const spentPercentage = adjustedBudget > 0 ? Math.round((spent / adjustedBudget) * 100) : 0;

  const isOverBudget = remaining < 0;
  const isNearBudget = remaining >= 0 && remaining < adjustedBudget * 0.1;

  const MODULES = [
    {
      label: 'Prime Contract',
      path: `financials/prime-contract`,
      icon: FileSignature,
      color: 'text-[var(--apas-sapphire)]',
      bg: 'bg-blue-50',
      tag: 'PC · PCCO',
      what: 'Your main agreement with the owner — the single source of truth for project value.',
      how: 'Add the signed contract, enter your Schedule of Values (each line item with its dollar amount), then track pay applications as work gets done.',
      example: 'e.g. PC-01-001 · $1,250,000 · 16 SOV line items',
    },
    {
      label: 'Commitments',
      path: `financials/commitments`,
      icon: HardHat,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      tag: 'Subcontracts · POs',
      what: 'Money you\'ve committed to subs and vendors — what you owe them.',
      how: 'Create a commitment for every subcontractor or supplier you hire. Enter the contract value and add SOV lines so you can track their billing.',
      example: 'e.g. SC-002 · ABC Electrical · $185,000',
    },
    {
      label: 'Invoices',
      path: `financials/invoices`,
      icon: Receipt,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      tag: 'Pay Apps · Bills',
      what: 'Every bill received — from your subs and the ones you send to the owner.',
      how: 'Log pay applications from your owner contract here. When a sub sends you an invoice, record it under the matching commitment.',
      example: 'e.g. Pay App #3 · $42,500 · Period: Mar 1–31',
    },
    {
      label: 'Payments',
      path: `financials/payments`,
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      tag: 'Cash In · Ledger',
      what: 'Money actually received from the owner — your cash position at a glance.',
      how: 'Each time the owner sends a check or wire, record it here with the date and reference number. The running total updates automatically.',
      example: 'e.g. Check #4421 · $38,250 · Apr 15',
    },
    {
      label: 'Change Events',
      path: `financials/change-events`,
      icon: GitMerge,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      tag: 'PCO Exposure',
      what: 'Potential cost changes before they become official — your early warning system.',
      how: 'Whenever something unexpected happens that might cost more money, log it here first. Review it, price it, then promote it to a PCO.',
      example: 'e.g. Unforeseen rock excavation · Est. $22,000',
    },
    {
      label: 'Change Orders',
      path: `financials/change-orders`,
      icon: Layers,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      tag: 'PCO → PCCO',
      what: 'Approved changes that adjust your contract value — the formal paper trail.',
      how: 'Start with a PCO (Potential Change Order). Once the owner approves it, it becomes a PCCO and adds to your revised contract value.',
      example: 'e.g. PCCO-003 · Additional MEP Coordination · +$132,021',
    },
    {
      label: 'Direct Costs',
      path: `financials/direct-costs`,
      icon: DollarSign,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      tag: 'Labor · Materials',
      what: 'Costs you pay directly — labor, materials, equipment not covered by a sub.',
      how: 'Log any expense your company incurs directly on the project: crew timecards, material purchases, equipment rentals.',
      example: 'e.g. Concrete pump rental · $3,800 · May 5',
    },
    {
      label: 'Budget',
      path: `financials/budget`,
      icon: BarChart3,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      tag: 'SOV Summary',
      what: 'The financial health of your project at a single glance.',
      how: 'This view rolls up your SOV, change orders, billings, and commitments automatically. No manual entry needed — just review.',
      example: 'e.g. Revised Value $1,481,246 · 67% complete · $214k remaining',
    },
    {
      label: 'Issue Log',
      path: `financials/issues`,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      tag: 'Field Obs · PCO Seed',
      what: 'A running list of problems and surprises found in the field.',
      how: 'When your super notices something — a scope gap, hidden damage, owner request — log it here. One click turns it into a PCO so nothing gets lost.',
      example: 'e.g. Concrete delamination found Level 2 · Est. $8,500',
    },
    {
      label: 'Proposals',
      path: `financials/proposals`,
      icon: FileText,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      tag: 'Quotes · Estimates',
      what: 'Formal price quotes you send to clients before they sign anything.',
      how: 'Build a line-item estimate with your costs and markup, then export a branded PDF to send to the client. Track status from Draft → Sent → Approved.',
      example: 'e.g. PROP-001 · Lobby Renovation · $47,250 total',
    },
    {
      label: 'Pay Apps',
      path: `financials/pay-apps`,
      icon: ReceiptText,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      tag: 'G702 · G703',
      what: 'Applications for payment you submit to the owner against the prime contract.',
      how: 'Generate a pay app from your SOV and approved change orders, sign it, and send the AIA G702/G703 to the owner for review.',
      example: 'e.g. Pay App #4 · $25,000 · Period ending Jun 30',
    },
    {
      label: 'Quantities',
      path: `financials/quantities`,
      icon: Ruler,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      tag: 'Units · Progress',
      what: 'Quantity-based progress for unit-priced work — track installed quantities per line.',
      how: 'Each pay app records the quantity installed this period; the dashboard rolls up percent complete by line item and change order.',
      example: 'e.g. 1,250 of 1,800 LF pipe installed · 69%',
    },
    {
      label: 'Lien Releases',
      path: `financials/lien-releases`,
      icon: ShieldCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      tag: 'Waivers · Conditional',
      what: 'Lien waivers exchanged with subs and the owner as payments are made.',
      how: 'Generate a branded waiver, send it to the sub to fill, sign and notarize, then execute it. Payments can be gated on an approved release.',
      example: 'e.g. Conditional progress waiver · Dshin · $30,000',
    },
    {
      label: 'Reports',
      path: `financials/reports`,
      icon: BarChart3,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      tag: 'Branded · PDF',
      what: 'The financial reports center — branded summaries you can export and share.',
      how: 'Pick a report (contract status, cash position, change order log, etc.), review the charts, and export a branded PDF.',
      example: 'e.g. Owner financial summary · Revised $800,432.23',
    },
    {
      label: 'Client Updates',
      path: `financials/client-updates`,
      icon: Megaphone,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      tag: 'Owner Comms',
      what: 'Progress and financial updates you send to the owner to keep them informed.',
      how: 'Compose an update with the latest financial position and milestones, then send it to the owner contacts on file.',
      example: 'e.g. June progress update · sent to owner',
    },
    {
      label: 'Ledger',
      path: `financials/ledger`,
      icon: BookOpen,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      tag: 'All Activity',
      what: 'Every financial entry on the project in one chronological feed — receivable and payable.',
      how: 'Nothing to enter — this view aggregates contracts, change orders, pay apps, invoices, and payments automatically.',
      example: 'e.g. 124 entries · net cash position $167,560.85',
    },
    {
      label: 'Vendor Inbox',
      path: `financials/vendor-inbox`,
      icon: Inbox,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      tag: 'Sub Submissions',
      what: 'Invoices and documents subs submit to you, waiting to be logged or actioned.',
      how: 'Review what a sub has sent, match it to the right commitment, and post it as an invoice.',
      example: 'e.g. 3 pending submissions',
    },
    {
      label: 'Cost Codes',
      path: `cost-codes`,
      icon: Code2,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      tag: 'WBS · Categories',
      what: 'The categories you use to organize every dollar on the project.',
      how: 'Set these up once at the start. Use standard CSI codes or your own. Every budget line and commitment maps to a code.',
      example: 'e.g. 03-3000 Cast-in-Place Concrete · 16-0000 Electrical',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Financial module cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold">Financial Modules</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click any card to open that module</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map(({ label, path, icon: Icon, color, bg, tag, what, how, example }) => (
            <Link key={path} to={`/projects/${project.id}/${path}`} className="group block">
              <Card className="h-full border hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden">
                <CardContent className="p-0">
                  {/* Header strip */}
                  <div className={`${bg} px-4 pt-4 pb-3 flex items-start gap-3`}>
                    <div className="rounded-lg bg-white/80 shadow-sm p-2 shrink-0">
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm text-foreground">{label}</p>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide ${color} mt-0.5`}>{tag}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-foreground/80 font-medium leading-relaxed">{what}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{how}</p>
                    <div className="pt-1 border-t border-dashed border-muted">
                      <p className="text-[10px] text-muted-foreground/70 italic">{example}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Original budget and change order adjustments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budget Flow */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Original</p>
                <p className="text-xl font-bold">{formatCurrency(originalBudget)}</p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
                <span className="text-sm text-green-500">+{formatCurrency(approvedAmount)}</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Adjusted</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(adjustedBudget)}</p>
              </div>
            </div>

            {/* Spending Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Spent</span>
                <span className="text-sm font-medium">
                  {formatCurrency(spent)} of {formatCurrency(adjustedBudget)}
                </span>
              </div>
              <Progress
                value={Math.min(spentPercentage, 100)}
                className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : isNearBudget ? '[&>div]:bg-amber-500' : ''}`}
              />
              <div className="flex items-center justify-between text-sm">
                <span className={isOverBudget ? 'text-destructive' : 'text-muted-foreground'}>
                  {spentPercentage}% spent
                </span>
                <span
                  className={
                    isOverBudget
                      ? 'text-destructive'
                      : isNearBudget
                      ? 'text-amber-500'
                      : 'text-green-500'
                  }
                >
                  {isOverBudget ? 'Over budget by ' : 'Remaining: '}
                  {formatCurrency(Math.abs(remaining))}
                </span>
              </div>
            </div>

            {/* Status Alert */}
            {isOverBudget && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Budget Exceeded</p>
                  <p className="text-xs text-muted-foreground">
                    Spending has exceeded the adjusted budget
                  </p>
                </div>
              </div>
            )}
            {isNearBudget && !isOverBudget && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-500">Nearing Budget</p>
                  <p className="text-xs text-muted-foreground">
                    Less than 10% of budget remaining
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Change Order Summary</CardTitle>
            <CardDescription>Impact of scope changes on budget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-500">{approvedCOs.length}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-500">{pendingCOs.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
                <p className="text-lg font-bold text-destructive">{rejectedCOs.length}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved Amount</span>
                <Badge variant="outline" className="text-green-500">
                  +{formatCurrency(approvedAmount)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Approval</span>
                <Badge variant="outline" className="text-amber-500">
                  +{formatCurrency(pendingAmount)}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-medium">Potential Total</span>
                <span className="font-bold">{formatCurrency(adjustedBudget + pendingAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Orders List */}
      <ChangeOrdersList projectId={project.id} changeOrders={changeOrders} projectName={projectName} />
    </div>
  );
}
