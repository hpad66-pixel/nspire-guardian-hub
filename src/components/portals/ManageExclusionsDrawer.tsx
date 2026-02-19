import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { usePortalExclusions, useToggleExclusion } from '@/hooks/usePortal';
import { useAllCredentials } from '@/hooks/useCredentials';
import { cn } from '@/lib/utils';

interface ManageExclusionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalId: string;
  module: 'credentials' | 'training' | 'safety' | 'equipment';
}

const MODULE_LABELS: Record<string, string> = {
  credentials: 'Credentials',
  training: 'Training',
  safety: 'Safety',
  equipment: 'Equipment',
};

export function ManageExclusionsDrawer({ open, onOpenChange, portalId, module }: ManageExclusionsDrawerProps) {
  const [search, setSearch] = useState('');
  const { data: exclusions = [], isLoading: loadingExclusions } = usePortalExclusions(portalId, module);
  const toggleExclusion = useToggleExclusion();

  // Load records based on module
  const { data: credentials = [], isLoading: loadingCreds } = useAllCredentials();

  const isLoading = loadingExclusions || (module === 'credentials' && loadingCreds);

  // Build record list based on module
  const records: { id: string; title: string; detail: string }[] = [];

  if (module === 'credentials') {
    credentials.forEach(c => {
      records.push({
        id: c.id,
        title: c.credential_type + (c.custom_type_label ? ` (${c.custom_type_label})` : ''),
        detail: c.expiry_date ? `Expires ${new Date(c.expiry_date).toLocaleDateString()}` : 'No expiry',
      });
    });
  }

  const exclusionIds = new Set(exclusions.map(e => e.record_id));
  const filtered = records.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.detail.toLowerCase().includes(search.toLowerCase())
  );

  const sharedCount = records.length - exclusionIds.size;
  const hiddenCount = exclusionIds.size;

  function handleToggle(recordId: string, currentlyExcluded: boolean) {
    toggleExclusion.mutate({
      portalId,
      module,
      recordId,
      excluded: !currentlyExcluded,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage {MODULE_LABELS[module]} Sharing</SheetTitle>
          <SheetDescription>
            All records are shared by default. Toggle off to hide specific items from your client.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Count summary */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{sharedCount} shared</Badge>
            {hiddenCount > 0 && <Badge variant="outline" className="text-amber-600 border-amber-300">{hiddenCount} hidden</Badge>}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search records..."
              className="pl-9 text-sm"
            />
          </div>

          {/* Record list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {records.length === 0 ? `No ${MODULE_LABELS[module].toLowerCase()} records found.` : 'No records match your search.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map(record => {
                const isExcluded = exclusionIds.has(record.id);
                return (
                  <div
                    key={record.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors',
                      isExcluded ? 'border-border bg-muted/30 opacity-60' : 'border-border bg-card'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{record.title}</p>
                      <p className="text-xs text-muted-foreground">{record.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{isExcluded ? 'Hidden' : 'Shared'}</span>
                      <Switch
                        checked={!isExcluded}
                        onCheckedChange={() => handleToggle(record.id, isExcluded)}
                        disabled={toggleExclusion.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
