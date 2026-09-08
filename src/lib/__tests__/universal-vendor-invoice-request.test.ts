import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260908173000_universal_vendor_invoice_requests.sql', 'utf8');
const requestDialog = readFileSync('src/components/financial/ConsultingInvoiceRequestDialog.tsx', 'utf8');
const consultingPortal = readFileSync('src/pages/vendor/ConsultingVendorInvoicePage.tsx', 'utf8');
const constructionPortal = readFileSync('src/pages/vendor/VendorSubmitPage.tsx', 'utf8');
const requestEdge = readFileSync('supabase/functions/consulting-vendor-invoice/index.ts', 'utf8');
const constructionEdge = readFileSync('supabase/functions/vendor-submit/index.ts', 'utf8');

describe('universal vendor invoice request workflow', () => {
  it('asks for consulting or construction and validates the saved project classification', () => {
    expect(requestDialog).toContain('What kind of invoice is this?');
    expect(requestDialog).toContain('Consulting or professional services');
    expect(requestDialog).toContain('Construction or contracting');
    expect(requestDialog).toContain("projectKind(project) !== billingType");
    expect(migration).toContain('create_consulting_invoice_request_v3');
    expect(migration).toContain('create_construction_invoice_request_v2');
  });

  it('keeps consulting invoices free of SOV and generates a structured invoice from entered values', () => {
    expect(consultingPortal).toContain('Consulting invoices do not use a Schedule of Values');
    expect(consultingPortal).toContain('Services billed');
    expect(consultingPortal).toContain('generatedInvoiceFile');
    expect(consultingPortal).toContain('Invoice total');
    expect(consultingPortal).toContain('Upload your own PDF or invoice image');
  });

  it('routes construction to the commitment SOV and accepts a supporting invoice', () => {
    expect(requestEdge).toContain('/vendor/submit/${rawToken}');
    expect(requestDialog).toContain('Subcontract or purchase order');
    expect(constructionPortal).toContain('Schedule of values (AIA G703)');
    expect(constructionPortal).toContain('Your supporting invoice');
    expect(constructionEdge).toContain('action === "attach"');
    expect(migration).toContain('invoice_artifact_id');
  });

  it('links both workflows to the project directory and APAS CRM', () => {
    expect(migration).toContain('ensure_invoice_vendor_project_link');
    expect(migration).toContain('INSERT INTO public.project_directory_entries');
    expect(migration).toContain('INSERT INTO public.project_vendor_assignments');
    expect(requestEdge).toContain('syncProjectVendorToCrm');
  });
});
