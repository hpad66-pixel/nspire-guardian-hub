import { useState } from 'react';
import { Paperclip, Share2, Printer, MoreHorizontal, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  type Credential,
  getCredentialStatus,
  formatExpiryDate,
  formatExpiryLabel,
  useDeleteCredential,
} from '@/hooks/useCredentials';
import { CredentialStatusBadge } from './CredentialStatusBadge';
import { ShareMenu } from './ShareMenu';
import { CredentialPrintView } from './CredentialPrintView';

interface CredentialCardProps {
  credential: Credential;
  holderName: string;
  jobTitle?: string | null;
  department?: string | null;
  onEdit?: (credential: Credential) => void;
}

const STATUS_EXPIRY_COLORS = {
  current: 'text-green-600 dark:text-green-400',
  expiring_soon: 'text-amber-600 dark:text-amber-400',
  expired: 'text-red-600 dark:text-red-400',
  no_expiry: 'text-muted-foreground',
};

export function CredentialCard({
  credential,
  holderName,
  jobTitle,
  department,
  onEdit,
}: CredentialCardProps) {
  const [showPrint, setShowPrint] = useState(false);
  const deleteCredential = useDeleteCredential();

  const status = getCredentialStatus(credential.expiry_date);
  const credLabel = credential.custom_type_label || credential.credential_type;
  const expiryLabel = formatExpiryLabel(credential.expiry_date, status);
  const expiryFormatted = formatExpiryDate(credential.expiry_date);

  const cardBorder = {
    current: 'border-green-500/20 hover:border-green-500/40',
    expiring_soon: 'border-amber-500/20 hover:border-amber-500/40',
    expired: 'border-red-500/30 hover:border-red-500/50',
    no_expiry: 'border-border hover:border-border/80',
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex flex-col rounded-xl border bg-card p-4 transition-all duration-200',
          cardBorder[status]
        )}
      >
        {/* Top row: type + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground leading-tight">{credLabel}</p>
            {credential.issuing_authority && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {credential.issuing_authority}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Share */}
            <ShareMenu
              credential={credential}
              holderName={holderName}
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              }
            />

            {/* Print */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setShowPrint(true)}
              title="Print / Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>

            {/* More */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(credential)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                )}
                {credential.document_url && (
                  <DropdownMenuItem asChild>
                    <a href={credential.document_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      View Document
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => deleteCredential.mutate(credential.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-3 flex items-center gap-2">
          <CredentialStatusBadge status={status} size="sm" />
          {credential.document_url && (
            <a
              href={credential.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="View document"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Expiry date */}
        <div className="mt-3 space-y-0.5">
          {credential.expiry_date ? (
            <p className="text-xs text-muted-foreground">Expires {expiryFormatted}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No expiry date set</p>
          )}
          <p className={cn('text-xs font-medium', STATUS_EXPIRY_COLORS[status])}>
            {expiryLabel}
          </p>
        </div>

        {/* Credential number if set */}
        {credential.credential_number && (
          <p className="mt-2 text-[11px] text-muted-foreground font-mono">
            #{credential.credential_number}
          </p>
        )}
      </div>

      {showPrint && (
        <CredentialPrintView
          credential={credential}
          holderName={holderName}
          jobTitle={jobTitle}
          department={department}
          onClose={() => setShowPrint(false)}
        />
      )}
    </>
  );
}
