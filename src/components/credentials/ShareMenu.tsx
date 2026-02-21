import { useState } from 'react';
import { Mail, Printer, Link, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { type Credential, useGenerateShareLink, formatExpiryDate, getCredentialStatus } from '@/hooks/useCredentials';
import { CredentialPrintView } from './CredentialPrintView';

interface ShareMenuProps {
  credential: Credential;
  holderName: string;
  trigger: React.ReactNode;
}

export function ShareMenu({ credential, holderName, trigger }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const generateShareLink = useGenerateShareLink();

  const credLabel = credential.custom_type_label || credential.credential_type;
  const expiryFormatted = formatExpiryDate(credential.expiry_date);

  // ── Email sharing ──────────────────────────────────────────────────────────
  const handleEmail = () => {
    const subject = encodeURIComponent(
      `${credLabel} — ${holderName} — Expires ${credential.expiry_date
        ? new Date(credential.expiry_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'N/A'}`
    );

    const lines = [
      'Hi,',
      '',
      `Please find my ${credLabel} details below:`,
      '',
      `Name: ${holderName}`,
      `Credential: ${credLabel}`,
      credential.issuing_authority ? `Issued by: ${credential.issuing_authority}` : null,
      credential.credential_number ? `License #: ${credential.credential_number}` : null,
      `Expiry Date: ${expiryFormatted}`,
      '',
      credential.document_url
        ? `Document available online. I'll attach it to this email.`
        : null,
      '',
      `Regards,`,
      holderName,
    ].filter(l => l !== null).join('\n');

    const body = encodeURIComponent(lines);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');

    if (credential.document_url) {
      // Trigger download
      const a = document.createElement('a');
      a.href = credential.document_url;
      a.download = `${credLabel.replace(/\s+/g, '_')}_${holderName.replace(/\s+/g, '_')}.pdf`;
      a.target = '_blank';
      a.click();
      toast.info('Document opened — attach it to your email');
    }
    setOpen(false);
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    setOpen(false);
    setShowPrint(true);
  };

  // ── Copy share link ────────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    await generateShareLink.mutateAsync(credential.id);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-52 p-1.5" align="end">
          <div className="space-y-0.5">
            <button
              onClick={handleEmail}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              Send via Email
            </button>
            <button
              onClick={handlePrint}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              Print or Save as PDF
            </button>
            <button
              onClick={handleCopyLink}
              disabled={generateShareLink.isPending}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Link className="h-4 w-4 text-muted-foreground" />
              Copy Share Link
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {showPrint && (
        <CredentialPrintView
          credential={credential}
          holderName={holderName}
          onClose={() => setShowPrint(false)}
        />
      )}
    </>
  );
}
