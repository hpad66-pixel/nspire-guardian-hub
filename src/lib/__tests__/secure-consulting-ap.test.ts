import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260905190000_secure_consulting_vendor_payments.sql',
  'utf8',
);
const edge = readFileSync('supabase/functions/consulting-vendor-invoice/index.ts', 'utf8');
const paymentUi = readFileSync('src/components/financial/ConsultingPaymentDialog.tsx', 'utf8');
const requestUi = readFileSync('src/components/financial/ConsultingInvoiceRequestDialog.tsx', 'utf8');

describe('secure consulting accounts payable', () => {
  it('stores only a digest for one-time vendor invoice capability links', () => {
    expect(migration).toMatch(/token_digest text NOT NULL UNIQUE/);
    expect(migration).not.toMatch(/raw_token\s+text/);
    expect(edge).toContain('crypto.subtle.digest("SHA-256"');
    expect(edge).toMatch(/row\.status === "submitted"/);
    expect(edge).toMatch(/new Date\(row\.expires_at\) < new Date\(\)/);
  });

  it('requires invoice provenance, vendor readiness, and administrator approval', () => {
    expect(migration).toContain('INVOICE_SOURCE_REQUIRED');
    expect(migration).toContain('VENDOR_ATTESTATION_REQUIRED');
    expect(migration).toContain("contractor_can_proceed(v_cost.project_id, v_cost.vendor_org_id, 'payment')");
    expect(migration).toMatch(/ur\.role::text = 'admin'/);
    expect(migration).toContain('DUPLICATE_INVOICE');
  });

  it('does not permit direct authenticated payment writes', () => {
    expect(migration).toMatch(/CREATE POLICY consulting_cost_payments_read[\s\S]+FOR SELECT TO authenticated/);
    expect(migration).not.toMatch(/CREATE POLICY consulting_cost_payments_[^\n]+[\s\S]{0,100}FOR INSERT TO authenticated/);
    expect(migration).toContain('record_consulting_cost_payment');
  });

  it('requires bank evidence, reference, human confirmation, and idempotency', () => {
    expect(migration).toContain('PAYMENT_EVIDENCE_REQUIRED');
    expect(migration).toContain('Payment idempotency key is required');
    expect(migration).toMatch(/length\(btrim\(COALESCE\(p_reference,''\)\)\) < 3/);
    expect(paymentUi).toContain('I personally verified the payee');
    expect(paymentUi).toContain('proof_artifact_id: uploaded.id');
    expect(paymentUi).toContain('idempotency_key: idempotencyKey');
  });

  it('never captures bank credentials and keeps bank execution outside ProjOS', () => {
    expect(paymentUi).toContain('Bank credentials stay out of ProjOS');
    expect(paymentUi).toContain('completed this payment outside ProjOS');
    expect(paymentUi).not.toMatch(/type=["']password["']/i);
    expect(paymentUi).not.toMatch(/useState\([^)]*password/i);
  });

  it('limits public uploads by token, MIME type, and size', () => {
    expect(edge).toContain('token.length < 32');
    expect(edge).toContain('application/pdf');
    expect(edge).toContain('12 * 1024 * 1024');
    expect(edge).toContain('hasExpectedSignature');
    expect(edge).toContain('submit_consulting_invoice_request');
    expect(requestUi).toContain('private one-time link');
  });

  it('scopes provisioned vendor portal submissions to assigned organizations and projects', () => {
    expect(migration).toContain('consulting_vendor_assignments');
    expect(migration).toContain("public.current_portal_kind() <> 'sub'");
    expect(migration).toContain('p_organization_id = ANY(public.current_user_orgs())');
    expect(migration).toContain('submit_consulting_portal_invoice');
    expect(edge).toContain('formAction === "portal-submit"');
  });
});
