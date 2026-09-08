import { describe, expect, it } from 'vitest';
import { buildVendorInvoiceRecipients } from '../vendorInvoiceRecipients';
import type { CRMContact } from '@/hooks/useCRMContacts';
import type { Organization } from '@/hooks/useDirectory';

const organization = (overrides: Partial<Organization> = {}): Organization => ({
  id: 'org-1', tenant_id: 'tenant-1', name: 'Ecotech', legal_name: null, kind: 'vendor',
  email: 'billing@ecotech.test', phone: null, website: null, address_line1: null,
  address_line2: null, city: null, state: null, postal_code: null, country: null,
  notes: null, is_active: true, vendor_number: null, tax_id: null,
  insurance_expiry: null, bonding_capacity_cents: null, created_at: '', updated_at: '',
  ...overrides,
});

const contact = (overrides: Partial<CRMContact> = {}): CRMContact => ({
  id: 'contact-1', user_id: 'user-1', property_id: null, first_name: 'Erica', last_name: 'Stone',
  company_name: 'Ecotech', job_title: null, contact_type: 'vendor', email: 'erica@ecotech.test',
  phone: null, mobile: null, fax: null, address_line1: null, address_line2: null, city: null,
  state: null, zip_code: null, country: null, website: null, license_number: null,
  insurance_expiry: null, tags: [], notes: null, is_favorite: false, is_active: true,
  created_by: null, created_at: '', updated_at: '',
  ...overrides,
});

describe('vendor invoice recipient choices', () => {
  it('includes existing CRM people as actionable vendor recipients', () => {
    const choices = buildVendorInvoiceRecipients([organization()], [contact()]);

    expect(choices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'contact:contact-1',
        contactId: 'contact-1',
        vendorName: 'Ecotech',
        contactName: 'Erica Stone',
        email: 'erica@ecotech.test',
      }),
      expect.objectContaining({
        key: 'organization:org-1',
        organizationId: 'org-1',
        vendorName: 'Ecotech',
      }),
    ]));
  });

  it('excludes contacts that cannot represent a vendor relationship', () => {
    const choices = buildVendorInvoiceRecipients([], [
      contact({ id: 'owner-1', contact_type: 'owner' }),
      contact({ id: 'inactive-1', is_active: false }),
    ]);

    expect(choices).toEqual([]);
  });
});
