import { useState } from 'react';
import { useEffect } from 'react';
import { ChevronLeft, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  CREDENTIAL_CATEGORIES,
  useAddCredential,
  useUploadCredentialDocument,
  type AddCredentialInput,
} from '@/hooks/useCredentials';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';

interface AddCredentialSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledHolderId?: string;
  workspaceId: string;
}

type Step = 1 | 2 | 3;

const CATEGORY_ICONS: Record<string, string> = {
  professional_license: '📋',
  safety_certification: '🦺',
  insurance: '🛡️',
  vehicle_equipment: '🚗',
  other: '➕',
};

export function AddCredentialSheet({
  open,
  onOpenChange,
  prefilledHolderId,
  workspaceId,
}: AddCredentialSheetProps) {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const addCredential = useAddCredential();

  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');

  const [form, setForm] = useState({
    issuing_authority: '',
    credential_number: '',
    issue_date: '',
    expiry_date: '',
    renewal_url: '',
    notes: '',
  });

  const [createdCredentialId, setCreatedCredentialId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadDoc = useUploadCredentialDocument(createdCredentialId || '');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setSelectedCategory(null);
        setSelectedType(null);
        setCustomLabel('');
        setForm({ issuing_authority: '', credential_number: '', issue_date: '', expiry_date: '', renewal_url: '', notes: '' });
        setCreatedCredentialId(null);
        setSelectedFile(null);
      }, 300);
    }
  }, [open]);

  const currentCategory = CREDENTIAL_CATEGORIES.find(c => c.key === selectedCategory);
  const credentialTypeLabel = selectedType === 'Custom' ? customLabel : selectedType;

  // Step 1 — select type
  const handleSelectType = (type: string) => {
    setSelectedType(type);
    if (type !== 'Custom') {
      setStep(2);
    }
  };

  // Step 2 → Step 3: save the credential and go to upload
  const handleSaveAndNext = async () => {
    if (!credentialTypeLabel) return;
    const holderId = prefilledHolderId || user?.id;
    if (!holderId) return;

    const credential = await addCredential.mutateAsync({
      workspace_id: workspaceId,
      credential_type: selectedType === 'Custom' ? 'Custom' : selectedType!,
      custom_type_label: selectedType === 'Custom' ? customLabel : null,
      issuing_authority: form.issuing_authority || undefined,
      credential_number: form.credential_number || undefined,
      issue_date: form.issue_date || undefined,
      expiry_date: form.expiry_date || undefined,
      renewal_url: form.renewal_url || undefined,
      notes: form.notes || undefined,
      holder_id: holderId,
    } as AddCredentialInput & { workspace_id: string });

    setCreatedCredentialId(credential.id);
    setStep(3);
  };

  // Step 3 — upload
  const handleUpload = async () => {
    if (!selectedFile || !createdCredentialId) return;
    await uploadDoc.upload({ file: selectedFile, workspaceId });
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">

        {/* Header */}
        <div className="flex-shrink-0 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1"
                onClick={() => setStep(s => (s - 1) as Step)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetTitle className="text-base font-semibold">
              {step === 1 && 'What type of credential?'}
              {step === 2 && 'Tell us about it'}
              {step === 3 && 'Got a copy of the document?'}
            </SheetTitle>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Step {step} of 3</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1 ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {!selectedCategory ? (
                <div className="grid grid-cols-1 gap-2">
                  {CREDENTIAL_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="font-medium text-foreground">{cat.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back to categories
                  </button>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{currentCategory?.icon}</span>
                    <span className="font-semibold text-foreground">{currentCategory?.label}</span>
                  </div>

                  <div className="space-y-1.5">
                    {currentCategory?.types.map(type => (
                      <button
                        key={type}
                        onClick={() => handleSelectType(type)}
                        className={cn(
                          'flex w-full items-center rounded-lg border px-4 py-3 text-sm text-left transition-all',
                          'hover:border-primary/40 hover:bg-primary/5',
                          selectedType === type && 'border-primary bg-primary/10 font-medium'
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {selectedType === 'Custom' && (
                    <div className="mt-3 space-y-1.5">
                      <Label>Your credential name</Label>
                      <Input
                        value={customLabel}
                        onChange={e => setCustomLabel(e.target.value)}
                        placeholder="e.g. Pest Control License"
                        autoFocus
                      />
                      <Button
                        className="w-full mt-2"
                        disabled={!customLabel.trim()}
                        onClick={() => setStep(2)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium text-foreground">
                {credentialTypeLabel}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cred_number">Credential / License Number</Label>
                  <Input
                    id="cred_number"
                    value={form.credential_number}
                    onChange={e => setForm(f => ({ ...f, credential_number: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issuing_auth">Issuing Authority</Label>
                  <Input
                    id="issuing_auth"
                    value={form.issuing_authority}
                    onChange={e => setForm(f => ({ ...f, issuing_authority: e.target.value }))}
                    placeholder="e.g. State Licensing Board"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issue_date">Issue Date</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={form.issue_date}
                    onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="expiry_date" className="text-foreground font-semibold">
                      When does it expire?
                    </Label>
                    <span className="text-[11px] text-primary">We'll remind you before it expires</span>
                  </div>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={form.expiry_date}
                    onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="renewal_url">Renewal Portal Link</Label>
                  <Input
                    id="renewal_url"
                    type="url"
                    value={form.renewal_url}
                    onChange={e => setForm(f => ({ ...f, renewal_url: e.target.value }))}
                    placeholder="https://..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    One tap to renew when the time comes
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional notes..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Upload zone */}
              <label
                htmlFor="doc_upload"
                className={cn(
                  'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
                  selectedFile
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-border hover:border-primary/40 hover:bg-primary/5'
                )}
              >
                {selectedFile ? (
                  <>
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <div className="text-center">
                      <p className="font-medium text-sm text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      onClick={e => { e.preventDefault(); setSelectedFile(null); }}
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-sm text-foreground">
                        Tap to upload your certificate or scan
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, JPG, PNG, WebP · max 10MB
                      </p>
                    </div>
                  </>
                )}
                <input
                  id="doc_upload"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                />
              </label>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Optional but recommended — you can share it directly from here later
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t px-6 py-4 space-y-2">
          {step === 2 && (
            <Button
              className="w-full"
              onClick={handleSaveAndNext}
              disabled={!credentialTypeLabel || addCredential.isPending}
            >
              {addCredential.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
              ) : 'Next'}
            </Button>
          )}

          {step === 3 && (
            <>
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={!selectedFile || uploadDoc.isUploading}
              >
                {uploadDoc.isUploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                ) : 'Save'}
              </Button>
              <button
                onClick={handleSkip}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
