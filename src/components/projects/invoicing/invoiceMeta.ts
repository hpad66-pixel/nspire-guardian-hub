import type { InvoiceStatus } from '@/hooks/useConsultingInvoices';

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent:  { label: 'Sent',  className: 'bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]' },
  paid:  { label: 'Paid',  className: 'bg-[var(--apas-emerald)]/10 text-[var(--apas-emerald)]' },
  void:  { label: 'Void',  className: 'bg-[var(--apas-rose)]/10 text-[var(--apas-rose)] line-through' },
};

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0);
