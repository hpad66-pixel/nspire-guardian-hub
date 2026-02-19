import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAssets, useActivatedCategories, useWorkspaceEquipmentConfig,
  useExpiringDocuments, getDocumentStatus, DOCUMENT_TYPE_LABELS,
  EquipmentAsset,
} from '@/hooks/useEquipment';
import { AssetCard } from '@/components/equipment/AssetCard';
import { AssetDetailDrawer } from '@/components/equipment/AssetDetailDrawer';
import { AddAssetSheet } from '@/components/equipment/AddAssetSheet';
import { CheckOutSheet } from '@/components/equipment/CheckOutSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { icons as lucideIcons } from 'lucide-react';
import { Truck, Plus, Settings, Search, AlertTriangle, Box } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useUserPermissions } from '@/hooks/usePermissions';

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (lucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!Icon) return <Box className={className} />;
  return <Icon className={className} />;
}

type StatusFilter = 'all' | 'available' | 'checked_out' | 'in_maintenance' | 'retired';
type ComplianceFilter = 'all' | 'current' | 'expiring' | 'expired' | 'no_docs';

export default function EquipmentDashboardPage() {
  const navigate = useNavigate();
  const { data: config } = useWorkspaceEquipmentConfig();
  const { categories } = useActivatedCategories();
  const { currentRole } = useUserPermissions();
  const { data: expiringDocs = [] } = useExpiringDocuments(60);

  const [activeCat, setActiveCat] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all');
  const [search, setSearch] = useState('');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [drawerAssetId, setDrawerAssetId] = useState<string | null>(null);
  const [checkoutAsset, setCheckoutAsset] = useState<EquipmentAsset | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<'checkout' | 'checkin'>('checkout');

  const isAdminOrManager = ['admin', 'owner', 'manager'].includes(currentRole ?? '');

  const { data: assets = [], isLoading } = useAssets({
    category_slug: activeCat !== 'all' ? activeCat : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    compliance: complianceFilter !== 'all' ? complianceFilter : undefined,
  });

  // First visit redirect handled in App.tsx by checking setup_completed
  if (config && !config.setup_completed) {
    navigate('/equipment/setup', { replace: true });
    return null;
  }

  // Search filter (client-side)
  const filtered = assets.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.asset_tag ?? '').toLowerCase().includes(q) ||
      (a.serial_number ?? '').toLowerCase().includes(q) ||
      (a.vin ?? '').toLowerCase().includes(q)
    );
  });

  // Summary counts (admin/manager only)
  const totalActive = assets.length;
  const allDocsCurrent = assets.filter(a => {
    const docs = (a.documents ?? []).filter(d => d.expiry_date);
    return docs.length === 0 || docs.every(d => getDocumentStatus(d.expiry_date) === 'current');
  }).length;
  const expiringSoon = expiringDocs.filter(d => {
    const s = getDocumentStatus(d.expiry_date);
    return s === 'expiring_soon';
  }).length;
  const expired = expiringDocs.filter(d => getDocumentStatus(d.expiry_date) === 'expired').length;

  // Attention section data
  const attentionDocs = expiringDocs.filter(d => {
    const s = getDocumentStatus(d.expiry_date);
    return s === 'expired' || s === 'expiring_soon';
  });

  const handleCheckOut = (asset: EquipmentAsset) => {
    setCheckoutAsset(asset);
    setCheckoutMode('checkout');
  };
  const handleCheckIn = (asset: EquipmentAsset) => {
    setCheckoutAsset(asset);
    setCheckoutMode('checkin');
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 sm:px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Equipment & Fleet</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track assets, documents, and availability</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/equipment/setup')} title="Equipment Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowAddAsset(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Equipment
            </Button>
          </div>
        </div>

        {/* Summary cards — admin/manager only */}
        {isAdminOrManager && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Total Active', value: totalActive, className: 'border-border' },
              { label: 'All Docs Current', value: allDocsCurrent, className: 'border-emerald-500/20' },
              { label: 'Expiring Soon', value: expiringSoon, className: 'border-amber-500/20' },
              { label: 'Expired Docs', value: expired, className: expired > 0 ? 'border-destructive/30' : 'border-border' },
            ].map(stat => (
              <div key={stat.label} className={cn('rounded-xl border bg-card p-3', stat.className)}>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="border-b border-border px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            <button
              onClick={() => setActiveCat('all')}
              className={cn(
                'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                activeCat === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setActiveCat(cat.slug)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  activeCat === cat.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <CategoryIcon iconName={cat.icon} className="h-3.5 w-3.5" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2 border-b border-border bg-muted/30">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, tag, serial..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="checked_out">Checked Out</option>
          <option value="in_maintenance">In Maintenance</option>
          <option value="retired">Retired</option>
        </select>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={complianceFilter}
          onChange={e => setComplianceFilter(e.target.value as ComplianceFilter)}
        >
          <option value="all">All Compliance</option>
          <option value="current">Current</option>
          <option value="expiring">Expiring</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
              <Truck className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {assets.length === 0 ? 'No equipment tracked yet' : 'No results found'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {assets.length === 0
                  ? 'Add your vehicles, tools, and equipment to track documents and availability across your team.'
                  : 'Try adjusting your filters or search terms.'}
              </p>
            </div>
            {assets.length === 0 && (
              <Button onClick={() => setShowAddAsset(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Equipment
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onView={id => setDrawerAssetId(id)}
                onCheckOut={handleCheckOut}
                onCheckIn={handleCheckIn}
              />
            ))}
          </div>
        )}

        {/* Attention Required section */}
        {attentionDocs.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-foreground">Attention Required</h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                {attentionDocs.length}
              </span>
            </div>
            <div className="space-y-2">
              {attentionDocs.map(doc => {
                const status = getDocumentStatus(doc.expiry_date);
                const isExpired = status === 'expired';
                const daysStr = (() => {
                  if (!doc.expiry_date) return '';
                  const d = Math.abs(Math.round((parseISO(doc.expiry_date).getTime() - Date.now()) / 86400000));
                  return isExpired ? `${d} days overdue` : `Expires in ${d} days`;
                })();
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setDrawerAssetId((doc as any).asset?.id)}
                  >
                    <div className={cn(
                      'h-2 w-2 rounded-full flex-shrink-0',
                      isExpired ? 'bg-destructive' : 'bg-amber-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(doc as any).asset?.name ?? 'Unknown Asset'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </p>
                    </div>
                    <p className={cn('text-xs font-medium flex-shrink-0', isExpired ? 'text-destructive' : 'text-amber-600')}>
                      {daysStr}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddAssetSheet open={showAddAsset} onOpenChange={setShowAddAsset} />
      <AssetDetailDrawer
        assetId={drawerAssetId}
        open={!!drawerAssetId}
        onOpenChange={v => !v && setDrawerAssetId(null)}
      />
      {checkoutAsset && (
        <CheckOutSheet
          asset={checkoutAsset}
          mode={checkoutMode}
          open={!!checkoutAsset}
          onOpenChange={v => !v && setCheckoutAsset(null)}
        />
      )}
    </div>
  );
}
