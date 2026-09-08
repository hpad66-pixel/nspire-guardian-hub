import type { CRMContact } from '@/hooks/useCRMContacts';
import type { Organization } from '@/hooks/useDirectory';

export interface VendorInvoiceRecipient {
  key: string;
  source: 'organization' | 'contact';
  organizationId: string | null;
  contactId: string | null;
  vendorName: string;
  contactName: string | null;
  email: string | null;
  detail: string;
}

const personName = (contact: Pick<CRMContact, 'first_name' | 'last_name'>) =>
  [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();

export function buildVendorInvoiceRecipients(
  organizations: Organization[],
  contacts: CRMContact[],
): VendorInvoiceRecipient[] {
  const organizationOptions = organizations
    .filter((item) => ['sub', 'vendor', 'consultant', 'other'].includes(item.kind))
    .map((item): VendorInvoiceRecipient => ({
      key: `organization:${item.id}`,
      source: 'organization',
      organizationId: item.id,
      contactId: null,
      vendorName: item.name,
      contactName: null,
      email: item.email,
      detail: item.email || 'Company record - choose a billing email',
    }));

  const contactOptions = contacts
    .filter((contact) => contact.is_active !== false)
    .filter((contact) => ['vendor', 'contractor', 'other'].includes(contact.contact_type))
    .filter((contact) => Boolean(contact.company_name?.trim() || personName(contact)))
    .map((contact): VendorInvoiceRecipient => {
      const name = personName(contact);
      const company = contact.company_name?.trim() || name;
      return {
        key: `contact:${contact.id}`,
        source: 'contact',
        organizationId: null,
        contactId: contact.id,
        vendorName: company,
        contactName: name || null,
        email: contact.email,
        detail: [name && name !== company ? name : null, contact.email].filter(Boolean).join(' - ') || 'CRM contact',
      };
    });

  return [...contactOptions, ...organizationOptions].sort((left, right) => {
    const company = left.vendorName.localeCompare(right.vendorName, undefined, { sensitivity: 'base' });
    if (company !== 0) return company;
    if (left.source !== right.source) return left.source === 'contact' ? -1 : 1;
    return (left.contactName ?? '').localeCompare(right.contactName ?? '', undefined, { sensitivity: 'base' });
  });
}
