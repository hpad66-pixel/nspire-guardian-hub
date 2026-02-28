import { useEffect } from 'react';
import { type Credential, getCredentialStatus, formatExpiryDate } from '@/hooks/useCredentials';

interface CredentialPrintViewProps {
  credential: Credential;
  holderName: string;
  jobTitle?: string | null;
  department?: string | null;
  onClose: () => void;
}

const STATUS_PRINT_CONFIG = {
  current: { label: 'CURRENT', color: '#16a34a', bg: '#dcfce7' },
  expiring_soon: { label: 'EXPIRING SOON', color: '#d97706', bg: '#fef3c7' },
  expired: { label: 'EXPIRED', color: '#dc2626', bg: '#fee2e2' },
  no_expiry: { label: 'NO EXPIRY', color: '#6b7280', bg: '#f3f4f6' },
};

export function CredentialPrintView({
  credential,
  holderName,
  jobTitle,
  department,
  onClose,
}: CredentialPrintViewProps) {
  const status = getCredentialStatus(credential.expiry_date);
  const statusConfig = STATUS_PRINT_CONFIG[status];
  const credLabel = credential.custom_type_label || credential.credential_type;

  useEffect(() => {
    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${credLabel} — ${holderName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
      color: #111;
      padding: 48px;
      max-width: 640px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand { font-size: 18px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .date { font-size: 12px; color: #6b7280; text-align: right; }
    .title { font-size: 13px; color: #6b7280; }
    .holder-name { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .holder-meta { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .cred-type { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    .field { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; }
    .field-label { font-size: 12px; color: #6b7280; }
    .field-value { font-size: 13px; font-weight: 500; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: ${statusConfig.bg};
      color: ${statusConfig.color};
      border: 1px solid ${statusConfig.color}40;
    }
    .doc-link { margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #374151; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print {
      body { padding: 32px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">APAS OS</div>
      <div class="brand-sub">Credential Summary</div>
    </div>
    <div class="date">
      <div class="title">Generated</div>
      <div>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  <div class="holder-name">${holderName}</div>
  ${(jobTitle || department) ? `<div class="holder-meta">${[jobTitle, department].filter(Boolean).join(' · ')}</div>` : ''}

  <hr class="divider" />

  <div class="cred-type">${credLabel}</div>

  ${credential.issuing_authority ? `
  <div class="field">
    <span class="field-label">Issued by</span>
    <span class="field-value">${credential.issuing_authority}</span>
  </div>` : ''}

  ${credential.credential_number ? `
  <div class="field">
    <span class="field-label">License / Cert #</span>
    <span class="field-value">${credential.credential_number}</span>
  </div>` : ''}

  ${credential.issue_date ? `
  <div class="field">
    <span class="field-label">Issue Date</span>
    <span class="field-value">${new Date(credential.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>` : ''}

  <div class="field">
    <span class="field-label">Expiry Date</span>
    <div style="display:flex; align-items:center; gap:12px;">
      <span class="field-value">${formatExpiryDate(credential.expiry_date)}</span>
      <span class="status-badge">${statusConfig.label}</span>
    </div>
  </div>

  ${credential.document_url ? `
  <hr class="divider" />
  <div class="doc-link">
    📎 Document on file — <a href="${credential.document_url}" target="_blank">${credential.document_url}</a>
  </div>` : ''}

  <div class="footer">
    Generated from APAS OS · apasos.ai
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    onClose();
  }, [credLabel, holderName, jobTitle, department, statusConfig, credential, onClose]);

  return null;
}
