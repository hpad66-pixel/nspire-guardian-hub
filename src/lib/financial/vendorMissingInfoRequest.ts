export interface VendorRequirement {
  id: string;
  label: string;
  description: string;
}

export const VENDOR_REQUIREMENTS: VendorRequirement[] = [
  { id: 'vendor-email', label: 'Vendor contact email', description: 'The best email for billing and invoice follow-up.' },
  { id: 'vendor-address', label: 'Legal business address', description: 'The company address that should appear in the vendor record.' },
  { id: 'invoice-number', label: 'Invoice number', description: 'A unique invoice or reference number.' },
  { id: 'invoice-date', label: 'Invoice date', description: 'The date the invoice was issued.' },
  { id: 'due-date', label: 'Payment terms or due date', description: 'The agreed payment terms or confirmed due date.' },
  { id: 'project-reference', label: 'Project name or reference', description: 'The project, location, or work-order reference being billed.' },
  { id: 'scope-breakdown', label: 'Clear scope and amount breakdown', description: 'A description of the work, quantities, rates, and total.' },
  { id: 'signed-invoice', label: 'Signed invoice or vendor attestation', description: 'Confirmation that the invoice was submitted by an authorized vendor representative.' },
  { id: 'w9', label: 'Current W-9', description: 'A completed and signed IRS Form W-9.' },
  { id: 'insurance', label: 'Certificate of Insurance', description: 'Current insurance certificates meeting the project requirements.' },
  { id: 'license', label: 'Current license or registration', description: 'Applicable trade license, registration, or qualification documentation.' },
  { id: 'lien-waiver', label: 'Applicable lien waiver', description: 'The conditional or unconditional waiver required for this payment stage.' },
  { id: 'payment-destination', label: 'Verified payment destination', description: 'Confirmed remittance instructions. Never send passwords, PINs, or MFA codes.' },
];

const requirementById = new Map(VENDOR_REQUIREMENTS.map((item) => [item.id, item]));

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function mapMissingFieldsToRequirements(missingFields: string[]) {
  const ids = new Set<string>();
  const custom: string[] = [];

  for (const raw of missingFields) {
    const value = raw.toLowerCase().replace(/[_-]+/g, ' ').trim();
    let id: string | null = null;
    if (value.includes('email')) id = 'vendor-email';
    else if (value.includes('address')) id = 'vendor-address';
    else if (value.includes('invoice') && (value.includes('number') || value.includes('#'))) id = 'invoice-number';
    else if (value.includes('invoice') && value.includes('date')) id = 'invoice-date';
    else if (value.includes('due') || value.includes('payment term')) id = 'due-date';
    else if (value.includes('project')) id = 'project-reference';
    else if (value.includes('amount') || value.includes('scope') || value.includes('line item')) id = 'scope-breakdown';
    else if (value.includes('w-9') || value.includes('w9')) id = 'w9';
    else if (value.includes('insurance')) id = 'insurance';
    else if (value.includes('license')) id = 'license';
    else if (value.includes('lien') || value.includes('waiver')) id = 'lien-waiver';
    else if (value.includes('payment') || value.includes('remittance') || value.includes('bank')) id = 'payment-destination';
    else if (value.includes('signed') || value.includes('attest')) id = 'signed-invoice';

    if (id) ids.add(id);
    else if (value) custom.push(titleCase(raw));
  }

  return { requirementIds: [...ids], customRequirements: [...new Set(custom)] };
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export interface MissingInfoEmailInput {
  vendorName?: string;
  projectName: string;
  invoiceNumber?: string;
  sourceFileName?: string;
  requirementIds: string[];
  customRequirements: string[];
  dueDate?: string;
  message?: string;
}

export function resolveRequirementLabels(requirementIds: string[], customRequirements: string[]) {
  const standard = requirementIds
    .map((id) => requirementById.get(id)?.label)
    .filter((label): label is string => Boolean(label));
  return [...new Set([...standard, ...customRequirements.map((item) => item.trim()).filter(Boolean)])];
}

export function buildMissingInfoEmail(input: MissingInfoEmailInput) {
  const vendorName = input.vendorName?.trim() || 'Vendor team';
  const reference = input.invoiceNumber?.trim()
    ? `Invoice ${input.invoiceNumber.trim()}`
    : input.sourceFileName?.trim() || 'Your recent invoice submission';
  const requirements = resolveRequirementLabels(input.requirementIds, input.customRequirements);
  const deadline = input.dueDate
    ? new Date(`${input.dueDate}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const note = input.message?.trim()
    || 'Please reply with the selected items so we can complete our review and keep payment processing moving.';
  const subject = `Information requested for ${reference} — ${input.projectName}`;
  const bodyText = [
    `Hello ${vendorName},`,
    '',
    `Thank you for submitting ${reference} for ${input.projectName}. We need the following items to complete our review:`,
    ...requirements.map((item) => `- ${item}`),
    ...(deadline ? ['', `Please respond by ${deadline}.`] : []),
    '',
    note,
    '',
    'For your security, never send online-banking passwords, PINs, or MFA codes.',
    '',
    'APAS Project Controls',
  ].join('\n');

  const checklist = requirements.map((item) => `
    <tr>
      <td style="padding:7px 0;vertical-align:top;width:28px;"><span style="display:inline-block;width:20px;height:20px;border-radius:6px;background:#E9F7F1;color:#08775B;text-align:center;line-height:20px;font-weight:700;">✓</span></td>
      <td style="padding:7px 0;color:#17342E;font-size:14px;line-height:1.45;">${escapeHtml(item)}</td>
    </tr>`).join('');

  const bodyHtml = `
<div style="margin:0;background:#F4F6F3;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#17342E;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #DDE5E0;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(13,48,40,.08);">
    <div style="background:linear-gradient(135deg,#082D27 0%,#134B40 100%);padding:28px 32px;border-bottom:4px solid #D5B46C;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.7px;text-transform:uppercase;color:#D5B46C;">APAS Project Controls</div>
      <h1 style="margin:8px 0 4px;color:#FFFFFF;font-size:22px;line-height:1.25;">A few items are needed</h1>
      <p style="margin:0;color:#CFE0DB;font-size:13px;">${escapeHtml(input.projectName)} · ${escapeHtml(reference)}</p>
    </div>
    <div style="padding:30px 32px;">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hello ${escapeHtml(vendorName)},</p>
      <p style="margin:0 0 20px;color:#506660;font-size:14px;line-height:1.65;">Thank you for your submission. To complete our review and keep the invoice moving, please provide the items checked below.</p>
      <div style="border:1px solid #DDE5E0;border-radius:14px;background:#FBFCFB;padding:14px 18px;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">${checklist}</table>
      </div>
      ${deadline ? `<div style="margin:18px 0 0;border-left:4px solid #D5B46C;background:#FFF9EA;border-radius:8px;padding:12px 14px;color:#624A16;font-size:13px;"><strong>Requested by:</strong> ${escapeHtml(deadline)}</div>` : ''}
      <p style="margin:22px 0 0;color:#334D46;font-size:14px;line-height:1.65;">${escapeHtml(note).replace(/\n/g, '<br/>')}</p>
      <div style="margin-top:24px;border-radius:12px;background:#E9F7F1;padding:14px 16px;color:#155F4C;font-size:13px;line-height:1.55;"><strong>How to respond:</strong> Reply to this email with the requested information or documents. For your security, never send online-banking passwords, PINs, or MFA codes.</div>
    </div>
    <div style="border-top:1px solid #E6ECE8;background:#F8FAF8;padding:17px 32px;color:#71827D;font-size:11px;line-height:1.5;">Sent from the project record in ProjOS on behalf of APAS Consulting.</div>
  </div>
</div>`;

  return { subject, bodyHtml, bodyText, requirements };
}
