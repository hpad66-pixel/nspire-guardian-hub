import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Copy, Archive, Settings, MoreHorizontal, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientPortal, useArchivePortal } from '@/hooks/usePortal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface PortalCardProps {
  portal: ClientPortal;
}

const MODULE_LABELS: Record<string, string> = {
  credentials: 'Credentials',
  training: 'Training',
  safety: 'Safety',
  equipment: 'Equipment',
};

export function PortalCard({ portal }: PortalCardProps) {
  const navigate = useNavigate();
  const archive = useArchivePortal();
  const [confirming, setConfirming] = useState(false);

  const portalUrl = `${window.location.origin}/portal/${portal.portal_slug}`;

  function copyLink() {
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied');
  }

  function handleArchive() {
    if (!confirming) { setConfirming(true); return; }
    archive.mutate(portal.id);
    setConfirming(false);
  }

  const statusDot = {
    active: 'bg-green-500',
    draft: 'bg-amber-400',
    archived: 'bg-muted-foreground',
  }[portal.status] ?? 'bg-muted-foreground';

  const statusLabel = {
    active: 'Active',
    draft: 'Draft',
    archived: 'Archived',
  }[portal.status] ?? portal.status;

  const updatedAgo = portal.updated_at
    ? formatDistanceToNow(new Date(portal.updated_at), { addSuffix: true })
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Logo or initials */}
          <div
            className="h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: portal.brand_accent_color ?? '#0F172A' }}
          >
            {portal.brand_logo_url ? (
              <img src={portal.brand_logo_url} alt="logo" className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              (portal.client_name ?? portal.name).charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{portal.name}</h3>
              <span className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', statusDot)} />
                <span className="text-xs text-muted-foreground">{statusLabel}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {portal.portal_type === 'client' ? 'Client Portal' : 'Project Portal'}
              {portal.client_name ? ` · ${portal.client_name}` : ''}
            </p>
          </div>
        </div>

        {/* Three-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/portals/${portal.id}`)}>
              <Settings className="h-3.5 w-3.5 mr-2" /> Edit Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyLink}>
              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Portal Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(portalUrl, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open Portal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleArchive}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="h-3.5 w-3.5 mr-2" />
              {confirming ? 'Confirm Archive' : 'Archive Portal'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {/* Contact count shown as placeholder — loaded per portal */}
          Contacts
        </span>
        {(portal.pending_requests_count ?? 0) > 0 && (
          <button
            onClick={() => navigate(`/portals/${portal.id}?tab=requests`)}
            className="flex items-center gap-1 text-amber-600 font-medium hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            {portal.pending_requests_count} pending request{portal.pending_requests_count !== 1 ? 's' : ''}
          </button>
        )}
        {updatedAgo && <span>Updated {updatedAgo}</span>}
      </div>

      {/* Shared modules */}
      {portal.shared_modules.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {portal.shared_modules.map(m => (
            <Badge key={m} variant="secondary" className="text-[10px] px-2 py-0.5">
              {MODULE_LABELS[m] ?? m}
            </Badge>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.open(portalUrl, '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open Portal
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => navigate(`/portals/${portal.id}`)}
        >
          Manage
        </Button>
      </div>
    </div>
  );
}
