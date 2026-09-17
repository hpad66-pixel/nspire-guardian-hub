export type ApasCompanyKey = 'apas_consulting' | 'apas_build';
export type BillingWorkflowKey = 'consulting_invoice' | 'construction_pay_app';

export interface ApasCompanyBrand {
  key: ApasCompanyKey;
  legalName: string;
  wordmark: string;
  shortName: string;
  senderName: string;
  senderEmail: string;
  senderEmailStatus: 'verified' | 'pending_domain';
  senderTitle: string;
  workflow: BillingWorkflowKey;
  workflowLabel: string;
  workflowDescription: string;
  documentLabel: string;
  routeLabel: string;
  routePath: string;
  primary: string;
  accent: string;
  surface: string;
  ink: string;
  muted: string;
  fontFamily: string;
  footer: string;
  emailOpening: string;
  packageIncludes: string[];
}

export const APAS_COMPANY_BRANDS: Record<ApasCompanyKey, ApasCompanyBrand> = {
  apas_consulting: {
    key: 'apas_consulting',
    legalName: 'APAS Consulting LLC',
    wordmark: 'APAS CONSULTING',
    shortName: 'APAS Consulting',
    senderName: 'APAS Consulting',
    senderEmail: 'hardeep@apas.ai',
    senderEmailStatus: 'verified',
    senderTitle: 'Professional Services',
    workflow: 'consulting_invoice',
    workflowLabel: 'Client invoices',
    workflowDescription: 'Proposal-backed consulting invoices, A/R ledger, reports, and payment follow-up.',
    documentLabel: 'Professional Services Invoice',
    routeLabel: 'Open client invoices',
    routePath: 'financials/client-invoices',
    primary: '#082b23',
    accent: '#dfbd67',
    surface: '#f4faf6',
    ink: '#173a32',
    muted: '#60746c',
    fontFamily: "Georgia, 'Times New Roman', serif",
    footer: 'APAS Consulting LLC - Professional services invoice - ProjOS',
    emailOpening:
      'Please find the attached invoice package for your review and processing. The package includes the invoice, supporting report narrative, and the running account summary for continuity.',
    packageIncludes: ['Client invoice PDF', 'Consulting report / progress narrative', 'Running A/R account tab', 'Client approval record'],
  },
  apas_build: {
    key: 'apas_build',
    legalName: 'APAS Build LLC',
    wordmark: 'APAS BUILD',
    shortName: 'APAS Build',
    senderName: 'Greg Rand',
    senderEmail: 'greg@apasbuild.com',
    senderEmailStatus: 'pending_domain',
    senderTitle: 'APAS Build LLC',
    workflow: 'construction_pay_app',
    workflowLabel: 'Pay applications',
    workflowDescription: 'Construction progress billing against the prime contract with G702/G703 backup.',
    documentLabel: 'Progress Pay Application',
    routeLabel: 'Open pay applications',
    routePath: 'financials/pay-apps',
    primary: '#20242b',
    accent: '#ff7a1a',
    surface: '#fff6ee',
    ink: '#17191d',
    muted: '#69717d',
    fontFamily: "'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",
    footer: 'APAS Build LLC - Progress pay application - Sent by Greg Rand through ProjOS',
    emailOpening:
      'Attached is the progress pay application package for your review and processing. It combines the signed G702/G703 pay application with the selected backup so your team has one clean file.',
    packageIncludes: ['Signed G702/G703 pay application', 'Progress backup and photos/report', 'Lien releases / supporting PDFs', 'Client review email record'],
  },
};

export interface BillingWorkflowDescriptor {
  key: BillingWorkflowKey;
  workflowLabel: string;
  workflowDescription: string;
  documentLabel: string;
  routeLabel: string;
  routePath: string;
}

export interface ProjectBillingProfile {
  company_key?: ApasCompanyKey;
  companyKey?: ApasCompanyKey;
  sender_name?: string;
  sender_email?: string;
  sender_email_status?: ApasCompanyBrand['senderEmailStatus'];
}

const BILLING_PROFILE_KEY = 'billing_profile';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCompanyKey(value: unknown): value is ApasCompanyKey {
  return value === 'apas_consulting' || value === 'apas_build';
}

export function defaultCompanyKeyForProjectType(type?: string | null): ApasCompanyKey {
  return type === 'consulting' || type === 'client' ? 'apas_consulting' : 'apas_build';
}

export function billingWorkflowForProjectType(type?: string | null): BillingWorkflowKey {
  return type === 'consulting' || type === 'client' ? 'consulting_invoice' : 'construction_pay_app';
}

export function companyBrandForProjectType(type?: string | null): ApasCompanyBrand {
  return APAS_COMPANY_BRANDS[defaultCompanyKeyForProjectType(type)];
}

export function billingProfileFromProject(project?: { project_type?: string | null; program_meta?: unknown } | null): ProjectBillingProfile | null {
  const meta = project?.program_meta;
  if (!isRecord(meta)) return null;
  const profile = meta[BILLING_PROFILE_KEY];
  return isRecord(profile) ? (profile as ProjectBillingProfile) : null;
}

export function companyKeyForProject(project?: { project_type?: string | null; program_meta?: unknown } | null): ApasCompanyKey {
  const profile = billingProfileFromProject(project);
  const key = profile?.company_key ?? profile?.companyKey;
  return isCompanyKey(key) ? key : defaultCompanyKeyForProjectType(project?.project_type);
}

export function companyBrandForProject(project?: { project_type?: string | null; program_meta?: unknown } | null): ApasCompanyBrand {
  return APAS_COMPANY_BRANDS[companyKeyForProject(project)];
}

export function billingWorkflowDescriptorForProjectType(
  type?: string | null,
  brand: ApasCompanyBrand = companyBrandForProjectType(type),
): BillingWorkflowDescriptor {
  if (billingWorkflowForProjectType(type) === 'consulting_invoice') {
    return {
      key: 'consulting_invoice',
      workflowLabel: 'Client invoices',
      workflowDescription: `Client invoice workflow with ${brand.shortName} branding, report backup, running A/R ledger, and client email package.`,
      documentLabel: brand.key === 'apas_build' ? 'APAS Build Invoice' : 'Professional Services Invoice',
      routeLabel: 'Open client invoices',
      routePath: 'financials/client-invoices',
    };
  }
  return {
    key: 'construction_pay_app',
    workflowLabel: 'Pay applications',
    workflowDescription: `${brand.shortName} construction progress billing against the prime contract with G702/G703 backup.`,
    documentLabel: 'Progress Pay Application',
    routeLabel: 'Open pay applications',
    routePath: 'financials/pay-apps',
  };
}

export function invoiceDocumentLabelForCompany(brand: ApasCompanyBrand) {
  return brand.key === 'apas_build' ? 'APAS Build Invoice' : brand.documentLabel;
}

export function invoiceEmailOpeningForCompany(brand: ApasCompanyBrand) {
  if (brand.key === 'apas_build') {
    return 'Please find the attached APAS Build invoice package for your review and processing. The package includes the invoice, the supporting report backup, and the running account summary for continuity.';
  }
  return brand.emailOpening;
}

export function projectBillingProfileForCompany(companyKey: ApasCompanyKey): ProjectBillingProfile {
  const brand = APAS_COMPANY_BRANDS[companyKey];
  return {
    company_key: brand.key,
    sender_name: brand.senderName,
    sender_email: brand.senderEmail,
    sender_email_status: brand.senderEmailStatus,
  };
}

export function upsertProjectBillingProfile(programMeta: unknown, companyKey: ApasCompanyKey) {
  const meta = isRecord(programMeta) ? { ...programMeta } : {};
  const existing = isRecord(meta[BILLING_PROFILE_KEY]) ? (meta[BILLING_PROFILE_KEY] as Record<string, unknown>) : {};
  meta[BILLING_PROFILE_KEY] = {
    ...existing,
    ...projectBillingProfileForCompany(companyKey),
  };
  return meta;
}

export function coSettingsForCompanyBrand(brand: ApasCompanyBrand, seed: Record<string, unknown> = {}) {
  return {
    ...seed,
    __apas_company_key: brand.key,
    force_company_branding: true,
    company_name: brand.legalName,
    company_contact: brand.senderName,
    company_title: brand.senderTitle,
    wordmark: brand.wordmark,
    footer: brand.footer,
    email_from_name: brand.senderName,
    email_from_address: brand.senderEmail,
  };
}

export function invoicePackageSubject(brand: ApasCompanyBrand, documentNo: string | number, projectName: string) {
  return `${brand.documentLabel} #${documentNo} - ${projectName}`;
}
