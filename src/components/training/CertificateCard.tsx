import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, ExternalLink, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LWCertificate } from '@/services/learnworlds/learnworldsTypes';
import { TrainingShareMenu } from './TrainingShareMenu';

interface CertificateCardProps {
  certificate: LWCertificate;
  completionId?: string; // DB id for share link generation
}

function getCertStatus(expiresAt: string | null): 'current' | 'expiring_soon' | 'expired' | 'no_expiry' {
  if (!expiresAt) return 'no_expiry';
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring_soon';
  return 'current';
}

const STATUS_CONFIG = {
  current: { label: 'Current', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  expired: { label: 'Expired', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  no_expiry: { label: 'No Expiry', className: 'bg-muted text-muted-foreground border-muted' },
};

export function CertificateCard({ certificate, completionId }: CertificateCardProps) {
  const status = getCertStatus(certificate.expiresAt);
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {certificate.courseTitle}
            </p>
            <p className="text-xs text-muted-foreground">ID: {certificate.certificateId}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn('flex-shrink-0 text-[10px]', cfg.className)}>
          {cfg.label}
        </Badge>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Earned {format(parseISO(certificate.issuedAt), 'MMM d, yyyy')}
        </span>
        {certificate.expiresAt && (
          <span className={cn(
            'flex items-center gap-1',
            status === 'expired' && 'text-red-500',
            status === 'expiring_soon' && 'text-amber-500',
          )}>
            <Clock className="h-3 w-3" />
            Expires {format(parseISO(certificate.expiresAt), 'MMM d, yyyy')}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {completionId && (
            <TrainingShareMenu certificate={certificate} completionId={completionId} />
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => window.open(certificate.certificateUrl, '_blank')}
        >
          <ExternalLink className="mr-1.5 h-3 w-3" />
          View Certificate
        </Button>
      </div>
    </div>
  );
}
