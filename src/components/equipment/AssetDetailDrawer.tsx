import { useState } from 'react';
import { EquipmentAsset, EquipmentDocument, useActivatedCategories, useAsset, useAddDocument, useDeleteDocument, useRetireAsset, useCheckOut, useCheckIn, getAssetComplianceStatus, getDocumentTypes, DOCUMENT_TYPE_LABELS } from '@/hooks/useEquipment';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AssetStatusBadge, ComplianceDot } from './AssetStatusBadge';
import { DocumentExpiryCard } from './DocumentExpiryCard';
import { CheckOutSheet } from './CheckOutSheet';
import { cn } from '@/lib/utils';
import { icons as lucideIcons } from 'lucide-react';
import {
  Box, FileText, Clock, X, Plus, AlertTriangle, Pencil,
  Archive, MapPin, User, Tag, Hash, Calendar
} from 'lucide-react';
import { format, parseISO, isPast, formatDistanceStrict } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserPermissions } from '@/hooks/usePermissions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (lucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!Icon) return <Box className={className} />;
  return <Icon className={className} />;
}

interface AssetDetailDrawerProps {
  assetId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AssetDetailDrawer({ assetId, open, onOpenChange }: AssetDetailDrawerProps) {
  const { data: asset, isLoading } = useAsset(assetId);
  const { categories } = useActivatedCategories();
  const { currentRole } = useUserPermissions();
  const addDocument = useAddDocument();
  const deleteDocument = useDeleteDocument();
  const retireAsset = useRetireAsset();

  const [showCheckOut, setShowCheckOut] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    document_type: 'insurance',
    custom_type_label: '',
    document_number: '',
    expiry_date: '',
    issuing_authority: '',
    notes: '',
  });

  const isManager = ['admin', 'owner', 'manager'].includes(currentRole ?? '');
  const isAdmin = currentRole === 'admin' || currentRole === 'owner';

  if (!open) return null;

  const cat = categories.find(c => c.slug === asset?.category_slug);
  const docs = (asset?.documents ?? []).filter(d => d.status === 'active');
  const complianceStatus = getAssetComplianceStatus(docs);
  const activeCheckout = (asset as any)?.active_checkout || (asset as any)?.checkouts?.find((c: any) => c.is_active);
  const checkoutHistory = (asset as any)?.checkouts?.filter((c: any) => !c.is_active) ?? [];
  const isOverdue = activeCheckout?.expected_return
    ? isPast(parseISO(activeCheckout.expected_return + 'T23:59:59'))
    : false;

  const handleAddDoc = async () => {
    if (!asset) return;
    const wsId = asset.workspace_id;
    await addDocument.mutateAsync({
      asset_id: asset.id,
      workspace_id: wsId,
      document_type: docForm.document_type,
      custom_type_label: docForm.custom_type_label || null,
      document_number: docForm.document_number || null,
      issue_date: null,
      expiry_date: docForm.expiry_date || null,
      document_url: null,
      issuing_authority: docForm.issuing_authority || null,
      notes: docForm.notes || null,
      status: 'active',
    });
    setShowAddDoc(false);
    setDocForm({ document_type: 'insurance', custom_type_label: '', document_number: '', expiry_date: '', issuing_authority: '', notes: '' });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0" side="right">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : asset ? (
            <>
              {/* Header */}
              <div className="border-b border-border p-6 pt-8">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl',
                    complianceStatus === 'expired' ? 'bg-destructive/10 text-destructive'
                      : complianceStatus === 'expiring_soon' ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-primary/10 text-primary'
                  )}>
                    <CategoryIcon iconName={cat?.icon ?? 'Box'} className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h2 className="text-lg font-bold text-foreground leading-tight">{asset.name}</h2>
                      <ComplianceDot status={complianceStatus} className="mt-1.5 flex-shrink-0" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {cat && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          <CategoryIcon iconName={cat.icon} className="h-3 w-3" />
                          {cat.name}
                        </span>
                      )}
                      <AssetStatusBadge status={asset.status} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="details" className="flex-1">
                <TabsList className="w-full rounded-none border-b border-border bg-transparent h-11 px-6">
                  <TabsTrigger value="details" className="flex-1 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Details
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Documents
                    {docs.length > 0 && <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">{docs.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                    <Clock className="mr-1.5 h-3.5 w-3.5" /> History
                  </TabsTrigger>
                </TabsList>

                {/* DETAILS TAB */}
                <TabsContent value="details" className="p-6 mt-0">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {[
                      { label: 'Make', value: asset.make },
                      { label: 'Model', value: asset.model },
                      { label: 'Year', value: asset.year },
                      { label: 'Asset Tag', value: asset.asset_tag },
                      { label: asset.category_slug === 'vehicles' ? 'VIN' : 'Serial Number', value: asset.vin || asset.serial_number },
                      asset.category_slug === 'vehicles' ? { label: 'License Plate', value: asset.license_plate } : null,
                      { label: 'Condition', value: asset.condition ? asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1) : null },
                      { label: 'Location', value: asset.assigned_location },
                    ].filter(Boolean).map(item => item && item.value ? (
                      <div key={item.label}>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{String(item.value)}</p>
                      </div>
                    ) : null)}
                    {asset.assigned_profile && (
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Assigned To</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={asset.assigned_profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {asset.assigned_profile?.full_name?.charAt(0) ?? 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground">{asset.assigned_profile?.full_name}</span>
                        </div>
                      </div>
                    )}
                    {asset.notes && (
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Notes</p>
                        <p className="text-sm text-foreground mt-0.5">{asset.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-8 space-y-2">
                    {asset.status === 'available' && (
                      <Button className="w-full" onClick={() => setShowCheckOut(true)}>
                        Check Out
                      </Button>
                    )}
                    {asset.status === 'checked_out' && isManager && (
                      <Button className="w-full" variant="outline" onClick={() => setShowCheckOut(true)}>
                        Mark as Returned
                      </Button>
                    )}
                    {isAdmin && asset.status !== 'retired' && (
                      <Button
                        variant="ghost"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowRetireDialog(true)}
                      >
                        <Archive className="mr-2 h-4 w-4" /> Retire Asset
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* DOCUMENTS TAB */}
                <TabsContent value="documents" className="p-6 mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Documents</h3>
                    {isManager && (
                      <Button size="sm" variant="outline" onClick={() => setShowAddDoc(v => !v)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Document
                      </Button>
                    )}
                  </div>

                  {showAddDoc && (
                    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">New Document</p>
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={docForm.document_type}
                          onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))}
                        >
                          {getDocumentTypes(asset.category_slug).map(t => (
                            <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t] ?? t}</option>
                          ))}
                        </select>
                      </div>
                      {docForm.document_type === 'other' && (
                        <div className="space-y-1.5">
                          <Label>Custom Name</Label>
                          <Input value={docForm.custom_type_label} onChange={e => setDocForm(f => ({ ...f, custom_type_label: e.target.value }))} />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Doc Number</Label>
                          <Input value={docForm.document_number} onChange={e => setDocForm(f => ({ ...f, document_number: e.target.value }))} placeholder="Optional" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Expiry Date</Label>
                          <Input type="date" value={docForm.expiry_date} onChange={e => setDocForm(f => ({ ...f, expiry_date: e.target.value }))} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Issuing Authority</Label>
                        <Input value={docForm.issuing_authority} onChange={e => setDocForm(f => ({ ...f, issuing_authority: e.target.value }))} placeholder="Optional" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAddDoc} disabled={addDocument.isPending}>
                          {addDocument.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No documents tracked yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add registration, insurance, or inspection records and we'll remind you before they expire.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {docs.map(doc => (
                        <DocumentExpiryCard
                          key={doc.id}
                          doc={doc}
                          onDelete={isManager ? (d) => deleteDocument.mutate(d.id) : undefined}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* HISTORY TAB */}
                <TabsContent value="history" className="p-6 mt-0">
                  {/* Currently checked out banner */}
                  {activeCheckout && (
                    <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-destructive">🔴 Currently checked out</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeCheckout.checked_out_profile?.full_name ?? 'Someone'} · Since {format(parseISO(activeCheckout.checked_out_at), 'MMM d, yyyy')}
                          </p>
                          {activeCheckout.expected_return && (
                            <p className={cn('text-xs mt-0.5 font-medium', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                              Expected back: {format(parseISO(activeCheckout.expected_return), 'MMM d, yyyy')}
                              {isOverdue && ' — OVERDUE'}
                            </p>
                          )}
                        </div>
                        {isManager && (
                          <Button size="sm" variant="outline" onClick={() => setShowCheckOut(true)}>
                            Return
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {checkoutHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No check-out history yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use the Check Out button to log who has this equipment.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {checkoutHistory.map((co: any) => {
                        const duration = co.checked_in_at
                          ? formatDistanceStrict(parseISO(co.checked_out_at), parseISO(co.checked_in_at))
                          : null;
                        return (
                          <div key={co.id} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={co.checked_out_profile?.avatar_url ?? undefined} />
                                <AvatarFallback className="text-xs">
                                  {co.checked_out_profile?.full_name?.charAt(0) ?? 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {co.checked_out_profile?.full_name ?? 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(parseISO(co.checked_out_at), 'MMM d')}
                                  {co.checked_in_at ? ` → ${format(parseISO(co.checked_in_at), 'MMM d')}` : ' → Not returned'}
                                  {duration && ` · ${duration}`}
                                </p>
                                {co.purpose && <p className="text-xs text-muted-foreground">{co.purpose}</p>}
                              </div>
                              {co.condition_on_return && co.condition_on_return !== 'same' && (
                                <span className={cn(
                                  'text-xs rounded-full px-2 py-0.5 font-medium flex-shrink-0',
                                  co.condition_on_return === 'damaged'
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-amber-500/10 text-amber-600'
                                )}>
                                  {co.condition_on_return === 'damaged' ? 'Damaged' : 'Minor issue'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Checkout/Return sheet */}
      {asset && (
        <CheckOutSheet
          asset={asset as EquipmentAsset}
          mode={asset.status === 'checked_out' ? 'checkin' : 'checkout'}
          open={showCheckOut}
          onOpenChange={setShowCheckOut}
        />
      )}

      {/* Retire dialog */}
      <AlertDialog open={showRetireDialog} onOpenChange={setShowRetireDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire {asset?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be hidden from active inventory but all records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { retireAsset.mutate(asset!.id); setShowRetireDialog(false); onOpenChange(false); }}
            >
              Retire Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
