import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Mail, Printer, Link, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import type { LWCertificate } from '@/services/learnworlds/learnworldsTypes';
import { useGenerateCertificateShareLink } from '@/hooks/useTraining';

interface TrainingShareMenuProps {
  certificate: LWCertificate;
  completionId: string;
}

function openCertificatePrintView(certificate: LWCertificate, holderName: string, jobTitle?: string) {
  const issued = format(parseISO(certificate.issuedAt), 'MMMM d, yyyy');
  const expires = certificate.expiresAt
    ? format(parseISO(certificate.expiresAt), 'MMMM d, yyyy')
    : null;

  const now = new Date();
  const isExpired = certificate.expiresAt ? new Date(certificate.expiresAt) < now : false;
  const statusLabel = isExpired ? 'EXPIRED' : 'CURRENT';
  const statusColor = isExpired ? '#dc2626' : '#16a34a';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${certificate.courseTitle} — Certificate</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #111; padding: 40px; max-width: 600px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-weight: 800; font-size: 18px; color: #0f172a; letter-spacing: -0.5px; }
    .date { font-size: 12px; color: #6b7280; }
    .holder-name { font-size: 26px; font-weight: 700; color: #0f172a; }
    .holder-meta { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .divider { border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .field-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .field-value { font-size: 14px; color: #111; font-weight: 500; }
    .row { margin-bottom: 16px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; color: ${statusColor}; border: 1.5px solid ${statusColor}; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <span class="brand">APAS OS</span>
    <span class="date">Generated ${format(now, 'MMMM d, yyyy')}</span>
  </div>
  <div class="holder-name">${holderName}</div>
  ${jobTitle ? `<div class="holder-meta">${jobTitle}</div>` : ''}
  <div class="divider"></div>
  <div class="row">
    <div class="field-label">Course</div>
    <div class="field-value" style="font-size:18px;font-weight:700;">${certificate.courseTitle}</div>
  </div>
  <div class="row">
    <div class="field-label">Issued by</div>
    <div class="field-value">LearnWorlds / APAS OS</div>
  </div>
  <div class="row">
    <div class="field-label">Certificate ID</div>
    <div class="field-value" style="font-family:monospace;">${certificate.certificateId}</div>
  </div>
  <div class="row">
    <div class="field-label">Date Completed</div>
    <div class="field-value">${issued}</div>
  </div>
  ${expires ? `
  <div class="row">
    <div class="field-label">Expiry Date</div>
    <div class="field-value">${expires}</div>
  </div>` : ''}
  <div class="row">
    <div class="field-label">Status</div>
    <span class="status-badge">${statusLabel}</span>
  </div>
  <div class="footer">
    Verified via APAS OS · apasos.ai
  </div>
  <script>window.print();<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function TrainingShareMenu({ certificate, completionId }: TrainingShareMenuProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const generateLink = useGenerateCertificateShareLink();

  const holderName = profile?.full_name ?? user?.email ?? 'Certificate Holder';
  const jobTitle = profile?.job_title ?? undefined;

  const handleEmail = () => {
    setOpen(false);
    const issued = format(parseISO(certificate.issuedAt), 'MMMM d, yyyy');
    const expires = certificate.expiresAt
      ? format(parseISO(certificate.expiresAt), 'MMMM yyyy')
      : null;
    const subject = encodeURIComponent(
      `${certificate.courseTitle} Certificate — ${holderName} — Completed ${format(parseISO(certificate.issuedAt), 'MMMM yyyy')}`
    );
    const body = encodeURIComponent(
      `Hi,\n\nPlease find my ${certificate.courseTitle} certificate details below:\n\nName: ${holderName}\nCourse: ${certificate.courseTitle}\nCompleted: ${issued}\n${expires ? `Certificate valid until: ${expires}\n` : ''}Certificate ID: ${certificate.certificateId}\n\nView certificate: ${certificate.certificateUrl}\n\nRegards,\n${holderName}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handlePrint = () => {
    setOpen(false);
    openCertificatePrintView(certificate, holderName, jobTitle);
  };

  const handleCopyLink = () => {
    setOpen(false);
    generateLink.mutate(completionId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground">
          <Share2 className="h-3.5 w-3.5" />
          <span className="sr-only">Share certificate</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5 space-y-0.5" align="start">
        <button
          onClick={handleEmail}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          Send via Email
        </button>
        <button
          onClick={handlePrint}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
          Print / Save PDF
        </button>
        <button
          onClick={handleCopyLink}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Link className="h-3.5 w-3.5 text-muted-foreground" />
          Copy Share Link
        </button>
      </PopoverContent>
    </Popover>
  );
}
