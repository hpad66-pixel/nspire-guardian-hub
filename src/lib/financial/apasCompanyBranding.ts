export type ApasCompanyKey = 'apas_consulting' | 'apas_build';
export type BillingWorkflowKey = 'consulting_invoice' | 'construction_pay_app';

export interface ApasCompanyBrand {
  key: ApasCompanyKey;
  legalName: string;
  wordmark: string;
  shortName: string;
  senderName: string;
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
    senderName: 'Greg Grant',
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
    footer: 'APAS Build LLC - Progress pay application - Sent by Greg Grant through ProjOS',
    emailOpening:
      'Attached is the progress pay application package for your review and processing. It combines the signed G702/G703 pay application with the selected backup so your team has one clean file.',
    packageIncludes: ['Signed G702/G703 pay application', 'Progress backup and photos/report', 'Lien releases / supporting PDFs', 'Client review email record'],
  },
};

export function billingWorkflowForProjectType(type?: string | null): BillingWorkflowKey {
  return type === 'consulting' || type === 'client' ? 'consulting_invoice' : 'construction_pay_app';
}

export function companyBrandForProjectType(type?: string | null): ApasCompanyBrand {
  return billingWorkflowForProjectType(type) === 'consulting_invoice'
    ? APAS_COMPANY_BRANDS.apas_consulting
    : APAS_COMPANY_BRANDS.apas_build;
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
  };
}

export function invoicePackageSubject(brand: ApasCompanyBrand, documentNo: string | number, projectName: string) {
  return `${brand.documentLabel} #${documentNo} - ${projectName}`;
}
