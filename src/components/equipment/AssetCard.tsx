import { useState } from 'react';
import {
  EquipmentAsset, getAssetComplianceStatus, useActivatedCategories
} from '@/hooks/useEquipment';
import { AssetStatusBadge, ComplianceDot } from './AssetStatusBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { icons as lucideIcons } from 'lucide-react';
import { Box, MapPin, MoreHorizontal, ArrowUpRight, RotateCcw } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (lucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!Icon) return <Box className={className} />;
  return <Icon className={className} />;
}

interface AssetCardProps {
  asset: EquipmentAsset;
  onView: (id: string) => void;
  onCheckOut: (asset: EquipmentAsset) => void;
  onCheckIn: (asset: EquipmentAsset) => void;
}

export function AssetCard({ asset, onView, onCheckOut, onCheckIn }: AssetCardProps) {
  const { categories } = useActivatedCategories();
  const cat = categories.find(c => c.slug === asset.category_slug);
  const docs = asset.documents ?? [];
  const complianceStatus = getAssetComplianceStatus(docs);
  const hasAnyDoc = docs.length > 0;

  const activeCheckout = asset.active_checkout;
  const isOverdue = activeCheckout?.expected_return
    ? isPast(parseISO(activeCheckout.expected_return + 'T23:59:59'))
    : false;

  // Next expiring doc
  const activeDocs = docs.filter(d => d.expiry_date);
  activeDocs.sort((a, b) => (a.expiry_date ?? '') < (b.expiry_date ?? '') ? -1 : 1);
  const soonestDoc = activeDocs[0];

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card p-4 transition-all duration-150 cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30'
      )}
      onClick={() => onView(asset.id)}
    >
      {/* Compliance dot — top right */}
      {hasAnyDoc && (
        <div className="absolute top-3.5 right-3.5">
          <ComplianceDot status={complianceStatus} />
        </div>
      )}

      {/* Icon + basic info */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
          complianceStatus === 'expired' ? 'bg-destructive/10 text-destructive'
            : complianceStatus === 'expiring_soon' ? 'bg-amber-500/10 text-amber-600'
              : 'bg-primary/10 text-primary'
        )}>
          <CategoryIcon iconName={cat?.icon ?? 'Box'} className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 pr-5">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">{asset.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {cat?.name}{asset.make ? ` · ${asset.year ? asset.year + ' ' : ''}${asset.make}` : ''}
          </p>
        </div>
      </div>

      {/* Location */}
      {asset.assigned_location && (
        <div className="flex items-center gap-1 mb-2">
          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{asset.assigned_location}</span>
        </div>
      )}

      {/* Documents preview */}
      {hasAnyDoc && soonestDoc?.expiry_date ? (
        <div className="text-xs text-muted-foreground mb-3">
          {complianceStatus === 'expired'
            ? <span className="text-destructive font-medium">Document expired</span>
            : complianceStatus === 'expiring_soon'
              ? <span className="text-amber-600 font-medium">Expiring soon</span>
              : <span>Next expiry: {format(parseISO(soonestDoc.expiry_date), 'MMM yyyy')}</span>
          }
        </div>
      ) : !hasAnyDoc ? (
        <p className="text-xs text-muted-foreground/60 mb-3">No documents tracked</p>
      ) : null}

      {/* Checkout status */}
      {asset.status === 'checked_out' && activeCheckout ? (
        <div className={cn(
          'rounded-lg px-3 py-2 mb-3 text-xs',
          isOverdue ? 'bg-destructive/10' : 'bg-orange-500/10'
        )}>
          <p className={cn('font-semibold', isOverdue ? 'text-destructive' : 'text-orange-700')}>
            🔴 {activeCheckout.checked_out_profile?.full_name ?? 'Someone'} has this
          </p>
          <p className="text-muted-foreground mt-0.5">
            Since {format(parseISO(activeCheckout.checked_out_at), 'MMM d')}
            {activeCheckout.expected_return
              ? ` · Due back ${format(parseISO(activeCheckout.expected_return), 'MMM d')}`
              : ''}
            {isOverdue && ' — OVERDUE'}
          </p>
        </div>
      ) : null}

      {/* Bottom row: status + actions */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <AssetStatusBadge status={asset.status} size="sm" />
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {asset.status === 'available' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => onCheckOut(asset)}
            >
              <ArrowUpRight className="mr-1 h-3 w-3" /> Check Out
            </Button>
          )}
          {asset.status === 'checked_out' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => onCheckIn(asset)}
            >
              <RotateCcw className="mr-1 h-3 w-3" /> Return
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(asset.id)}>View Details</DropdownMenuItem>
              {asset.status === 'available' && (
                <DropdownMenuItem onClick={() => onCheckOut(asset)}>Check Out</DropdownMenuItem>
              )}
              {asset.status === 'checked_out' && (
                <DropdownMenuItem onClick={() => onCheckIn(asset)}>Return Equipment</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
