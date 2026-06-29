import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Upload, Loader2, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { resolveCurrentWorkspaceId } from '@/lib/tenant';
import { useProjectArtifacts } from '@/hooks/useProjectArtifacts';
import { useCommitments } from '@/hooks/useCommitments';
import { useQueryClient } from '@tanstack/react-query';

interface Fields {
  doc_type?: string; vendor_name?: string; bill_to?: string; project_name?: string;
  invoice_number?: string; invoice_date?: string; period_end?: string;
  amount?: number; total_completed?: number; retainage_amount?: number; retainage_pct?: number;
  waiver_type?: string; signed_name?: string; line_items?: any[]; summary?: string;
}

const DOC_LABEL: Record<string, string> = { invoice: 'Invoice', pay_app: 'AIA pay app', lien_waiver: 'Lien waiver', change_order: 'Change order', other: 'Document' };
// vendor_submissions.doc_type allows: invoice | lien_release | co_request | unknown
const toIntakeDoc = (t?: string) => t === 'lien_waiver' ? 'lien_release' : t === 'change_order' ? 'co_request' : t === 'invoice' || t === 'pay_app' ? 'invoice' : 'unknown';
// project_artifacts.artifact_type union (no lien_release) → use a valid member.
const toArtifactType = (t?: string) => t === 'change_order' ? 'change_order' : t === 'invoice' || t === 'pay_app' ? 'invoice' : t === 'lien_waiver' ? 'other' : 'other';
const usd = (n?: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const readBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
  r.onerror = reject;
  r.readAsDataURL(file);
});

export function UploadParseDocument({ projectId }: { projectId: string }) {
  const { upload } = useProjectArtifacts(projectId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Fields | null>(null);
  const [commitmentId, setCommitmentId] = useState('');
  const { data: commitments = [] } = useCommitments(projectId);
  const qc = useQueryClient();
  const isInvoice = fields?.doc_type === 'invoice' || fields?.doc_type === 'pay_app';
  const isWaiver = fields?.doc_type === 'lien_waiver';
  const RELEASE_TYPES = ['conditional_progress', 'unconditional_progress', 'conditional_final', 'unconditional_final'];

  const reset = () => { setFile(null); setFields(null); setCommitmentId(''); if (fileRef.current) fileRef.current.value = ''; };
  const set = (k: keyof Fields, v: any) => setFields(f => ({ ...(f ?? {}), [k]: v }));

  // Upload the file as a project artifact and file a parsed intake row.
  async function attach(tenant_id: string, commitment_invoice_id?: string) {
    const docType = toIntakeDoc(fields!.doc_type);
    const art = await upload.mutateAsync({
      file: file!, projectId,
      input: { artifact_type: toArtifactType(fields!.doc_type), source_system: 'manual', title: fields!.vendor_name || file!.name.replace(/\.[^.]+$/, '') } as any,
    });
    const { error } = await supabase.from('vendor_submissions' as any).insert({
      tenant_id, project_id: projectId, source: 'manual_upload',
      doc_type: docType, status: commitment_invoice_id ? 'processed' : 'parsed', artifact_id: (art as any).id,
      subject: fields!.vendor_name ? `${fields!.vendor_name}${fields!.invoice_number ? ` · ${fields!.invoice_number}` : ''}` : file!.name,
      parsed: { ...fields, commitment_invoice_id: commitment_invoice_id ?? null },
    } as any);
    if (error) throw error;
    return (art as any).id as string;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setFields(null); setParsing(true);
    try {
      const pdfBase64 = await readBase64(f);
      const { data, error } = await supabase.functions.invoke('extract-document', { body: { pdfBase64, mediaType: f.type } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Could not read the document');
      setFields(data.fields as Fields);
      toast.success('Parsed — review the fields, then attach.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Parse failed'); reset();
    } finally { setParsing(false); }
  }

  async function save() {
    if (!file || !fields) return;
    setSaving(true);
    try {
      await attach(await resolveCurrentWorkspaceId());
      toast.success('Attached & parsed — it’s in the Vendor Inbox.');
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    } finally { setSaving(false); }
  }

  // One-click: attach the file AND create a draft commitment invoice from the parse.
  async function createInvoice() {
    if (!file || !fields) return;
    if (!commitmentId) return toast.error('Pick the commitment this invoice bills against.');
    setSaving(true);
    try {
      const tenant_id = await resolveCurrentWorkspaceId();
      const { data: inv, error } = await supabase.from('commitment_invoices' as any).insert({
        tenant_id, commitment_id: commitmentId,
        invoice_no: fields.invoice_number || `DOC-${file.name.slice(0, 6)}`,
        period_end: fields.period_end || fields.invoice_date || new Date().toISOString().slice(0, 10),
        status: 'draft',
        submitted_amount: Number(fields.amount ?? 0),
        retainage_held: Number(fields.retainage_amount ?? 0),
      } as any).select('id').single();
      if (error) throw error;
      await attach(tenant_id, (inv as any).id);
      qc.invalidateQueries({ queryKey: ['commitment-invoices'] });
      toast.success('Draft invoice created in Commitments + document attached.');
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create invoice');
    } finally { setSaving(false); }
  }

  // One-click: attach the signed waiver AND record it as a received lien release.
  async function createLien() {
    if (!file || !fields) return;
    setSaving(true);
    try {
      const tenant_id = await resolveCurrentWorkspaceId();
      const artId = await attach(tenant_id);
      const releaseType = RELEASE_TYPES.includes(fields.waiver_type || '') ? fields.waiver_type : 'conditional_progress';
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('lien_releases' as any).insert({
        tenant_id, project_id: projectId, direction: 'inbound', release_type: releaseType,
        status: 'submitted', amount: Number(fields.amount ?? 0),
        through_date: fields.period_end || fields.invoice_date || null,
        claimant_name: fields.vendor_name || null, artifact_id: artId,
        title: `Received ${String(releaseType).replace(/_/g, ' ')} waiver`,
        created_by: user?.id ?? null,
      } as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['lien-releases', projectId] });
      toast.success('Recorded as a received lien release + document attached.');
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not record waiver');
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" />
        <h3 className="text-[15px] font-semibold">Upload &amp; parse a document</h3>
      </div>
      <p className="mt-0.5 text-[12px] text-muted-foreground">Drop a client/vendor invoice, AIA pay app, or lien waiver (PDF or image). AI reads it, you review, and it’s attached to this project.</p>

      <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onPick} />

      {!fields && (
        <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => fileRef.current?.click()} disabled={parsing}>
          {parsing ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading {file?.name}…</> : <><Upload className="h-4 w-4" /> Choose a file</>}
        </Button>
      )}

      {fields && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="rounded-full bg-[var(--apas-sapphire)]/10 px-2 py-0.5 font-semibold text-[var(--apas-sapphire)]">{DOC_LABEL[fields.doc_type || 'other'] || 'Document'}</span>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate text-muted-foreground">{file?.name}</span>
          </div>
          {fields.summary && <p className="rounded-lg bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground">{fields.summary}</p>}
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Vendor / claimant"><Input value={fields.vendor_name ?? ''} onChange={e => set('vendor_name', e.target.value)} /></Field>
            <Field label="Invoice / app #"><Input value={fields.invoice_number ?? ''} onChange={e => set('invoice_number', e.target.value)} /></Field>
            <Field label="Amount"><Input value={fields.amount ?? ''} onChange={e => set('amount', Number(e.target.value) || 0)} /></Field>
            <Field label="Date"><Input value={fields.invoice_date ?? ''} onChange={e => set('invoice_date', e.target.value)} placeholder="yyyy-mm-dd" /></Field>
            {fields.doc_type === 'lien_waiver'
              ? <Field label="Waiver type"><Input value={fields.waiver_type ?? ''} onChange={e => set('waiver_type', e.target.value)} /></Field>
              : <Field label="Period end"><Input value={fields.period_end ?? ''} onChange={e => set('period_end', e.target.value)} placeholder="yyyy-mm-dd" /></Field>}
            {fields.retainage_amount ? <Field label="Retainage"><Input value={fields.retainage_amount ?? ''} onChange={e => set('retainage_amount', Number(e.target.value) || 0)} /></Field> : <div />}
          </div>
          {!!fields.line_items?.length && <p className="text-[11px] text-muted-foreground">{fields.line_items.length} line item(s) captured · {usd(fields.amount)} total.</p>}
          {isInvoice && (
            <div className="rounded-lg border border-dashed border-border p-2.5">
              <Label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Bill against commitment (to create a draft invoice)</Label>
              <Select value={commitmentId} onValueChange={setCommitmentId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select a commitment…" /></SelectTrigger>
                <SelectContent>{commitments.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}{c.commitment_no ? ` · ${c.commitment_no}` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {isInvoice && <Button size="sm" className="gap-1.5" onClick={createInvoice} disabled={saving || !commitmentId}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Create draft invoice</Button>}
            {isWaiver && <Button size="sm" className="gap-1.5" onClick={createLien} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} File as lien release</Button>}
            <Button size="sm" variant={isInvoice || isWaiver ? 'outline' : 'default'} className="gap-1.5" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Attach &amp; save</Button>
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={reset} disabled={saving}><X className="h-4 w-4" /> Discard</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</Label>{children}</div>;
}
