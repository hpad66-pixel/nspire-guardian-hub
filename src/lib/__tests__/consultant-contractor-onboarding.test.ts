import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260912120000_consultant_contractor_onboarding.sql',
  'utf8',
);
const dialog = readFileSync('src/components/contractors/AddContractorDialog.tsx', 'utf8');
const portal = readFileSync('src/pages/contractors/ContractorOnboardingPage.tsx', 'utf8');
const crmGateway = readFileSync('supabase/functions/crm-integration-gateway/index.ts', 'utf8');

describe('consultant and contractor onboarding contract', () => {
  it('creates distinct engagement-specific checklist snapshots', () => {
    expect(migration).toContain("engagement_type IN ('contractor','consultant')");
    expect(migration).toContain("'professional_liability'");
    expect(migration).toContain("'professional_license'");
    expect(migration).toContain("applies_to IN ('both', p_engagement_type)");
  });

  it('carries client insurance wording into the passwordless portal', () => {
    expect(dialog).toContain('Certificate holder');
    expect(dialog).toContain('Additional insured');
    expect(portal).toContain('Prepare your certificates correctly');
    expect(portal).toContain('Secure · no password');
  });

  it('links readiness assignments to APAS CRM with role and project tags', () => {
    expect(crmGateway).toContain('contractor_project_assignments');
    expect(crmGateway).toContain('ProjOS Onboarding');
    expect(crmGateway).toContain('Client:');
    expect(crmGateway).toContain('Project:');
    expect(crmGateway).toContain('relationshipTag');
  });
});
