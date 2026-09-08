import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260908143000_vendor_invoice_contact_auto_link.sql', 'utf8');
const requestEdge = readFileSync('supabase/functions/consulting-vendor-invoice/index.ts', 'utf8');
const crmGateway = readFileSync('supabase/functions/crm-integration-gateway/index.ts', 'utf8');

describe('vendor invoice contact auto-linking', () => {
  it('resolves a CRM contact into every project accounting directory', () => {
    expect(migration).toContain('create_consulting_invoice_request_v2');
    expect(migration).toContain('p_contact_id uuid');
    expect(migration).toContain('INSERT INTO public.project_directory_entries');
    expect(migration).toContain('INSERT INTO public.project_vendor_assignments');
    expect(migration).toContain('INSERT INTO public.consulting_vendor_assignments');
    expect(migration).toContain('Repair prior invoice requests');
  });

  it('synchronizes the resolved vendor and its attached people through APAS CRM', () => {
    expect(requestEdge).toContain('create_consulting_invoice_request_v3');
    expect(requestEdge).toContain('operation: "sync_vendor"');
    expect(crmGateway).toContain('project_directory_entries');
    expect(crmGateway).toContain('const contacts: ContactImportItem[]');
    expect(crmGateway).toContain('apas_contact_id: result.canonicalContactId');
  });
});
