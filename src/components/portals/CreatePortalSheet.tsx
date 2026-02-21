import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreatePortal, generateSlug, checkSlugAvailability } from '@/hooks/usePortal';
import { useModules } from '@/contexts/ModuleContext';
import { Users, Construction, Check, X, ArrowLeft, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface CreatePortalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  { label: 'Navy', value: '#0F172A' },
  { label: 'Slate', value: '#475569' },
  { label: 'Blue', value: '#2563EB' },
  { label: 'Green', value: '#16A34A' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Red', value: '#DC2626' },
];

const MODULES = [
  { key: 'credentials', label: 'Credentials & Licenses', icon: '🏆', desc: 'Share active credentials and their expiry status', moduleFlag: 'credentialWalletEnabled' as const },
  { key: 'training', label: 'Training Records', icon: '🎓', desc: 'Share completed training and certifications', moduleFlag: 'trainingHubEnabled' as const },
  { key: 'safety', label: 'Safety Records', icon: '⚠️', desc: 'Share incident log and OSHA records', moduleFlag: 'safetyModuleEnabled' as const },
  { key: 'equipment', label: 'Equipment & Fleet', icon: '🚛', desc: 'Share equipment registry and document status', moduleFlag: 'equipmentTrackerEnabled' as const },
];

export function CreatePortalSheet({ open, onOpenChange }: CreatePortalSheetProps) {
  const navigate = useNavigate();
  const { isModuleEnabled } = useModules();
  const createPortal = useCreatePortal();

  const [step, setStep] = useState(1);

  // Step 1
  const [portalType, setPortalType] = useState<'client' | 'project'>('client');
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const debouncedSlug = useDebounce(slug, 400);

  // Step 2
  const [accentColor, setAccentColor] = useState('#0F172A');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Step 3
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !slug) setSlug(generateSlug(name));
  }, [name]);

  // Check slug availability
  useEffect(() => {
    if (!debouncedSlug || debouncedSlug.length < 3) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    checkSlugAvailability(debouncedSlug).then(available => {
      setSlugAvailable(available);
      setCheckingSlug(false);
    });
  }, [debouncedSlug]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `tmp/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('portal-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('portal-assets').getPublicUrl(path);
      setLogoUrl(publicUrl);
    } catch {
      // ignore upload errors
    } finally {
      setUploading(false);
    }
  }

  function toggleModule(key: string) {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function handleCreate() {
    await createPortal.mutateAsync({
      name,
      portal_type: portalType,
      client_name: clientName || undefined,
      client_contact_name: contactName || undefined,
      client_contact_email: contactEmail || undefined,
      brand_accent_color: accentColor,
      welcome_message: welcomeMessage || undefined,
      portal_slug: slug,
      shared_modules: selectedModules,
    });
    onOpenChange(false);
    // Navigate to portals dashboard after creation
  }

  function reset() {
    setStep(1);
    setPortalType('client');
    setName(''); setClientName(''); setContactName(''); setContactEmail('');
    setSlug(''); setSlugAvailable(null);
    setAccentColor('#0F172A'); setWelcomeMessage(''); setLogoUrl('');
    setSelectedModules([]);
  }

  const step1Valid = name.trim().length > 0 && slug.length >= 3 && slugAvailable === true;
  const step3Valid = selectedModules.length > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3 mb-1">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <SheetTitle>
              {step === 1 ? 'Create a Client Portal' : step === 2 ? 'Make it yours' : 'What will your client see?'}
            </SheetTitle>
          </div>
          {/* Progress */}
          <div className="flex gap-1.5 mt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', s <= step ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Step {step} of 3</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              {/* Portal type */}
              <div className="space-y-2">
                <Label>Portal Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'client' as const, icon: <Users className="h-6 w-6" />, title: 'Client Portal', desc: 'One portal for a client org. Share all their relevant compliance data.' },
                    { type: 'project' as const, icon: <Construction className="h-6 w-6" />, title: 'Project Portal', desc: 'Tied to a specific project or property. Show only relevant data for that scope.' },
                  ].map(({ type, icon, title, desc }) => (
                    <button
                      key={type}
                      onClick={() => setPortalType(type)}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                        portalType === type ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                      )}
                    >
                      <div className={cn('text-muted-foreground', portalType === type && 'text-primary')}>{icon}</div>
                      <div>
                        <p className="font-semibold text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Portal name */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-name">Portal Name *</Label>
                <Input
                  id="portal-name"
                  value={name}
                  onChange={e => { setName(e.target.value); if (!slug || slug === generateSlug(name)) setSlug(generateSlug(e.target.value)); }}
                  placeholder={portalType === 'client' ? 'Riverside GC Compliance Portal' : '123 Main St — Owner Portal'}
                />
              </div>

              {/* Client-specific fields */}
              {portalType === 'client' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="client-name">Client Organization Name *</Label>
                    <Input id="client-name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Riverside Construction Inc." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">Contact Name</Label>
                      <Input id="contact-name" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Smith" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email">Contact Email</Label>
                      <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jane@riverside.com" />
                    </div>
                  </div>
                </>
              )}
              {portalType === 'project' && (
                <div className="space-y-1.5">
                  <Label htmlFor="contact-email-proj">Client Contact Email</Label>
                  <Input id="contact-email-proj" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="owner@example.com" />
                </div>
              )}

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="portal-slug">Your portal link</Label>
                <div className="flex items-center rounded-md border border-input bg-muted/40 overflow-hidden">
                  <span className="px-3 py-2 text-xs text-muted-foreground border-r border-input bg-muted select-none whitespace-nowrap">
                    apasos.ai/portal/
                  </span>
                  <Input
                    id="portal-slug"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="border-0 bg-transparent rounded-none focus-visible:ring-0"
                    placeholder="my-portal"
                  />
                  <span className="px-2 flex-shrink-0">
                    {checkingSlug && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {!checkingSlug && slugAvailable === true && <Check className="h-3.5 w-3.5 text-green-500" />}
                    {!checkingSlug && slugAvailable === false && <X className="h-3.5 w-3.5 text-destructive" />}
                  </span>
                </div>
                {slugAvailable === false && (
                  <p className="text-xs text-destructive">This URL is already taken. Try a different one.</p>
                )}
              </div>

              <Button onClick={() => setStep(2)} disabled={!step1Valid} className="w-full">
                Next →
              </Button>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              {/* Live preview */}
              <div
                className="rounded-xl border border-border p-4 space-y-2"
                style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Preview</p>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" className="h-8 object-contain" />
                  ) : (
                    <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: accentColor }}>
                      {(clientName || name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm text-foreground">{name || 'Portal Name'}</p>
                    <p className="text-xs text-muted-foreground">{clientName || 'Client Organization'}</p>
                  </div>
                </div>
                {welcomeMessage && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">{welcomeMessage}</p>
                )}
              </div>

              {/* Logo upload */}
              <div className="space-y-1.5">
                <Label>Company Logo</Label>
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-colors">
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo preview" className="h-12 object-contain" />
                  ) : (
                    <>
                      {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                      <p className="text-sm text-muted-foreground">Click to upload logo</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Max 2MB</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>

              {/* Accent color */}
              <div className="space-y-2">
                <Label>Brand Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setAccentColor(c.value)}
                      title={c.label}
                      className={cn('h-7 w-7 rounded-full border-2 transition-all', accentColor === c.value ? 'border-foreground scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="h-7 w-7 rounded-full border-2 border-border cursor-pointer"
                    title="Custom color"
                  />
                </div>
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="#0F172A" className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">Used for buttons and highlights in your portal</p>
              </div>

              {/* Welcome message */}
              <div className="space-y-1.5">
                <Label htmlFor="welcome">Welcome Message</Label>
                <Textarea
                  id="welcome"
                  value={welcomeMessage}
                  onChange={e => { if (e.target.value.length <= 500) setWelcomeMessage(e.target.value); }}
                  placeholder="Welcome to our compliance portal. Here you'll find up-to-date records, certifications, and documents for your review."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">{welcomeMessage.length} / 500</p>
              </div>

              <Button onClick={() => setStep(3)} className="w-full">Next →</Button>
            </>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Select the modules to share. You can exclude specific records after the portal is created.</p>

              <div className="space-y-3">
                {MODULES.map(m => {
                  if (!isModuleEnabled(m.moduleFlag)) return null;
                  const enabled = selectedModules.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleModule(m.key)}
                      className={cn(
                        'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                        enabled ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                      )}
                    >
                      <span className="text-2xl flex-shrink-0">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                      <Switch checked={enabled} onCheckedChange={() => toggleModule(m.key)} />
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Want to hide specific records within a module? You can manage exclusions after the portal is created.
              </p>

              <Button
                onClick={handleCreate}
                disabled={!step3Valid || createPortal.isPending}
                className="w-full"
              >
                {createPortal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {contactEmail ? 'Create & Send Invite' : 'Create Portal'}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
