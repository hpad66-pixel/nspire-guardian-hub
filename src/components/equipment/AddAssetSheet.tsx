import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  useActivatedCategories, useAssetCount, useAddAsset, getDocumentTypes,
  DOCUMENT_TYPE_LABELS, EquipmentAsset,
} from '@/hooks/useEquipment';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { icons as lucideIcons } from 'lucide-react';
import { Box, Camera, ChevronRight, X, Check } from 'lucide-react';
import { format } from 'date-fns';

function CategoryIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = (lucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  if (!Icon) return <Box className={className} />;
  return <Icon className={className} />;
}

interface DocForm {
  document_type: string;
  document_number: string;
  expiry_date: string;
  issuing_authority: string;
  notes: string;
  custom_type_label: string;
}

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

interface AddAssetSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddAssetSheet({ open, onOpenChange }: AddAssetSheetProps) {
  const { user } = useAuth();
  const { categories } = useActivatedCategories();
  const { data: assetCountData } = useAssetCount();
  const addAsset = useAddAsset();
  const { data: profiles = [] } = useProfiles();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    category_slug: categories[0]?.slug ?? '',
    make: '',
    model: '',
    year: '',
    serial_number: '',
    vin: '',
    license_plate: '',
    asset_tag: '',
    color: '',
    condition: 'good' as const,
    assigned_to: '',
    assigned_location: '',
    notes: '',
    photo_url: '',
  });
  const [activeDocs, setActiveDocs] = useState<Set<string>>(new Set());
  const [docForms, setDocForms] = useState<Record<string, DocForm>>({});

  const isVehicle = form.category_slug === 'vehicles';
  const atLimit = assetCountData && assetCountData.count >= assetCountData.limit;
  const docTypes = getDocumentTypes(form.category_slug);

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const toggleDoc = (type: string) => {
    setActiveDocs(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
        const newForms = { ...docForms };
        delete newForms[type];
        setDocForms(newForms);
      } else {
        next.add(type);
        setDocForms(f => ({
          ...f,
          [type]: { document_type: type, document_number: '', expiry_date: '', issuing_authority: '', notes: '', custom_type_label: '' },
        }));
      }
      return next;
    });
  };

  const updateDocForm = (type: string, field: keyof DocForm, val: string) => {
    setDocForms(f => ({ ...f, [type]: { ...f[type], [field]: val } }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category_slug) return;
    const docs = Array.from(activeDocs).map(type => ({
      document_type: type,
      custom_type_label: docForms[type]?.custom_type_label || null,
      document_number: docForms[type]?.document_number || null,
      expiry_date: docForms[type]?.expiry_date || null,
      issuing_authority: docForms[type]?.issuing_authority || null,
      notes: docForms[type]?.notes || null,
      workspace_id: '', // filled in hook
      status: 'active' as const,
    }));

    await addAsset.mutateAsync({
      asset: {
        name: form.name,
        category_slug: form.category_slug,
        make: form.make || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year) : null,
        serial_number: form.serial_number || null,
        vin: form.vin || null,
        license_plate: form.license_plate || null,
        asset_tag: form.asset_tag || null,
        color: form.color || null,
        condition: form.condition,
        assigned_to: form.assigned_to || null,
        assigned_location: form.assigned_location || null,
        notes: form.notes || null,
        photo_url: form.photo_url || null,
        status: 'available',
        is_active: true,
      },
      documents: docs,
    });
    onOpenChange(false);
    setStep(1);
    setForm({
      name: '', category_slug: categories[0]?.slug ?? '', make: '', model: '',
      year: '', serial_number: '', vin: '', license_plate: '', asset_tag: '',
      color: '', condition: 'good', assigned_to: '', assigned_location: '', notes: '', photo_url: '',
    });
    setActiveDocs(new Set());
    setDocForms({});
  };

  if (atLimit) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Asset Limit Reached</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Box className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                You've reached your {assetCountData?.limit} asset limit
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade your plan to add more equipment.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 pt-2">
          {[1, 2].map(s => (
            <div key={s} className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted'
            )} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">Step {step} of 2</span>
        </div>

        {step === 1 && (
          <>
            <SheetHeader>
              <SheetTitle>Add Equipment</SheetTitle>
              <SheetDescription>Basic details — you can always add more later</SheetDescription>
            </SheetHeader>
            <div className="space-y-5 mt-6">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setField('name', e.target.value.slice(0, 80))}
                  placeholder="F-150 #3, Generator A, Bobcat SN44..."
                />
                <p className="text-xs text-muted-foreground">Give it a name your team will recognize</p>
              </div>

              {/* Category */}
              {categories.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.slug}
                        onClick={() => setField('category_slug', cat.slug)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                          form.category_slug === cat.slug
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                        )}
                      >
                        <CategoryIcon iconName={cat.icon} className="h-3.5 w-3.5" />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Make / Model / Year */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Make</Label>
                  <Input value={form.make} onChange={e => setField('make', e.target.value)} placeholder="Ford" />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input value={form.model} onChange={e => setField('model', e.target.value)} placeholder="F-150" />
                </div>
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Input value={form.year} onChange={e => setField('year', e.target.value)} placeholder="2021" type="number" />
                </div>
              </div>

              {/* VIN / Serial */}
              <div className="space-y-1.5">
                <Label>{isVehicle ? 'VIN Number' : 'Serial Number'}</Label>
                <Input
                  value={isVehicle ? form.vin : form.serial_number}
                  onChange={e => isVehicle ? setField('vin', e.target.value) : setField('serial_number', e.target.value)}
                  placeholder={isVehicle ? '1HGBH41JXMN109186' : 'SN-12345'}
                />
              </div>

              {/* License plate — vehicles only */}
              {isVehicle && (
                <div className="space-y-1.5">
                  <Label>License Plate</Label>
                  <Input value={form.license_plate} onChange={e => setField('license_plate', e.target.value)} placeholder="ABC-1234" />
                </div>
              )}

              {/* Asset Tag */}
              <div className="space-y-1.5">
                <Label>Asset Tag</Label>
                <Input value={form.asset_tag} onChange={e => setField('asset_tag', e.target.value)} placeholder="TAG-001" />
                <p className="text-xs text-muted-foreground">Your internal ID or tag number</p>
              </div>

              {/* Condition */}
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {CONDITIONS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setField('condition', c.value)}
                      className={cn(
                        'flex-1 py-2 text-xs font-medium transition-colors',
                        form.condition === c.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned To */}
              <div className="space-y-1.5">
                <Label>Assigned To</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.assigned_to}
                  onChange={e => setField('assigned_to', e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {profiles.map(p => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.full_name ?? p.email ?? p.user_id}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Primary operator or responsible person</p>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={form.assigned_location} onChange={e => setField('assigned_location', e.target.value)} placeholder="Main yard, Site A, Warehouse..." />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} placeholder="Any additional details..." />
              </div>

              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!form.name.trim()}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SheetHeader>
              <SheetTitle>Any documents to track?</SheetTitle>
              <SheetDescription>
                Add expiry dates and we'll alert you before they lapse. Skip if you want to add these later.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              {/* Doc type chips */}
              <div className="flex flex-wrap gap-2">
                {docTypes.map(type => {
                  const isActive = activeDocs.has(type);
                  const label = DOCUMENT_TYPE_LABELS[type] ?? type;
                  return (
                    <button
                      key={type}
                      onClick={() => toggleDoc(type)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      {isActive && <Check className="h-3.5 w-3.5" />}
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Expanded doc forms */}
              {Array.from(activeDocs).map(type => {
                const df = docForms[type];
                const label = DOCUMENT_TYPE_LABELS[type] ?? type;
                return (
                  <div key={type} className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <button onClick={() => toggleDoc(type)}>
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                    {type === 'other' && (
                      <div className="space-y-1.5">
                        <Label>Document Name</Label>
                        <Input
                          value={df?.custom_type_label ?? ''}
                          onChange={e => updateDocForm(type, 'custom_type_label', e.target.value)}
                          placeholder="e.g. Operator Certification"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Document Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input
                        value={df?.document_number ?? ''}
                        onChange={e => updateDocForm(type, 'document_number', e.target.value)}
                        placeholder="DOC-12345"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        value={df?.expiry_date ?? ''}
                        onChange={e => updateDocForm(type, 'expiry_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Issuing Authority <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Input
                        value={df?.issuing_authority ?? ''}
                        onChange={e => updateDocForm(type, 'issuing_authority', e.target.value)}
                        placeholder="DMV, OSHA, etc."
                      />
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={addAsset.isPending}
                >
                  {addAsset.isPending ? 'Saving...' : 'Save Asset'}
                </Button>
                <button
                  onClick={handleSave}
                  disabled={addAsset.isPending}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center underline underline-offset-4"
                >
                  Skip — add documents later
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
