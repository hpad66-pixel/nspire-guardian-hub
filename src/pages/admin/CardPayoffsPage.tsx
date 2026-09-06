import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileCheck2,
  Landmark,
  Link2,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCardPayoffs } from '@/hooks/useCardPayoffs';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { isAdminRole } from '@/lib/rbac';
import {
  AMEX_PAYMENT_URL,
  CARD_PAYMENT_STATUS,
  WELLS_FARGO_GATEWAY_URL,
  canCancelCardPayment,
  canReconcileCardPayment,
  canRecordExternalConfirmation,
  hasDirectPaymentCapability,
  isBalanceStale,
  maskAccount,
  money,
  type CardPaymentRequest,
  type CardPaymentStatus,
  type TreasuryAccountKind,
  type TreasuryPaymentAccount,
} from '@/lib/payments/cardPayoffs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const accountSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter a recognizable account name').max(80),
  last4: z.string().regex(/^\d{4}$/, 'Enter only the last four digits'),
  reportedBalance: z.string().optional(),
  paymentDueDate: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.reportedBalance && (!Number.isFinite(Number(value.reportedBalance)) || Number(value.reportedBalance) < 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reportedBalance'], message: 'Enter a valid non-negative balance' });
  }
});
type AccountForm = z.infer<typeof accountSchema>;

const paymentSchema = z.object({
  fundingAccountId: z.string().uuid('Select a Wells Fargo Business account'),
  cardAccountId: z.string().uuid('Select an American Express card'),
  amount: z.coerce.number().positive('Enter an amount greater than zero').max(9_999_999.99),
  note: z.string().max(500).optional(),
  acknowledged: z.boolean().refine(Boolean, 'Confirm that this creates a payment request only'),
});
type PaymentForm = z.infer<typeof paymentSchema>;

const confirmationSchema = z.object({
  confirmation: z.string().trim().min(4, 'Enter the Amex or bank confirmation').max(80)
    .refine((value) => !/[0-9]{12,}/.test(value), 'Do not enter a full account or card number'),
  acknowledged: z.boolean().refine(Boolean, 'Confirm that you completed the payment inside Amex'),
});
type ConfirmationForm = z.infer<typeof confirmationSchema>;

const reconcileSchema = z.object({
  status: z.enum(['settled', 'failed', 'returned']),
  note: z.string().trim().min(4, 'Add a bank/issuer evidence note').max(500),
});
type ReconcileForm = z.infer<typeof reconcileSchema>;

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return '—';
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

const toneClass: Record<(typeof CARD_PAYMENT_STATUS)[CardPaymentStatus]['tone'], string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
};

function StatusBadge({ status }: { status: CardPaymentStatus }) {
  const meta = CARD_PAYMENT_STATUS[status];
  return <Badge variant="outline" className={cn('whitespace-nowrap font-semibold', toneClass[meta.tone])}>{meta.label}</Badge>;
}

function ReadinessRow({ ready, title, detail }: { ready: boolean; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-background/70 p-3">
      {ready
        ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function AccountCard({
  kind,
  account,
  onAdd,
}: {
  kind: TreasuryAccountKind;
  account?: TreasuryPaymentAccount;
  onAdd: () => void;
}) {
  const bank = kind === 'funding_bank';
  const Icon = bank ? Landmark : CreditCard;
  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <div className={cn('h-1.5', bank ? 'bg-gradient-to-r from-red-700 to-amber-500' : 'bg-gradient-to-r from-blue-800 to-cyan-500')} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', bank ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-800')}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{bank ? 'Wells Fargo Business' : 'American Express'}</CardTitle>
              <CardDescription>{bank ? 'Intended funding source' : 'Card payoff destination'}</CardDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onAdd}>{account ? 'Update' : <><Plus className="mr-1 h-4 w-4" />Add</>}</Button>
        </div>
      </CardHeader>
      <CardContent>
        {account ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="font-semibold">{account.display_name}</p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{maskAccount(account.account_last4)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Not provider verified</Badge>
              <span className="text-muted-foreground">Saved as a masked reference only</span>
            </div>
            {!bank && account.reported_balance != null && (
              <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                <div><p className="text-xs text-muted-foreground">User-entered balance</p><p className="font-semibold">{money(account.reported_balance)}</p></div>
                <div><p className="text-xs text-muted-foreground">Payment due</p><p className="font-semibold">{formatDate(account.payment_due_date)}</p></div>
                {isBalanceStale(account.balance_as_of) && <p className="col-span-2 text-xs font-medium text-amber-700">Balance is not live. Recheck it in Amex before paying.</p>}
              </div>
            )}
          </div>
        ) : (
          <button onClick={onAdd} className="flex min-h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-colors hover:border-accent/60 hover:bg-accent/5">
            <Plus className="mb-2 h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-semibold">Add masked account reference</span>
            <span className="mt-1 text-xs text-muted-foreground">Only a nickname and last four digits</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function AccountDialog({
  kind,
  account,
  open,
  onOpenChange,
  onSave,
  pending,
}: {
  kind: TreasuryAccountKind;
  account?: TreasuryPaymentAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: AccountForm) => Promise<void>;
  pending: boolean;
}) {
  const card = kind === 'credit_card';
  const form = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { displayName: '', last4: '', reportedBalance: '', paymentDueDate: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      displayName: account?.display_name ?? (card ? 'American Express Business Card' : 'Wells Fargo Business Checking'),
      last4: account?.account_last4 ?? '',
      reportedBalance: account?.reported_balance == null ? '' : String(account.reported_balance),
      paymentDueDate: account?.payment_due_date ?? '',
    });
  }, [account, card, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{card ? 'Add American Express card' : 'Add Wells Fargo funding account'}</DialogTitle>
          <DialogDescription>
            Save a recognizable masked reference. This does not connect the account or authorize payments.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSave)}>
          <Alert className="border-emerald-200 bg-emerald-50/80 text-emerald-950">
            <LockKeyhole className="h-4 w-4" />
            <AlertTitle>Keep credentials private</AlertTitle>
            <AlertDescription>Never enter a full account number, full card number, password, PIN, or security code.</AlertDescription>
          </Alert>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-name`}>Account nickname</Label>
            <Input id={`${kind}-name`} {...form.register('displayName')} placeholder={card ? 'Amex Business Gold' : 'Operating account'} />
            {form.formState.errors.displayName && <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-last4`}>Last four digits only</Label>
            <Input id={`${kind}-last4`} maxLength={4} inputMode="numeric" autoComplete="off" disabled={!!account} {...form.register('last4')} placeholder="1234" />
            {account && <p className="text-[11px] text-muted-foreground">The identifier is locked after creation so prior payment records cannot silently point to another account.</p>}
            {form.formState.errors.last4 && <p className="text-xs text-destructive">{form.formState.errors.last4.message}</p>}
          </div>
          {card && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reported-balance">Statement balance (optional)</Label>
                <Input id="reported-balance" type="number" min="0" step="0.01" {...form.register('reportedBalance')} placeholder="0.00" />
                <p className="text-[11px] leading-4 text-muted-foreground">Labeled as user-entered—not live Amex data.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-due-date">Due date (optional)</Label>
                <Input id="payment-due-date" type="date" {...form.register('paymentDueDate')} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save masked reference</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreparePaymentDialog({
  open,
  onOpenChange,
  fundingAccounts,
  cardAccounts,
  onPrepare,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fundingAccounts: TreasuryPaymentAccount[];
  cardAccounts: TreasuryPaymentAccount[];
  onPrepare: (values: PaymentForm, idempotencyKey: string) => Promise<void>;
  pending: boolean;
}) {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { fundingAccountId: '', cardAccountId: '', amount: 0, note: '', acknowledged: false },
  });
  const amount = Number(form.watch('amount') || 0);

  useEffect(() => {
    if (!open) return;
    setIdempotencyKey(crypto.randomUUID());
    form.reset({
      fundingAccountId: fundingAccounts[0]?.id ?? '',
      cardAccountId: cardAccounts[0]?.id ?? '',
      amount: cardAccounts[0]?.reported_balance ?? 0,
      note: '',
      acknowledged: false,
    });
  }, [cardAccounts, form, fundingAccounts, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prepare an American Express payment</DialogTitle>
          <DialogDescription>Review the intended payment. Saving this request does not move money.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => onPrepare(values, idempotencyKey))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Select value={form.watch('fundingAccountId')} onValueChange={(value) => form.setValue('fundingAccountId', value, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select Wells Fargo account" /></SelectTrigger>
                <SelectContent>{fundingAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.display_name} · {maskAccount(account.account_last4)}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.fundingAccountId && <p className="text-xs text-destructive">{form.formState.errors.fundingAccountId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Select value={form.watch('cardAccountId')} onValueChange={(value) => form.setValue('cardAccountId', value, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select Amex card" /></SelectTrigger>
                <SelectContent>{cardAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.display_name} · {maskAccount(account.account_last4)}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.cardAccountId && <p className="text-xs text-destructive">{form.formState.errors.cardAccountId.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="card-payment-amount">Payment amount</Label>
              <Input id="card-payment-amount" type="number" min="0.01" max="9999999.99" step="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input value={new Date().toISOString().slice(0, 10)} disabled />
              <p className="text-[11px] text-muted-foreground">One-time payment today. Recurring payments are not enabled.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-note">Internal note (optional)</Label>
            <Textarea id="payment-note" rows={2} maxLength={500} {...form.register('note')} placeholder="Purpose or reconciliation note" />
          </div>
          <section className="overflow-hidden rounded-2xl border bg-muted/20">
            <div className="border-b bg-background/80 px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Final review</p></div>
            <div className="space-y-2 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Payment amount</span><span className="font-semibold tabular-nums">{money(amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Provider fee</span><span className="font-medium text-amber-700">Not supplied—verify in Amex</span></div>
              <Separator />
              <div className="flex justify-between text-base"><span className="font-semibold">Known total</span><span className="font-bold tabular-nums">{money(amount)}</span></div>
              <p className="text-[11px] leading-4 text-muted-foreground">The known total excludes any fee shown by Wells Fargo or American Express during the secure payment flow.</p>
            </div>
          </section>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm">
            <Checkbox checked={form.watch('acknowledged')} onCheckedChange={(value) => form.setValue('acknowledged', value === true, { shouldValidate: true })} className="mt-0.5" />
            <span>I reviewed the masked accounts and amount. I understand this saves an audited request and does not submit a bank transaction.</span>
          </label>
          {form.formState.errors.acknowledged && <p className="text-xs text-destructive">{form.formState.errors.acknowledged.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save payment request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmationDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  request: CardPaymentRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: ConfirmationForm) => Promise<void>;
  pending: boolean;
}) {
  const form = useForm<ConfirmationForm>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: { confirmation: '', acknowledged: false },
  });
  useEffect(() => { if (open) form.reset({ confirmation: '', acknowledged: false }); }, [form, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Record the Amex confirmation</DialogTitle><DialogDescription>Only do this after American Express confirms the {money(request?.amount)} payment.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onConfirm)}>
          <Alert className="border-blue-200 bg-blue-50 text-blue-950"><FileCheck2 className="h-4 w-4" /><AlertTitle>Processing—not settled</AlertTitle><AlertDescription>Recording this confirmation marks the payment as processing. It must still be reconciled after it posts.</AlertDescription></Alert>
          <div className="space-y-1.5"><Label htmlFor="amex-confirmation">Bank or issuer confirmation</Label><Input id="amex-confirmation" autoComplete="off" {...form.register('confirmation')} placeholder="Confirmation reference" /><p className="text-[11px] text-muted-foreground">Do not enter a full account or card number.</p>{form.formState.errors.confirmation && <p className="text-xs text-destructive">{form.formState.errors.confirmation.message}</p>}</div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm"><Checkbox checked={form.watch('acknowledged')} onCheckedChange={(value) => form.setValue('acknowledged', value === true, { shouldValidate: true })} className="mt-0.5" /><span>I completed this payment inside the secure American Express experience and copied the confirmation accurately.</span></label>
          {form.formState.errors.acknowledged && <p className="text-xs text-destructive">{form.formState.errors.acknowledged.message}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record as processing</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReconcileDialog({
  request,
  open,
  onOpenChange,
  onSave,
  pending,
}: {
  request: CardPaymentRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ReconcileForm) => Promise<void>;
  pending: boolean;
}) {
  const form = useForm<ReconcileForm>({ resolver: zodResolver(reconcileSchema), defaultValues: { status: 'settled', note: '' } });
  useEffect(() => { if (open) form.reset({ status: request?.status === 'settled' ? 'returned' : 'settled', note: '' }); }, [form, open, request?.status]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Reconcile card payment</DialogTitle><DialogDescription>Update the result only after checking the posted transaction in Wells Fargo and American Express.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSave)}>
          <div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Payment</p><p className="mt-1 text-2xl font-bold tabular-nums">{money(request?.amount)}</p><p className="mt-1 text-xs text-muted-foreground">Confirmation {request?.external_confirmation ?? '—'}</p></div>
          <div className="space-y-1.5"><Label>Result</Label><Select value={form.watch('status')} onValueChange={(value) => form.setValue('status', value as ReconcileForm['status'])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{request?.status !== 'settled' && <><SelectItem value="settled">Settled / posted</SelectItem><SelectItem value="failed">Failed</SelectItem></>}<SelectItem value="returned">Returned</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="reconciliation-note">Evidence note</Label><Textarea id="reconciliation-note" rows={3} {...form.register('note')} placeholder="What you verified and where" />{form.formState.errors.note && <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>}</div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save reconciliation</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CardPayoffsPage() {
  const { data: role, isLoading: roleLoading } = useCurrentUserRole();
  const canManage = isAdminRole(role);
  const {
    accounts,
    connections,
    requests,
    events,
    registerAccount,
    preparePayment,
    beginHandoff,
    recordConfirmation,
    reconcile,
    cancelPayment,
  } = useCardPayoffs(canManage);
  const [accountKind, setAccountKind] = useState<TreasuryAccountKind | null>(null);
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [selected, setSelected] = useState<CardPaymentRequest | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  const allAccounts = accounts.data ?? [];
  const fundingAccounts = allAccounts.filter((account) => account.account_kind === 'funding_bank');
  const cardAccounts = allAccounts.filter((account) => account.account_kind === 'credit_card');
  const funding = fundingAccounts[0];
  const card = cardAccounts[0];
  const providerConnections = connections.data ?? [];
  const directReady = hasDirectPaymentCapability(providerConnections, funding, card);
  const payments = requests.data ?? [];
  const activePayments = payments.filter((payment) => !['settled', 'failed', 'returned', 'cancelled'].includes(payment.status));
  const settledTotal = payments.filter((payment) => payment.status === 'settled').reduce((sum, payment) => sum + payment.amount, 0);

  const selectedEvents = useMemo(
    () => (events.data ?? []).filter((event) => event.card_payment_request_id === selected?.id),
    [events.data, selected?.id],
  );

  if (roleLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Checking treasury access…</div>;
  if (!canManage) return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">Administrator access required</h1>
      <p className="mt-2 text-sm text-muted-foreground">Card payoff preparation and reconciliation are restricted to workspace administrators.</p>
    </div>
  );

  async function saveAccount(values: AccountForm) {
    if (!accountKind) return;
    try {
      await registerAccount.mutateAsync({
        accountKind,
        displayName: values.displayName,
        last4: values.last4,
        reportedBalance: values.reportedBalance ? Number(values.reportedBalance) : null,
        paymentDueDate: values.paymentDueDate || null,
      });
      toast.success(`${accountKind === 'funding_bank' ? 'Wells Fargo' : 'American Express'} reference saved`);
      setAccountKind(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Account reference could not be saved');
    }
  }

  async function savePayment(values: PaymentForm, idempotencyKey: string) {
    try {
      const payment = await preparePayment.mutateAsync({
        fundingAccountId: values.fundingAccountId,
        cardAccountId: values.cardAccountId,
        amount: values.amount,
        idempotencyKey,
        note: values.note || null,
      });
      toast.success('Payment request prepared. No money has moved.');
      setPrepareOpen(false);
      setSelected(payment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment request could not be prepared';
      toast.error(message.replace(/^.*DUPLICATE_PAYMENT:\s*/i, 'Duplicate blocked: '));
    }
  }

  async function openSecureAmex(payment: CardPaymentRequest) {
    try {
      const updated = await beginHandoff.mutateAsync(payment.id);
      setSelected(updated);
      window.open(AMEX_PAYMENT_URL, '_blank', 'noopener,noreferrer');
      toast.message('American Express opened securely', { description: 'ProjOS has not marked the payment as submitted.' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open the payment handoff');
    }
  }

  async function saveConfirmation(values: ConfirmationForm) {
    if (!selected) return;
    try {
      const updated = await recordConfirmation.mutateAsync({ requestId: selected.id, confirmation: values.confirmation });
      setSelected(updated);
      setConfirmationOpen(false);
      toast.success('Confirmation recorded as processing—not settled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Confirmation could not be recorded');
    }
  }

  async function saveReconciliation(values: ReconcileForm) {
    if (!selected) return;
    try {
      const updated = await reconcile.mutateAsync({ requestId: selected.id, status: values.status, note: values.note });
      setSelected(updated);
      setReconcileOpen(false);
      toast.success(`Payment marked ${CARD_PAYMENT_STATUS[updated.status].label.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reconciliation could not be saved');
    }
  }

  async function cancelSelected() {
    if (!selected) return;
    try {
      const updated = await cancelPayment.mutateAsync({ requestId: selected.id });
      setSelected(updated);
      toast.success('Payment request cancelled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment request could not be cancelled');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100"><ShieldCheck className="h-3.5 w-3.5" />Secure company treasury</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">American Express Card Payoffs</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Prepare, authorize, and reconcile one-time payments from Wells Fargo Business—without storing bank passwords, full account numbers, or card security codes.</p>
          </div>
          <Button className="bg-white text-slate-950 hover:bg-cyan-50" disabled={!funding || !card} onClick={() => setPrepareOpen(true)}><CircleDollarSign className="mr-2 h-4 w-4" />Prepare a payment</Button>
        </div>
      </section>

      <Alert className={cn(directReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
        {directReady ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertCircle className="h-4 w-4 text-amber-700" />}
        <AlertTitle>{directReady ? 'Direct payment connection ready' : 'Direct payment connection is not active yet'}</AlertTitle>
        <AlertDescription className="leading-5">
          {directReady
            ? 'Wells Fargo payment origination and both account endpoints are provider verified. A separate final submission approval is still required for every payment.'
            : 'ProjOS currently has no verified Wells Fargo payment-origination connection and cannot see whether Amex is linked inside your bank. Use the secure Amex handoff below until the bank approves and provisions API access.'}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open requests</p><p className="mt-2 text-3xl font-bold">{activePayments.length}</p><p className="mt-1 text-xs text-muted-foreground">Prepared or processing</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Settled payments</p><p className="mt-2 text-3xl font-bold">{payments.filter((payment) => payment.status === 'settled').length}</p><p className="mt-1 text-xs text-muted-foreground">Reconciled as posted</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Settled total</p><p className="mt-2 text-3xl font-bold tabular-nums">{money(settledTotal)}</p><p className="mt-1 text-xs text-muted-foreground">Company card payoff history</p></CardContent></Card>
      </div>

      <section className="space-y-3">
        <div><h2 className="text-xl font-bold">Accounts and connection readiness</h2><p className="mt-1 text-sm text-muted-foreground">Masked references help prevent mistakes. They are not proof that either institution is connected.</p></div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AccountCard kind="funding_bank" account={funding} onAdd={() => setAccountKind('funding_bank')} />
          <AccountCard kind="credit_card" account={card} onAdd={() => setAccountKind('credit_card')} />
        </div>
      </section>

      <Card className="overflow-hidden border-blue-200/70">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-blue-700" />Direct connection checklist</CardTitle><CardDescription className="mt-1">Three different connections must be verified before ProjOS can originate a payment.</CardDescription></div>
            <Button variant="outline" asChild><a href={WELLS_FARGO_GATEWAY_URL} target="_blank" rel="noopener noreferrer">Wells Fargo Gateway signup<ArrowUpRight className="ml-2 h-4 w-4" /></a></Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 lg:grid-cols-3">
          <ReadinessRow ready={funding?.verification_status === 'verified'} title="1. Bank data connection" detail={funding ? `${funding.display_name} ${maskAccount(funding.account_last4)} is saved, but provider verification is ${funding.verification_status}.` : 'Add a masked Wells Fargo Business reference, then complete provider-hosted verification.'} />
          <ReadinessRow ready={card?.verification_status === 'verified'} title="2. Amex payee/card link" detail={card ? `${card.display_name} ${maskAccount(card.account_last4)} is saved, but the bank-to-card linkage remains unverified.` : 'Add a masked Amex card reference. ProjOS never asks for the full card number.'} />
          <ReadinessRow ready={directReady} title="3. Payment origination" detail={directReady ? 'Wells Fargo Gateway reports the payment-origination capability as active.' : 'Wells Fargo must approve API access and expose payment origination—not just balances or transactions.'} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold">Payment register</h2><p className="mt-1 text-sm text-muted-foreground">Every request carries a unique key, state history, and evidence source.</p></div><Button disabled={!funding || !card} onClick={() => setPrepareOpen(true)}><Plus className="mr-2 h-4 w-4" />New payment</Button></div>
        <Card className="overflow-hidden">
          {requests.isLoading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading card payments…</div> : payments.length === 0 ? (
            <div className="p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><CreditCard className="h-6 w-6" /></div><h3 className="mt-4 font-semibold">No card payments prepared</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add both masked account references, then prepare a one-time payment for review.</p></div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => {
                const from = allAccounts.find((account) => account.id === payment.funding_account_id);
                const to = allAccounts.find((account) => account.id === payment.card_account_id);
                return (
                  <button key={payment.id} onClick={() => setSelected(payment)} className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CreditCard className="h-5 w-5" /></div><div className="min-w-0"><p className="font-semibold">American Express {maskAccount(to?.account_last4)}</p><p className="mt-0.5 text-xs text-muted-foreground">From Wells Fargo {maskAccount(from?.account_last4)} · {formatDate(payment.payment_date)}</p><p className="mt-1 text-[11px] text-muted-foreground">{CARD_PAYMENT_STATUS[payment.status].description}</p></div></div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end"><StatusBadge status={payment.status} /><p className="min-w-28 text-right text-lg font-bold tabular-nums">{money(payment.amount)}</p><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <AccountDialog kind={accountKind ?? 'funding_bank'} account={allAccounts.find((account) => account.account_kind === accountKind)} open={accountKind != null} onOpenChange={(open) => !open && setAccountKind(null)} onSave={saveAccount} pending={registerAccount.isPending} />
      <PreparePaymentDialog open={prepareOpen} onOpenChange={setPrepareOpen} fundingAccounts={fundingAccounts} cardAccounts={cardAccounts} onPrepare={savePayment} pending={preparePayment.isPending} />
      <ConfirmationDialog request={selected} open={confirmationOpen} onOpenChange={setConfirmationOpen} onConfirm={saveConfirmation} pending={recordConfirmation.isPending} />
      <ReconcileDialog request={selected} open={reconcileOpen} onOpenChange={setReconcileOpen} onSave={saveReconciliation} pending={reconcile.isPending} />

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Card payment review</DialogTitle><DialogDescription>Verify the amount, masked endpoints, status evidence, and next authorized action.</DialogDescription></DialogHeader>
          {selected && (() => {
            const from = allAccounts.find((account) => account.id === selected.funding_account_id);
            const to = allAccounts.find((account) => account.id === selected.card_account_id);
            return (
              <div className="space-y-5">
                <section className="rounded-2xl border bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white">
                  <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-slate-400">One-time card payoff</p><p className="mt-2 text-3xl font-bold tabular-nums">{money(selected.amount)}</p></div><StatusBadge status={selected.status} /></div>
                  <div className="mt-5 grid gap-3 text-sm sm:grid-cols-[1fr_auto_1fr]"><div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-slate-400">From</p><p className="mt-1 font-semibold">Wells Fargo</p><p className="font-mono text-slate-300">{maskAccount(from?.account_last4)}</p></div><ArrowRight className="mx-auto hidden self-center text-slate-400 sm:block" /><div className="rounded-xl bg-white/10 p-3"><p className="text-xs text-slate-400">To</p><p className="mt-1 font-semibold">American Express</p><p className="font-mono text-slate-300">{maskAccount(to?.account_last4)}</p></div></div>
                </section>
                <Alert className={toneClass[CARD_PAYMENT_STATUS[selected.status].tone]}><AlertCircle className="h-4 w-4" /><AlertTitle>{CARD_PAYMENT_STATUS[selected.status].label}</AlertTitle><AlertDescription>{CARD_PAYMENT_STATUS[selected.status].description}</AlertDescription></Alert>
                <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Provider fee</p><p className="mt-1 font-semibold">{selected.fee_amount == null ? 'Not supplied' : money(selected.fee_amount)}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Known total</p><p className="mt-1 font-semibold tabular-nums">{money(selected.total_amount)}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Balance snapshot</p><p className="mt-1 font-semibold">{selected.balance_snapshot == null ? 'Not supplied' : money(selected.balance_snapshot)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{selected.balance_source === 'provider' ? 'Provider-confirmed' : 'User-entered or unavailable'} · {formatDate(selected.balance_as_of, true)}</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Confirmation</p><p className="mt-1 font-mono text-sm font-semibold">{selected.external_confirmation ?? 'Not recorded'}</p></div></div>
                <section className="space-y-3"><div><p className="font-semibold">Available actions</p><p className="text-xs text-muted-foreground">No action below can silently mark a payment settled.</p></div>
                  {!directReady && ['draft', 'needs_connection', 'awaiting_external_confirmation'].includes(selected.status) && <Button className="w-full bg-blue-800 hover:bg-blue-900" onClick={() => openSecureAmex(selected)} disabled={beginHandoff.isPending}>{beginHandoff.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-2 h-4 w-4" />}Open American Express securely</Button>}
                  {!directReady && <Button className="w-full" variant="outline" disabled><LockKeyhole className="mr-2 h-4 w-4" />Direct submission unlocks after bank API approval</Button>}
                  {canRecordExternalConfirmation(selected.status) && <Button className="w-full" variant="outline" onClick={() => setConfirmationOpen(true)}><FileCheck2 className="mr-2 h-4 w-4" />Record Amex confirmation</Button>}
                  {canReconcileCardPayment(selected.status) && <Button className="w-full" variant="outline" onClick={() => setReconcileOpen(true)}><RefreshCcw className="mr-2 h-4 w-4" />Reconcile posted result</Button>}
                  {canCancelCardPayment(selected.status) && <Button className="w-full text-destructive hover:text-destructive" variant="ghost" onClick={cancelSelected} disabled={cancelPayment.isPending}><XCircle className="mr-2 h-4 w-4" />Cancel payment request</Button>}
                </section>
                {selectedEvents.length > 0 && <section className="space-y-3 border-t pt-4"><p className="text-sm font-semibold">Audit trail</p><div className="space-y-2">{selectedEvents.map((event) => <div key={event.id} className="flex items-start gap-3 rounded-xl bg-muted/35 p-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{event.event_type.replaceAll('_', ' ')}</p><p className="text-[11px] text-muted-foreground">{formatDate(event.occurred_at, true)}</p></div><p className="mt-0.5 text-xs text-muted-foreground">Evidence: {event.evidence_source === 'provider' ? 'provider-confirmed' : event.evidence_source === 'user_recorded' ? 'administrator-recorded' : 'system control'}</p></div></div>)}</div></section>}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="font-semibold text-emerald-950">Security controls built into the workflow</p><div className="mt-3 grid gap-2 text-sm text-emerald-900 sm:grid-cols-2"><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />Masked identifiers only</p><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />Administrator-only access</p><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />Duplicate payment blocking</p><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />Immutable state-change audit trail</p><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />Processing and settlement kept separate</p><p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" />Returned and failed payment handling</p></div></div></div>
      </section>
    </div>
  );
}
