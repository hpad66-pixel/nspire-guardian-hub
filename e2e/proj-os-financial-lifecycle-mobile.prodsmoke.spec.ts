import { expect, test } from '@playwright/test';
import {
  bootAuthedProdApp,
  collectLazyChunkErrors,
  CRASH_TEXT,
  SEED,
  TABLE_ROWS,
} from './fixtures/prodStub';

const SECOND_PROJECT_ID = '55555555-5555-4555-8555-555555555555';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});

function seedConsultingFinancialRows() {
  TABLE_ROWS.projects = [
    {
      id: SEED.projectId,
      name: 'R4 Consulting Lifecycle Repair',
      status: 'active',
      description: 'Seeded mobile lifecycle smoke project.',
      budget: 0,
      spent: 0,
      property_id: null,
      client_id: null,
      client: { name: 'R4 Capital', client_type: 'business_client' },
      parent_project_id: null,
      project_type: 'consulting',
      program_meta: {},
      start_date: '2026-01-01',
      target_end_date: '2026-12-31',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: SECOND_PROJECT_ID,
      name: 'Second Project Identity Check',
      status: 'active',
      description: 'Seeded project used to catch stale header labels.',
      budget: 0,
      spent: 0,
      property_id: null,
      client_id: null,
      client: { name: 'Second Client', client_type: 'business_client' },
      parent_project_id: null,
      project_type: 'consulting',
      program_meta: {},
      start_date: '2026-02-01',
      target_end_date: '2026-12-31',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    },
  ];
  TABLE_ROWS.proposals = [{
    id: 'prop-0001-0000-4000-8000-000000000001',
    tenant_id: 't1',
    project_id: SEED.projectId,
    proposal_no: 'APAS-R4-001',
    title: 'Owner representative services',
    client_name: 'R4 Capital',
    client_email: 'owner@example.com',
    valid_until: '2026-10-31',
    status: 'approved',
    locked: true,
    accepted_signed_at: '2026-09-01T12:00:00Z',
    accepted_signed_name: 'Jane Owner',
    pdf_path: 'https://example.com/executed.pdf',
    signed_hardcopy_path: 'https://example.com/executed.pdf',
    signed_hardcopy_at: '2026-09-01T12:00:00Z',
    signed_hardcopy_note: 'Client signed offline.',
    scope_bullets: [],
    deliverables: [],
    notes: 'Approved scope.',
    terms: 'Net 30.',
    markup_pct: 0,
    overhead_pct: 0,
    profit_pct: 0,
    revision_no: 0,
    amendment_history: [],
    proposal_no_history: [],
    delivery_history: [],
    proposal_lines: [{
      id: 'line-0001-0000-4000-8000-000000000001',
      proposal_id: 'prop-0001-0000-4000-8000-000000000001',
      tenant_id: 't1',
      line_no: 1,
      category: 'other',
      description: 'Monthly advisory',
      lead_type: 'apas',
      lead_directory_entry_id: null,
      quantity: 1,
      unit: 'ls',
      unit_cost: 12500,
      markup_pct: 0,
      created_at: '2026-09-01T12:00:00Z',
    }],
    created_at: '2026-09-01T12:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  }];
  TABLE_ROWS.proposal_lines = (TABLE_ROWS.proposals[0] as { proposal_lines: unknown[] }).proposal_lines;
  TABLE_ROWS.project_directory_entries = [];
  TABLE_ROWS.project_scopes = [];
  TABLE_ROWS.consulting_invoices = [
    {
      id: 'cinv-0003-0000-4000-8000-000000000003',
      tenant_id: 't1',
      project_id: SEED.projectId,
      invoice_no: 3,
      status: 'sent',
      issue_date: '2026-09-18',
      due_date: '2026-10-18',
      subject: 'Issued unpaid invoice',
      payment_terms: 'Net 30',
      po_number: null,
      bill_to_name: 'Jane Owner',
      bill_to_company: 'R4 Capital',
      bill_to_email: 'owner@example.com',
      bill_to_phone: null,
      bill_to_address: null,
      bill_to_city: null,
      bill_to_state: null,
      bill_to_postal: null,
      notes: null,
      subtotal: 3500,
      total: 3500,
      created_by: null,
      created_at: '2026-09-18T12:00:00Z',
      updated_at: '2026-09-18T12:00:00Z',
    },
    {
      id: 'cinv-0002-0000-4000-8000-000000000002',
      tenant_id: 't1',
      project_id: SEED.projectId,
      invoice_no: 2,
      status: 'void',
      issue_date: '2026-09-15',
      due_date: '2026-10-15',
      subject: 'Mistaken void invoice',
      payment_terms: 'Net 30',
      po_number: null,
      bill_to_name: 'Jane Owner',
      bill_to_company: 'R4 Capital',
      bill_to_email: 'owner@example.com',
      bill_to_phone: null,
      bill_to_address: null,
      bill_to_city: null,
      bill_to_state: null,
      bill_to_postal: null,
      notes: null,
      subtotal: 2000,
      total: 2000,
      created_by: null,
      created_at: '2026-09-15T12:00:00Z',
      updated_at: '2026-09-15T12:00:00Z',
    },
    {
      id: 'cinv-0001-0000-4000-8000-000000000001',
      tenant_id: 't1',
      project_id: SEED.projectId,
      invoice_no: 1,
      status: 'draft',
      issue_date: '2026-09-12',
      due_date: '2026-10-12',
      subject: 'Draft invoice',
      payment_terms: 'Net 30',
      po_number: null,
      bill_to_name: 'Jane Owner',
      bill_to_company: 'R4 Capital',
      bill_to_email: 'owner@example.com',
      bill_to_phone: null,
      bill_to_address: null,
      bill_to_city: null,
      bill_to_state: null,
      bill_to_postal: null,
      notes: null,
      subtotal: 1000,
      total: 1000,
      created_by: null,
      created_at: '2026-09-12T12:00:00Z',
      updated_at: '2026-09-12T12:00:00Z',
    },
  ];
  TABLE_ROWS.consulting_invoice_payments = [];
  TABLE_ROWS.consulting_invoice_lines = [
    {
      id: 'cil-0003-0000-4000-8000-000000000003',
      invoice_id: 'cinv-0003-0000-4000-8000-000000000003',
      proposal_id: 'prop-0001-0000-4000-8000-000000000001',
      scope_id: null,
      description: 'APAS-R4-001 · Monthly advisory',
      fee_amount: 12500,
      pct_prev: 0,
      pct_this: 28,
      amount: 3500,
      sort_order: 0,
    },
    {
      id: 'cil-0002-0000-4000-8000-000000000002',
      invoice_id: 'cinv-0002-0000-4000-8000-000000000002',
      proposal_id: 'prop-0001-0000-4000-8000-000000000001',
      scope_id: null,
      description: 'APAS-R4-001 · Mistaken value',
      fee_amount: 12500,
      pct_prev: 0,
      pct_this: 16,
      amount: 2000,
      sort_order: 0,
    },
    {
      id: 'cil-0001-0000-4000-8000-000000000001',
      invoice_id: 'cinv-0001-0000-4000-8000-000000000001',
      proposal_id: 'prop-0001-0000-4000-8000-000000000001',
      scope_id: null,
      description: 'APAS-R4-001 · Draft value',
      fee_amount: 12500,
      pct_prev: 0,
      pct_this: 8,
      amount: 1000,
      sort_order: 0,
    },
  ];
}

async function expectNoDocumentOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

test('mobile financial lifecycle renders with ivory shell and usable invoice/proposal actions', async ({ page }) => {
  seedConsultingFinancialRows();
  const lazyErrors = collectLazyChunkErrors(page);
  await bootAuthedProdApp(page);

  await page.goto('/dashboard');
  await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('body')).not.toContainText(CRASH_TEXT);
  await expect(page.getByLabel(/Current project:/i)).toHaveCount(0);
  await expect(page.getByTestId('mobile-bottom-nav')).toHaveCSS('background-color', 'rgba(251, 248, 241, 0.95)');
  await page.getByRole('button', { name: /more/i }).click();
  await expect(page.getByRole('dialog').getByText('More')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(251, 248, 241)');
  await expectNoDocumentOverflow(page);

  await page.goto(`/projects/${SEED.projectId}/financials/proposals`);
  await expect(page.getByLabel('Current project: R4 Consulting Lifecycle Repair')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /client proposals/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('APAS-R4-001').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /invoice/i }).first()).toBeVisible();
  await expectNoDocumentOverflow(page);

  await page.goto(`/projects/${SEED.projectId}/financials/proposals/prop-0001-0000-4000-8000-000000000001`);
  await expect(page.getByLabel('Current project: R4 Consulting Lifecycle Repair')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Stable record ID/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /edit number/i })).toBeVisible();
  await expect(page.getByText(/Preserved record/i)).toBeVisible();
  await expectNoDocumentOverflow(page);

  await page.goto(`/projects/${SEED.projectId}/financials/client-invoices`);
  await expect(page.getByLabel('Current project: R4 Consulting Lifecycle Repair')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/All invoices/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Invoice #3').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Draft$/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Delete eligible invoice/i }).first()).toBeVisible();
  await page.getByText('Invoice #3').first().click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Return to draft/i })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Void unpaid invoice/i })).toBeVisible();
  await page.keyboard.press('Escape');
  page.on('dialog', (dialog) => void dialog.accept());
  await page.getByText('Invoice #2').first().click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Delete voided invoice/i })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /Delete voided invoice/i }).click();
  await expect(page.getByText('Invoice #2')).toHaveCount(0);
  await page.getByTestId('consulting-invoice-card-1').getByRole('button', { name: /Edit/i }).click();
  const editOneDialog = page.getByRole('dialog', { name: /Edit invoice #1/i });
  await expect(editOneDialog).toBeVisible();
  await expect(editOneDialog.getByLabel(/Invoice number/i)).toHaveValue('1');
  await editOneDialog.getByLabel(/Invoice number/i).fill('4');
  await editOneDialog.getByRole('button', { name: /Save changes/i }).scrollIntoViewIfNeeded();
  await editOneDialog.getByRole('button', { name: /Save changes/i }).click();
  await expect(editOneDialog).toBeHidden();
  await expect(page.getByTestId('consulting-invoice-card-4')).toBeVisible();
  await expect(page.getByText('Invoice #1')).toHaveCount(0);
  await page.getByTestId('consulting-invoice-card-4').getByRole('button', { name: /Edit/i }).click();
  const editFourDialog = page.getByRole('dialog', { name: /Edit invoice #4/i });
  await expect(editFourDialog).toBeVisible();
  await editFourDialog.getByRole('button', { name: /Delete draft/i }).scrollIntoViewIfNeeded();
  await editFourDialog.getByRole('button', { name: /Delete draft/i }).click();
  await expect(page.getByText('Invoice #4')).toHaveCount(0);
  await expectNoDocumentOverflow(page);

  await page.goto(`/projects/${SECOND_PROJECT_ID}/financials/proposals`);
  await expect(page.getByLabel('Current project: Second Project Identity Check')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Current project: R4 Consulting Lifecycle Repair')).toHaveCount(0);
  await expectNoDocumentOverflow(page);

  expect(lazyErrors).toEqual([]);
});
