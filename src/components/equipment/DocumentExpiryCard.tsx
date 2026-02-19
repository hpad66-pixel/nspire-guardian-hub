import { EquipmentDocument, getDocumentStatus, formatExpiryLabel, DOCUMENT_TYPE_LABELS } from '@/hooks/useEquipment';
import { cn } from '@/lib/utils';
import { Paperclip, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';

interface DocumentExpiryCardProps {
  doc: EquipmentDocument;
  onEdit?: (doc: EquipmentDocument) => void;
  onDelete?: (doc: EquipmentDocument) => void;
}

const statusConfig = {
  current: {
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    label: 'Current',
    expiryColor: 'text-emerald-600',
  },
  expiring_soon: {
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    label: 'Expiring Soon',
    expiryColor: 'text-amber-600',
  },
  expired: {
    badge: 'bg-red-500/10 text-red-600 border-red-500/20',
    label: 'Expired',
    expiryColor: 'text-red-600',
  },
  no_expiry: {
    badge: 'bg-muted text-muted-foreground border-border',
    label: 'No Expiry',
    expiryColor: 'text-muted-foreground',
  },
};

export function DocumentExpiryCard({ doc, onEdit, onDelete }: DocumentExpiryCardProps) {
  const status = getDocumentStatus(doc.expiry_date);
  const sc = statusConfig[status];
  const typeLabel = doc.document_type === 'other'
    ? (doc.custom_type_label ?? 'Other')
    : (DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{typeLabel}</span>
            {doc.document_url && (
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          {doc.issuing_authority && (
            <p className="text-xs text-muted-foreground mt-0.5">{doc.issuing_authority}</p>
          )}
          {doc.document_number && (
            <p className="text-xs text-muted-foreground">#{doc.document_number}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', sc.badge)}>
            {sc.label}
          </span>
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(doc)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(doc)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {doc.expiry_date && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expires</p>
            <p className="text-sm font-medium text-foreground">
              {format(parseISO(doc.expiry_date), 'MMM d, yyyy')}
            </p>
          </div>
          <p className={cn('text-xs font-medium', sc.expiryColor)}>
            {formatExpiryLabel(doc.expiry_date, status)}
          </p>
        </div>
      )}
    </div>
  );
}
