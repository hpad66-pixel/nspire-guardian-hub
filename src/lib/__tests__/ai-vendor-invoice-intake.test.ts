import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260905220000_ai_vendor_invoice_intake.sql',
  'utf8',
);
const intakeUi = readFileSync('src/components/financial/UploadParseDocument.tsx', 'utf8');
const extraction = readFileSync('supabase/functions/extract-document/index.ts', 'utf8');
const crmGateway = readFileSync('supabase/functions/crm-integration-gateway/index.ts', 'utf8');
const consultingPage = readFileSync('src/pages/projects/financial/ConsultingCostsPage.tsx', 'utf8');

describe('AI vendor invoice intake', () => {
  it('requires authenticated project access and bounded financial evidence', () => {
    expect(extraction).toContain('userDb.auth.getUser()');
    expect(extraction).toContain('.is("deleted_at", null)');
    expect(extraction).toContain('12 * 1024 * 1024');
    expect(extraction).toContain('hasExpectedSignature');
    expect(intakeUi).toContain('validateFinancialEvidenceFile');
  });

  it('keeps AI extraction advisory and requires human confirmation', () => {
    expect(extraction).toContain('never invent values');
    expect(intakeUi).toContain('I reviewed the PDF against these fields');
    expect(intakeUi).toContain('AI assisted with transcription only');
    expect(intakeUi).toContain('verified payment destination');
  });

  it('supports upload-first vendor creation on both project types', () => {
    expect(consultingPage).toContain('<UploadParseDocument projectId={projectId} />');
    expect(migration).toContain('upsert_project_vendor_from_invoice');
    expect(migration).toContain('create_consulting_invoice_from_submission');
    expect(migration).toContain('create_small_vendor_invoice_from_submission');
    expect(migration).toContain("'purchase_order'");
    expect(migration).toContain('commitment_invoice_lines');
  });

  it('does not bypass readiness, approval, or bank controls', () => {
    expect(migration).toContain("p_amount, 0, 'draft'");
    expect(intakeUi).toContain('Contractor readiness and commitment execution remain required');
    expect(intakeUi).not.toMatch(/type=["']password["']/i);
    expect(intakeUi).not.toMatch(/bank.*credential/i);
  });

  it('synchronizes confirmed project vendors through the existing APAS CRM adapter', () => {
    expect(crmGateway).toContain('async function syncVendor');
    expect(crmGateway).toContain('project_vendor_assignments');
    expect(crmGateway).toContain('importContacts');
    expect(crmGateway).toContain('apas_crm_contact_id');
    expect(intakeUi).toContain("operation: 'sync_vendor'");
  });
});
