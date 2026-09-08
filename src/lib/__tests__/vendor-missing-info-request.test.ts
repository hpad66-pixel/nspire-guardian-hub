import { describe, expect, it } from 'vitest';
import {
  buildMissingInfoEmail,
  mapMissingFieldsToRequirements,
} from '@/lib/financial/vendorMissingInfoRequest';

describe('vendor missing-information request', () => {
  it('maps AI field names to a deduplicated administrator checklist', () => {
    const result = mapMissingFieldsToRequirements([
      'vendor_email',
      'vendor email',
      'vendor_address',
      'due_date',
      'verified payment destination',
      'special certification',
    ]);

    expect(result.requirementIds).toEqual([
      'vendor-email',
      'vendor-address',
      'due-date',
      'payment-destination',
    ]);
    expect(result.customRequirements).toEqual(['Special Certification']);
  });

  it('builds a branded plain-text and HTML checklist without trusting vendor HTML', () => {
    const email = buildMissingInfoEmail({
      vendorName: '<Joe & Sons>',
      projectName: 'Ashish Office',
      invoiceNumber: '038',
      requirementIds: ['w9', 'insurance'],
      customRequirements: ['Updated work breakdown'],
      dueDate: '2026-09-12',
      message: 'Please send these items.',
    });

    expect(email.subject).toContain('Invoice 038');
    expect(email.requirements).toEqual(['Current W-9', 'Certificate of Insurance', 'Updated work breakdown']);
    expect(email.bodyText).toContain('- Current W-9');
    expect(email.bodyHtml).toContain('APAS Project Controls');
    expect(email.bodyHtml).toContain('&lt;Joe &amp; Sons&gt;');
    expect(email.bodyHtml).not.toContain('Hello <Joe & Sons>');
    expect(email.bodyHtml).toContain('never send online-banking passwords');
  });
});
