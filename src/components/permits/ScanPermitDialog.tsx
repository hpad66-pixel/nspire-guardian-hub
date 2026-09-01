import { useRef, useState } from 'react';
import { Camera, FileUp, Loader2, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractPermitFromFile, type PermitOcrFields } from '@/lib/permits/extractPermit';
import type { PreparedPermitScan } from '@/lib/permits/preparePermitScan';
import { uploadPermitScanFile, usePermitScans } from '@/hooks/usePermitScans';
import { useProjectPermits } from '@/hooks/useProjectPermits';
import { useCreatePermit, useUpdatePermit } from '@/hooks/usePermits';
import { useUploadOrganizationDocument } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';

type Scope = 'project' | 'property';

export interface ScanPermitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: Scope;
  projectId?: string | null;
  propertyId?: string | null;
  clientId?: string | null;
  /** Prefill property list for property-scope creates */
  properties?: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: 'open_active', label: 'Open / Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'expired', label: 'Expired' },
  { value: 'on_hold', label: 'On hold' },
];

export function ScanPermitDialog({
  open,
  onOpenChange,
  scope,
  projectId,
  propertyId: initialPropertyId,
  clientId,
  properties = [],
}: ScanPermitDialogProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'capture' | 'review'>('capture');
  const [busy, setBusy] = useState<'ocr' | 'save' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedPermitScan | null>(null);
  const [fields, setFields] = useState<PermitOcrFields | null>(null);
  const [notation, setNotation] = useState('');
  const [saveAsDocument, setSaveAsDocument] = useState(true);
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? properties[0]?.id ?? '');

  const projectPermits = useProjectPermits(projectId);
  const createPropertyPermit = useCreatePermit();
  const updatePropertyPermit = useUpdatePermit();
  const scans = usePermitScans({ projectId, propertyId: scope === 'property' ? propertyId : null });
  const uploadDoc = useUploadOrganizationDocument();

  function reset() {
    setStep('capture');
    setBusy(null);
    setPreview(null);
    setPrepared(null);
    setFields(null);
    setNotation('');
    setSaveAsDocument(true);
  }

  async function runOcr(file: File) {
    setBusy('ocr');
    try {
      const result = await extractPermitFromFile(file, {
        notationHint: notation,
        projectId: projectId ?? null,
      });
      setPrepared(result.prepared);
      setPreview(result.prepared.dataUrl);
      setFields(result.fields);
      setStep('review');
      toast.success('Permit scanned — review the fields');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'OCR failed');
    } finally {
      setBusy(null);
      if (cameraRef.current) cameraRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!prepared || !fields) return;
    if (scope === 'project' && !projectId) {
      toast.error('Open a project to save this scan');
      return;
    }
    if (scope === 'property' && !propertyId) {
      toast.error('Choose a property');
      return;
    }

    setBusy('save');
    try {
      const { photoUrl, photoPath } = await uploadPermitScanFile(
        prepared.blob,
        prepared.fileName,
        scope === 'project' ? `project/${projectId}` : `property/${propertyId}`,
      );

      let documentId: string | null = null;
      if (saveAsDocument) {
        const file = new File([prepared.blob], prepared.fileName, { type: prepared.mediaType });
        const doc = await uploadDoc.mutateAsync({
          file,
          folder: 'Permits',
          name: fields.permit_number
            ? `Permit ${fields.permit_number}`
            : prepared.fileName,
          description: notation || fields.description || undefined,
          tags: ['permit-scan', scope],
        });
        documentId = doc.id;
      }

      const permitNumber = fields.permit_number || `SCAN-${Date.now().toString().slice(-6)}`;
      const description = fields.description || notation || 'Scanned permit';
      const status =
        fields.status_guess && fields.status_guess !== 'unknown'
          ? fields.status_guess
          : 'open_active';

      let projectPermitId: string | null = null;
      let propertyPermitId: string | null = null;

      if (scope === 'project' && projectId) {
        const created = await projectPermits.create.mutateAsync({
          permit_number: permitNumber,
          description,
          issued_on: fields.issued_on || null,
          department: fields.department || fields.issuing_authority || null,
          building: fields.building || null,
          street_address: fields.street_address || null,
          trade: fields.trade || null,
          contractor: fields.contractor || null,
          status: status as 'open_active',
          notes: notation || null,
          client_visible: true,
          photo_url: photoUrl,
          photo_path: photoPath,
          notation: notation || null,
          document_id: documentId,
          ocr_extracted: fields as unknown as Record<string, unknown>,
          scanned_at: new Date().toISOString(),
        });
        projectPermitId = created.id;
      } else if (scope === 'property' && propertyId) {
        const created = await createPropertyPermit.mutateAsync({
          property_id: propertyId,
          permit_type: 'building_permit',
          name: description.slice(0, 120),
          permit_number: permitNumber,
          description,
          issuing_authority: fields.issuing_authority || fields.department || null,
          issue_date: fields.issued_on || null,
          expiry_date: fields.expires_on || null,
          status: status === 'closed' ? 'active' : status === 'expired' ? 'expired' : 'active',
          notes: notation || null,
          document_id: documentId,
        } as never);
        propertyPermitId = (created as { id: string }).id;
        await updatePropertyPermit.mutateAsync({
          id: propertyPermitId,
          photo_url: photoUrl,
          photo_path: photoPath,
          notation: notation || null,
          ocr_extracted: fields,
          scanned_at: new Date().toISOString(),
        } as never);
      }

      await scans.create.mutateAsync({
        project_id: projectId ?? null,
        property_id: scope === 'property' ? propertyId : null,
        client_id: clientId ?? null,
        project_permit_id: projectPermitId,
        property_permit_id: propertyPermitId,
        document_id: documentId,
        photo_url: photoUrl,
        photo_path: photoPath,
        mime_type: prepared.mediaType,
        notation: notation || null,
        ocr_extracted: fields as unknown as Record<string, unknown>,
        ocr_raw_text: fields.raw_text_summary || null,
        permit_number: permitNumber,
        description,
        department: fields.department || null,
        trade: fields.trade || null,
        contractor: fields.contractor || null,
        building: fields.building || null,
        street_address: fields.street_address || null,
        issued_on: fields.issued_on || null,
        status,
      });

      toast.success(saveAsDocument ? 'Permit saved + uploaded to Documents' : 'Permit saved');
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save permit scan');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Camera className="h-5 w-5 text-[var(--apas-sapphire)]" />
            Scan permit
          </DialogTitle>
          <DialogDescription>
            Snap or upload a permit card. We prep it on your device, run AI OCR on the edge, then you
            add a notation and save — optionally into Documents.
          </DialogDescription>
        </DialogHeader>

        {step === 'capture' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy === 'ocr'}
                onClick={() => cameraRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--apas-sapphire)]/40 bg-[var(--apas-sapphire)]/5 px-3 py-8 transition hover:bg-[var(--apas-sapphire)]/10',
                  busy === 'ocr' && 'opacity-60',
                )}
              >
                {busy === 'ocr' ? (
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--apas-sapphire)]" />
                ) : (
                  <Camera className="h-7 w-7 text-[var(--apas-sapphire)]" />
                )}
                <span className="text-sm font-semibold">Camera</span>
                <span className="text-[11px] text-muted-foreground text-center">Phone rear camera</span>
              </button>
              <button
                type="button"
                disabled={busy === 'ocr'}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-3 py-8 transition hover:bg-muted/50"
              >
                <Upload className="h-7 w-7 text-foreground/70" />
                <span className="text-sm font-semibold">Upload</span>
                <span className="text-[11px] text-muted-foreground text-center">Photo or PDF</span>
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scan-notation-early">Notation (optional before scan)</Label>
              <Textarea
                id="scan-notation-early"
                value={notation}
                onChange={(e) => setNotation(e.target.value)}
                placeholder="e.g. Building 5 plumbing — pending Public Works signoff"
                rows={2}
              />
            </div>

            {scope === 'property' && properties.length > 0 && (
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runOcr(f);
              }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runOcr(f);
              }}
            />
          </div>
        )}

        {step === 'review' && fields && (
          <div className="space-y-4">
            {preview && (
              <div className="overflow-hidden rounded-xl border bg-muted/20">
                {prepared?.mediaType === 'application/pdf' ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <FileUp className="h-4 w-4" /> PDF ready — fields extracted below
                  </div>
                ) : (
                  <img src={preview} alt="Permit scan preview" className="max-h-48 w-full object-contain bg-black/5" />
                )}
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <Sparkles className="h-3 w-3" />
              AI OCR · confidence {Math.round((fields.confidence || 0) * 100)}%
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Permit #" value={fields.permit_number} onChange={(v) => setFields({ ...fields, permit_number: v })} />
              <Field label="Trade" value={fields.trade} onChange={(v) => setFields({ ...fields, trade: v })} />
              <Field label="Department" value={fields.department} onChange={(v) => setFields({ ...fields, department: v })} className="sm:col-span-2" />
              <Field label="Description" value={fields.description} onChange={(v) => setFields({ ...fields, description: v })} className="sm:col-span-2" />
              <Field label="Contractor" value={fields.contractor} onChange={(v) => setFields({ ...fields, contractor: v })} />
              <Field label="Building" value={fields.building} onChange={(v) => setFields({ ...fields, building: v })} />
              <Field label="Address" value={fields.street_address} onChange={(v) => setFields({ ...fields, street_address: v })} className="sm:col-span-2" />
              <Field label="Issued" value={fields.issued_on} onChange={(v) => setFields({ ...fields, issued_on: v })} />
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={fields.status_guess === 'unknown' ? 'open_active' : fields.status_guess}
                  onValueChange={(v) => setFields({ ...fields, status_guess: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scan-notation">Notation</Label>
              <Textarea
                id="scan-notation"
                value={notation}
                onChange={(e) => setNotation(e.target.value)}
                placeholder="Add a short field note under the tile…"
                rows={3}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveAsDocument}
                onChange={(e) => setSaveAsDocument(e.target.checked)}
                className="rounded border-border"
              />
              Also upload to Documents → Permits folder
            </label>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'review' && (
            <Button type="button" variant="outline" disabled={!!busy} onClick={() => setStep('capture')}>
              Rescan
            </Button>
          )}
          {step === 'review' && (
            <Button type="button" disabled={busy === 'save'} onClick={() => void handleSave()}>
              {busy === 'save' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save permit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
