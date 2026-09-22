import { describe, expect, it } from 'vitest';
import { invoiceLifecycleActions, type ConsultingInvoice } from '../useConsultingInvoices';

const invoice = (status: ConsultingInvoice['status']) => ({ status }) as ConsultingInvoice;

describe('invoiceLifecycleActions', () => {
  it('lets draft invoices be edited, issued, and deleted before they become records', () => {
    const actions = invoiceLifecycleActions(invoice('draft'));

    expect(actions.has('edit')).toBe(true);
    expect(actions.has('mark_sent')).toBe(true);
    expect(actions.has('delete')).toBe(true);
    expect(actions.has('void')).toBe(false);
  });

  it('lets unpaid issued invoices return to draft or be voided without offering delete first', () => {
    const actions = invoiceLifecycleActions(invoice('sent'), 0);

    expect(actions.has('return_to_draft')).toBe(true);
    expect(actions.has('void')).toBe(true);
    expect(actions.has('record_payment')).toBe(true);
    expect(actions.has('delete')).toBe(false);
  });

  it('keeps paid invoice records locked for audit', () => {
    const actions = invoiceLifecycleActions(invoice('paid'), 100);

    expect(actions.size).toBe(0);
  });

  it('lets an unpaid void invoice return to draft or be removed as an eligible mistaken draft', () => {
    const actions = invoiceLifecycleActions(invoice('void'), 0);

    expect(actions.has('return_to_draft')).toBe(true);
    expect(actions.has('delete')).toBe(true);
  });
});
