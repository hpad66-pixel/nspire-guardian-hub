import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, Building2, Check, CircleAlert, FileSearch2, FileText, Loader2,
  MailQuestion, RefreshCw, ShieldAlert, ShieldCheck, Sparkles, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { resolveCurrentWorkspaceId } from '@/lib/tenant';
import { projectKind } from '@/lib/projectKind';
import { validateFinancialEvidenceFile } from '@/lib/secureFinancialUpload';
import { useProjectArtifacts } from '@/hooks/useProjectArtifacts';
import { useCommitments } from '@/hooks/useCommitments';
import { useCostCodes, useDefaultLibrary } from '@/hooks/useCostCodes';
import { useOrganizations, type Organization } from '@/hooks/useDirectory';
import { useProject } from '@/hooks/useProjects';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useProjectEmails } from '@/hooks/useProjectEmails';
import {
  VendorMissingInfoRequestDialog,
  type VendorMissingInfoRequest,
} from '@/components/financial/VendorMissingInfoRequestDialog';
import { buildMissingInfoEmail } from '@/lib/financial/vendorMissingInfoRequest';

interface Fields {
  doc_type?: string;
  vendor_name?: string;
  vendor_email?: string;
  vendor_phone?: string;
  vendor_website?: string;
  vendor_address_line1?: string;
  vendor_address_line2?: string;
  vendor_city?: string;
  vendor_state?: string;
  vendor_postal_code?: string;
  bill_to?: string;
  project_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  period_end?: string;
  amount?: number;
  subtotal?: number;
  tax?: number;
  total_completed?: number;
  retainage_amount?: number;
  retainage_pct?: number;
  waiver_type?: string;
  signed_name?: string;
  payment_methods?: string[];
  missing_fields?: string[];
  line_items?: Array<{ description?: string; amount?: number; scheduled_value?: number; this_period?: number }>;
  summary?: string;
  description?: string;
}

type SavedSource = { artifactId: string; submissionId: string };
type VendorUpsertResult = { organizationId: string; name: string };
type SmallVendorInvoiceResult = { commitmentId: string; invoiceId: string; commitmentNo: string };

const DOC_LABEL: Record<string, string> = {
  invoice: 'Invoice', pay_app: 'AIA pay app', lien_waiver: 'Lien waiver',
  change_order: 'Change order', other: 'Document',
};
const toIntakeDoc = (type?: string) => type === 'lien_waiver' ? 'lien_release' : type === 'change_order' ? 'co_request' : type === 'invoice' || type === 'pay_app' ? 'invoice' : 'unknown';
const toArtifactType = (type?: string) => type === 'change_order' ? 'change_order' : type === 'invoice' || type === 'pay_app' ? 'invoice' : 'other';
const usd = (value?: number) => `$${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isoToday = () => new Date().toISOString().slice(0, 10);
const normalize = (value?: string | null) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const readBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function likelyCostDivision(description: string): string | null {
  const text = description.toLowerCase();
  if (/paint|finish|drywall|gypsum|wall repair/.test(text)) return '09';
  if (/cabinet|carpentry|wood|millwork/.test(text)) return '06';
  if (/plumb|pipe|water|sewer/.test(text)) return '22';
  if (/electric|lighting|wiring/.test(text)) return '26';
  if (/concrete/.test(text)) return '03';
  if (/masonry|block/.test(text)) return '04';
  if (/roof|waterproof/.test(text)) return '07';
  return null;
}

export function UploadParseDocument({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const artifacts = useProjectArtifacts(projectId);
  const sendEmail = useSendEmail();
  const projectEmails = useProjectEmails(projectId);
  const { isAdmin } = useUserPermissions();
  const { isSuperAdmin } = usePlatformSuperAdmin();
  const { data: project } = useProject(projectId);
  const { data: organizations = [] } = useOrganizations();
  const { data: commitments = [] } = useCommitments(projectId);
  const { data: defaultLibrary } = useDefaultLibrary();
  const { data: costCodes = [] } = useCostCodes(defaultLibrary?.id ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Fields | null>(null);
  const [vendorChoice, setVendorChoice] = useState('');
  const [commitmentId, setCommitmentId] = useState('');
  const [costCodeId, setCostCodeId] = useState('');
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [savedSource, setSavedSource] = useState<SavedSource | null>(null);
  const [adminOverride, setAdminOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const kind = project ? projectKind(project) : null;
  const isConsulting = kind === 'consulting';
  const isInvoice = fields?.doc_type === 'invoice' || fields?.doc_type === 'pay_app';
  const canAdminOverride = isAdmin || isSuperAdmin;
  const matchingVendors = useMemo(() => organizations.filter((organization) =>
    ['sub', 'vendor', 'consultant', 'other'].includes(organization.kind)), [organizations]);
  const selectedVendor = vendorChoice && vendorChoice !== 'create_new'
    ? matchingVendors.find((organization) => organization.id === vendorChoice) ?? null
    : null;
  const description = fields?.description?.trim()
    || fields?.line_items?.map((item) => item.description).filter(Boolean).join('; ')
    || fields?.summary || 'Vendor services';
  const missingFields = useMemo(() => {
    if (!fields) return [];
    const missing = new Set((fields.missing_fields ?? []).map((item) => item.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()));
    if (!fields.vendor_email) missing.add('vendor email');
    if (!fields.vendor_address_line1) missing.add('vendor address');
    if (!fields.due_date) missing.add('due date');
    missing.add('verified payment destination');
    return [...missing];
  }, [fields]);
  const accountingRoute = commitmentId || (adminOverride ? 'new_small' : '');
  const overrideFields = useMemo(() => {
    if (!fields) return [];
    const items = new Set(missingFields);
    if (!fields.vendor_name?.trim() && vendorChoice === 'create_new') items.add('vendor identity');
    if (!(Number(fields.amount) > 0)) items.add('invoice amount');
    if (!fields.invoice_number?.trim()) items.add('invoice number');
    if (!fields.invoice_date) items.add('invoice date');
    if (!isConsulting && !commitmentId) items.add('commitment route');
    if (!isConsulting && accountingRoute === 'new_small' && !costCodeId) items.add('cost code');
    return [...items];
  }, [fields, missingFields, vendorChoice, isConsulting, commitmentId, accountingRoute, costCodeId]);
  const adminOverrideReady = canAdminOverride && adminOverride && overrideReason.trim().length >= 10;
  const reviewSatisfied = reviewConfirmed || adminOverrideReady;

  useEffect(() => {
    if (!fields) return;
    const vendorName = normalize(fields.vendor_name);
    const phone = normalize(fields.vendor_phone);
    const email = String(fields.vendor_email ?? '').trim().toLowerCase();
    const exact = matchingVendors.find((organization) =>
      (vendorName && normalize(organization.name) === vendorName)
      || (phone && normalize(organization.phone) === phone)
      || (email && String(organization.email ?? '').toLowerCase() === email));
    setVendorChoice(exact?.id ?? 'create_new');
  }, [fields, matchingVendors]);

  useEffect(() => {
    if (!fields || isConsulting || commitmentId) return;
    const vendorName = normalize(fields.vendor_name);
    const match = commitments.find((commitment) => {
      const organization = matchingVendors.find((item) => item.id === commitment.vendor_org_id);
      return vendorName && (normalize(organization?.name) === vendorName || normalize(commitment.title).includes(vendorName));
    });
    setCommitmentId(match?.id ?? 'new_small');
  }, [fields, isConsulting, commitments, commitmentId, matchingVendors]);

  useEffect(() => {
    if (!fields || costCodeId || commitmentId !== 'new_small') return;
    const division = likelyCostDivision(description);
    const suggested = division ? costCodes.find((code) => code.code.startsWith(division)) : null;
    if (suggested) setCostCodeId(suggested.id);
  }, [fields, costCodes, costCodeId, commitmentId, description]);

  const reset = () => {
    setFile(null); setFields(null); setVendorChoice(''); setCommitmentId(''); setCostCodeId('');
    setReviewConfirmed(false); setSavedSource(null);
    setAdminOverride(false); setOverrideReason(''); setRequestOpen(false);
    if (fileRef.current) fileRef.current.value = '';
  };
  const set = (key: keyof Fields, value: unknown) => setFields((current) => ({ ...(current ?? {}), [key]: value }));

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;
    setFile(picked); setFields(null); setSavedSource(null); setReviewConfirmed(false); setParsing(true);
    try {
      await validateFinancialEvidenceFile(picked);
      const pdfBase64 = await readBase64(picked);
      const { data, error } = await supabase.functions.invoke('extract-document', {
        body: { pdfBase64, mediaType: picked.type, projectId },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Could not read the document');
      setFields(data.fields as Fields);
      toast.success('Invoice read. Review the highlighted fields before creating anything.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Document reading failed');
      reset();
    } finally {
      setParsing(false);
    }
  }

  async function ensureVendor(): Promise<{ id: string; name: string }> {
    if (!fields) throw new Error('Upload and review the invoice first.');
    const sourceName = file?.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'uploaded invoice';
    const vendorName = fields.vendor_name?.trim()
      || (adminOverrideReady ? `Vendor pending identification — ${sourceName}` : null);
    const { data, error } = await supabase.rpc('upsert_project_vendor_from_invoice', {
      p_project_id: projectId,
      p_existing_organization_id: selectedVendor?.id ?? null,
      p_name: vendorName,
      p_kind: isConsulting ? 'consultant' : 'vendor',
      p_email: fields.vendor_email?.trim() || null,
      p_phone: fields.vendor_phone?.trim() || null,
      p_website: fields.vendor_website?.trim() || null,
      p_address_line1: fields.vendor_address_line1?.trim() || null,
      p_address_line2: fields.vendor_address_line2?.trim() || null,
      p_city: fields.vendor_city?.trim() || null,
      p_state: fields.vendor_state?.trim() || null,
      p_postal_code: fields.vendor_postal_code?.trim() || null,
      p_country: 'US',
    });
    if (error) throw error;
    const result = data as unknown as VendorUpsertResult;
    return { id: result.organizationId, name: result.name };
  }

  async function attach(): Promise<SavedSource> {
    if (savedSource) return savedSource;
    if (!file || !fields) throw new Error('Upload and review the invoice first.');
    const tenantId = await resolveCurrentWorkspaceId();
    const artifact = await artifacts.upload.mutateAsync({
      file, projectId,
      input: {
        artifact_type: toArtifactType(fields.doc_type), source_system: 'manual',
        title: `${fields.vendor_name || file.name.replace(/\.[^.]+$/, '')}${fields.invoice_number ? ` - invoice ${fields.invoice_number}` : ''}`,
        description: fields.summary || 'Vendor invoice uploaded for AI-assisted administrator review',
        period_date: fields.invoice_date || fields.period_end || isoToday(),
        reference_no: fields.invoice_number || undefined,
        amount: Number(fields.amount || 0),
        tags: ['vendor-invoice', 'ai-extracted', 'admin-reviewed'],
      },
    });
    const { data: submission, error } = await supabase.from('vendor_submissions').insert({
      tenant_id: tenantId,
      project_id: projectId,
      source: 'manual_upload',
      doc_type: toIntakeDoc(fields.doc_type),
      status: 'parsed',
      artifact_id: artifact.id,
      subject: `${fields.vendor_name || file.name}${fields.invoice_number ? ` - ${fields.invoice_number}` : ''}`,
      parsed: fields as unknown as Json,
    }).select('id').single();
    if (error) throw error;
    const source = { artifactId: artifact.id, submissionId: submission.id };
    setSavedSource(source);
    return source;
  }

  async function persistAdminException(submissionId: string) {
    const { error } = await supabase.from('vendor_submissions')
      .update({
        admin_override: adminOverrideReady,
        admin_override_reason: adminOverrideReady ? overrideReason.trim() : null,
        admin_override_fields: adminOverrideReady ? overrideFields : [],
      })
      .eq('id', submissionId)
      .eq('project_id', projectId);
    if (error) throw error;
  }

  async function syncVendorToCrm(vendorId: string) {
    const { data, error } = await supabase.functions.invoke('crm-integration-gateway', {
      body: { operation: 'sync_vendor', projectId, organizationId: vendorId },
    });
    if (error || !data?.ok) throw new Error(data?.message || error?.message || 'CRM synchronization is queued for retry');
  }

  async function processInvoice() {
    if (!fields || !file || !isInvoice) return;
    if (!reviewSatisfied) return toast.error('Confirm your review, or document an administrator exception.');
    if (adminOverride && !adminOverrideReady) return toast.error('Explain the administrator exception in at least 10 characters.');
    if (vendorChoice === 'create_new' && !fields.vendor_name?.trim() && !adminOverrideReady) return toast.error('Confirm the vendor name.');
    if (Number(fields.amount) < 0) return toast.error('An invoice amount cannot be negative.');
    if (!(Number(fields.amount) > 0) && !adminOverrideReady) return toast.error('Confirm an invoice amount greater than zero.');
    if (!isConsulting && !accountingRoute) return toast.error('Choose an existing commitment or the small-vendor path.');
    if (!isConsulting && accountingRoute === 'new_small' && !costCodeId && !adminOverrideReady) return toast.error('Choose the cost code for the small-vendor commitment.');
    setSaving(true);
    try {
      const vendor = await ensureVendor();
      const source = await attach();
      await persistAdminException(source.submissionId);
      let destination = '';
      if (isConsulting) {
        const { data: costId, error } = await supabase.rpc('create_consulting_invoice_from_submission', {
          p_submission_id: source.submissionId,
          p_vendor_organization_id: vendor.id,
          p_reference_no: fields.invoice_number || null,
          p_bill_date: fields.invoice_date || isoToday(),
          p_due_date: fields.due_date || null,
          p_amount: Number(fields.amount),
          p_description: description,
          p_cost_type: 'subcontractor',
        });
        if (error) throw error;
        destination = String(costId);
      } else if (accountingRoute === 'new_small') {
        const { data, error } = await supabase.rpc('create_small_vendor_invoice_from_submission' as never, {
          p_submission_id: source.submissionId,
          p_vendor_organization_id: vendor.id,
          p_cost_code_id: costCodeId || null,
          p_invoice_no: fields.invoice_number || null,
          p_period_end: fields.period_end || fields.invoice_date || isoToday(),
          p_amount: Number(fields.amount),
          p_description: description,
        } as never);
        if (error) throw error;
        destination = (data as unknown as SmallVendorInvoiceResult).commitmentId;
      } else {
        const { data: invoiceId, error } = await supabase.rpc('process_vendor_submission_invoice', {
          p_submission_id: source.submissionId,
          p_commitment_id: accountingRoute,
          p_invoice_no: fields.invoice_number || null,
          p_period_end: fields.period_end || fields.invoice_date || isoToday(),
          p_submitted_amount: Number(fields.amount),
          p_retainage_held: Number(fields.retainage_amount || 0),
        });
        if (error) throw error;
        destination = String(invoiceId);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
        queryClient.invalidateQueries({ queryKey: ['commitments', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['consulting-costs', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-submissions', projectId] }),
      ]);
      try {
        await syncVendorToCrm(vendor.id);
        toast.success(`${vendor.name} and invoice ${fields.invoice_number || ''} are linked in ProjOS and synchronized to APAS CRM.`);
      } catch (error) {
        toast.warning(`Invoice created. APAS CRM needs attention: ${error instanceof Error ? error.message : 'synchronization failed safely'}`);
      }
      const route = isConsulting
        ? `/projects/${projectId}/financials/costs`
        : accountingRoute === 'new_small'
          ? `/projects/${projectId}/financials/commitments/${destination}`
          : `/projects/${projectId}/financials/commitments/${accountingRoute}`;
      reset();
      navigate(route);
    } catch (error) {
      toast.error((error instanceof Error ? error.message : 'Could not process invoice').replace(/^[A-Z_]+:\s*/, ''));
    } finally {
      setSaving(false);
    }
  }

  async function saveForLater() {
    if (!fields || !file) return;
    if (!reviewSatisfied) return toast.error('Confirm your review, or document an administrator exception.');
    setSaving(true);
    try {
      const vendor = await ensureVendor();
      const source = await attach();
      await persistAdminException(source.submissionId);
      try { await syncVendorToCrm(vendor.id); } catch { /* sync status is retained for follow-up */ }
      await queryClient.invalidateQueries({ queryKey: ['vendor-submissions', projectId] });
      toast.success('Vendor confirmed and source invoice saved in the project inbox.');
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save invoice');
    } finally {
      setSaving(false);
    }
  }

  async function requestMissingInformation(request: VendorMissingInfoRequest) {
    if (!fields || !file) return;
    setRequesting(true);
    try {
      const source = await attach();
      const email = buildMissingInfoEmail({
        vendorName: fields.vendor_name || selectedVendor?.name,
        projectName: project?.name || 'Project',
        invoiceNumber: fields.invoice_number,
        sourceFileName: file.name,
        requirementIds: request.requirementIds,
        customRequirements: request.customRequirements,
        dueDate: request.dueDate,
        message: request.message,
      });
      await sendEmail.mutateAsync({
        recipients: [request.recipientEmail],
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        bodyText: email.bodyText,
      });

      const auditFailures: string[] = [];
      try {
        const { error } = await supabase.from('vendor_submissions')
          .update({
            status: 'needs_review',
            missing_info_requested_at: new Date().toISOString(),
            missing_info_requested_to: request.recipientEmail,
            missing_info_requirements: email.requirements,
          })
          .eq('id', source.submissionId)
          .eq('project_id', projectId);
        if (error) throw error;
      } catch {
        auditFailures.push('invoice follow-up');
      }
      try {
        await projectEmails.create.mutateAsync({
          direction: 'outbound',
          status: 'sent',
          channel: 'resend',
          subject: email.subject,
          to_emails: [request.recipientEmail],
          body_html: email.bodyHtml,
          body_text: email.bodyText,
          snippet: `Requested ${email.requirements.join(', ')}`.slice(0, 200),
          letter_meta: {
            category: 'vendor_invoice_missing_information',
            vendor: fields.vendor_name || selectedVendor?.name || 'Vendor',
            invoice: fields.invoice_number || file.name,
            submissionId: source.submissionId,
          },
        });
      } catch {
        auditFailures.push('project correspondence');
      }
      await queryClient.invalidateQueries({ queryKey: ['vendor-submissions', projectId] });
      if (auditFailures.length) toast.warning(`Email sent, but ${auditFailures.join(' and ')} logging needs attention.`);
      else toast.success('Branded request sent and recorded in project correspondence.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the vendor request');
      throw error;
    } finally {
      setRequesting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b bg-gradient-to-r from-[var(--apas-sapphire)]/10 via-background to-emerald-50 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[var(--apas-sapphire)] p-2 text-white"><Sparkles className="h-5 w-5" /></div>
            <div><h3 className="font-semibold">AI invoice intake</h3><p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">Start with the contractor PDF. ProjOS reads it, helps match or create the vendor, and routes it into the correct A/P workflow.</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-700" />Human approval required</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Step number="1" label="Upload PDF" active={!fields} complete={!!fields} />
          <Step number="2" label="Review extraction" active={!!fields && !reviewConfirmed} complete={reviewConfirmed} />
          <Step number="3" label="Create & route" active={reviewConfirmed} complete={false} />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
        {!fields && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={parsing}
            className="flex min-h-36 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition hover:border-[var(--apas-sapphire)]/60 hover:bg-[var(--apas-sapphire)]/5 disabled:opacity-60">
            {parsing ? <Loader2 className="mb-3 h-7 w-7 animate-spin text-[var(--apas-sapphire)]" /> : <Upload className="mb-3 h-7 w-7 text-[var(--apas-sapphire)]" />}
            <span className="font-semibold">{parsing ? `Reading ${file?.name ?? 'document'}...` : 'Choose invoice PDF or photo'}</span>
            <span className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG, or WebP - maximum 12 MB</span>
          </button>
        )}

        {fields && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[var(--apas-sapphire)]/10 px-2.5 py-1 font-semibold text-[var(--apas-sapphire)]">{DOC_LABEL[fields.doc_type || 'other'] || 'Document'}</span>
              <FileText className="h-4 w-4 text-muted-foreground" /><span className="max-w-[320px] truncate text-muted-foreground">{file?.name}</span>
              <Button size="sm" variant="ghost" className="ml-auto h-8" onClick={() => fileRef.current?.click()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Replace</Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-4 rounded-xl border p-4">
                <div className="flex items-center gap-2"><FileSearch2 className="h-4 w-4 text-[var(--apas-sapphire)]" /><h4 className="text-sm font-semibold">Invoice fields</h4><span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Editable before processing</span></div>
                {fields.summary && <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{fields.summary}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Document type"><Select value={fields.doc_type || 'other'} onValueChange={(value) => set('doc_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="pay_app">AIA pay app</SelectItem><SelectItem value="lien_waiver">Lien waiver</SelectItem><SelectItem value="change_order">Change order</SelectItem><SelectItem value="other">Other document</SelectItem></SelectContent></Select></Field>
                  <Field label="Invoice number"><Input value={fields.invoice_number ?? ''} onChange={(event) => set('invoice_number', event.target.value)} /></Field>
                  <Field label="Invoice date"><Input type="date" value={fields.invoice_date ?? ''} onChange={(event) => set('invoice_date', event.target.value)} /></Field>
                  <Field label="Total due"><Input type="number" min="0" step="0.01" value={fields.amount ?? ''} onChange={(event) => set('amount', Number(event.target.value) || 0)} /></Field>
                  <Field label="Due date (if confirmed)"><Input type="date" value={fields.due_date ?? ''} onChange={(event) => set('due_date', event.target.value)} /></Field>
                  <Field label="Project reference"><Input value={fields.project_name ?? ''} onChange={(event) => set('project_name', event.target.value)} /></Field>
                </div>
                <Field label="Description"><Textarea rows={3} value={description} onChange={(event) => set('description', event.target.value)} /></Field>
                {!!fields.line_items?.length && <p className="text-xs text-muted-foreground">{fields.line_items.length} line item(s) captured - {usd(fields.amount)} total.</p>}
              </div>

              <div className="space-y-4 rounded-xl border p-4">
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[var(--apas-sapphire)]" /><h4 className="text-sm font-semibold">Vendor match</h4></div>
                <Field label="Use existing vendor or create one">
                  <Select value={vendorChoice} onValueChange={setVendorChoice}>
                    <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_new">+ Create from this invoice</SelectItem>
                      {matchingVendors.map((vendor) => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                {vendorChoice === 'create_new' ? <div className="grid grid-cols-2 gap-3">
                  <Field label="Vendor name"><Input value={fields.vendor_name ?? ''} onChange={(event) => set('vendor_name', event.target.value)} /></Field>
                  <Field label="Phone"><Input value={fields.vendor_phone ?? ''} onChange={(event) => set('vendor_phone', event.target.value)} /></Field>
                  <Field label="Email"><Input type="email" value={fields.vendor_email ?? ''} onChange={(event) => set('vendor_email', event.target.value)} /></Field>
                  <Field label="Website"><Input value={fields.vendor_website ?? ''} onChange={(event) => set('vendor_website', event.target.value)} /></Field>
                  <div className="col-span-2"><Field label="Address"><Input value={fields.vendor_address_line1 ?? ''} onChange={(event) => set('vendor_address_line1', event.target.value)} /></Field></div>
                </div> : selectedVendor ? <VendorSummary vendor={selectedVendor} /> : null}
                <p className="text-xs text-muted-foreground">The confirmed company is added to the project vendor list and synchronized to the APAS CRM master contact/company workspace.</p>
              </div>
            </div>

            {missingFields.length > 0 && <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0 flex-1"><p className="font-semibold">Information still needed</p><p className="mt-0.5 text-xs">Not shown or not verified in the PDF: {missingFields.join(', ')}.</p><p className="mt-1 text-xs text-amber-800">Request the missing items from the vendor, or use the documented administrator exception below to keep the draft moving.</p></div><Button type="button" size="sm" variant="outline" className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100" onClick={() => setRequestOpen(true)}><MailQuestion className="mr-1.5 h-4 w-4" />Request from vendor</Button></div>}

            {isInvoice && !isConsulting && <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2"><ArrowRight className="h-4 w-4 text-[var(--apas-sapphire)]" /><h4 className="text-sm font-semibold">Construction accounting route</h4></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Commitment">
                  <Select value={commitmentId} onValueChange={setCommitmentId}>
                    <SelectTrigger><SelectValue placeholder="Choose route" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_small">Create small-vendor purchase commitment</SelectItem>
                      {commitments.map((commitment) => <SelectItem key={commitment.id} value={commitment.id}>{commitment.title} - {commitment.commitment_no}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                {commitmentId === 'new_small' && <Field label="Cost code">
                  <Select value={costCodeId} onValueChange={setCostCodeId}>
                    <SelectTrigger><SelectValue placeholder="Choose cost code" /></SelectTrigger>
                    <SelectContent>{costCodes.map((code) => <SelectItem key={code.id} value={code.id}>{code.code} - {code.description}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>}
              </div>
              {commitmentId === 'new_small' && <p className="mt-2 text-xs text-muted-foreground">Creates a draft purchase commitment, one SOV line, and one draft invoice. Contractor readiness and commitment execution remain required before approval or payment.</p>}
            </div>}

            {canAdminOverride && <div className={`rounded-xl border p-4 transition ${adminOverride ? 'border-[var(--apas-sapphire)]/40 bg-[var(--apas-sapphire)]/5' : 'bg-muted/10'}`}>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={adminOverride} onCheckedChange={(value) => setAdminOverride(value === true)} className="mt-0.5" />
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4 text-[var(--apas-sapphire)]" />Process as an administrator exception</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Allows an authorized administrator to create a clearly flagged draft when intake information or routing is incomplete. It does not approve the invoice, waive contractor readiness, or initiate payment.</span></span>
              </label>
              {adminOverride && <div className="mt-4 space-y-2 border-t pt-4">
                <Field label="Override reason *"><Textarea rows={3} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Explain why processing must continue and what remains to be verified" /></Field>
                <p className={`text-xs ${overrideReason.trim().length >= 10 ? 'text-emerald-700' : 'text-amber-700'}`}>{overrideReason.trim().length >= 10 ? 'Reason ready — it will be stored in the audit trail.' : 'Enter at least 10 characters so the exception is accountable and auditable.'}</p>
                {overrideFields.length > 0 && <div className="flex flex-wrap gap-1.5">{overrideFields.map((item) => <span key={item} className="rounded-full border border-[var(--apas-sapphire)]/20 bg-white px-2 py-1 text-[10px] font-medium text-[var(--apas-sapphire)]">Override: {item}</span>)}</div>}
              </div>}
            </div>}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/15 p-3">
              <Checkbox checked={reviewConfirmed} onCheckedChange={(value) => setReviewConfirmed(value === true)} className="mt-0.5" />
              <span><span className="block text-sm font-semibold">I reviewed the PDF against these fields</span><span className="mt-0.5 block text-xs text-muted-foreground">AI assisted with transcription only. I confirm the vendor, invoice number, date, description, and total before ProjOS creates accounting records.</span></span>
            </label>

            <div className="flex flex-wrap gap-2">
              {isInvoice && <Button onClick={processInvoice} disabled={saving || !reviewSatisfied}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {adminOverrideReady ? 'Process as admin exception' : isConsulting ? 'Create vendor A/P draft' : 'Create project invoice draft'}
              </Button>}
              <Button variant="outline" onClick={saveForLater} disabled={saving || !reviewSatisfied}>Save to inbox for later</Button>
              <Button variant="outline" onClick={() => setRequestOpen(true)} disabled={saving}><MailQuestion className="mr-1.5 h-4 w-4" />Request information</Button>
              <Button variant="ghost" onClick={reset} disabled={saving}><X className="mr-1.5 h-4 w-4" />Discard</Button>
            </div>
          </div>
        )}
      </div>
      {fields && <VendorMissingInfoRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        vendorName={fields.vendor_name || selectedVendor?.name}
        defaultEmail={fields.vendor_email || selectedVendor?.email || undefined}
        projectName={project?.name || 'Project'}
        invoiceNumber={fields.invoice_number}
        missingFields={missingFields}
        sending={requesting || sendEmail.isPending}
        onSend={requestMissingInformation}
      />}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</Label>{children}</div>;
}

function Step({ number, label, active, complete }: { number: string; label: string; active: boolean; complete: boolean }) {
  return <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${complete ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : active ? 'border-[var(--apas-sapphire)]/30 bg-white text-foreground' : 'bg-white/50 text-muted-foreground'}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${complete ? 'bg-emerald-600 text-white' : active ? 'bg-[var(--apas-sapphire)] text-white' : 'bg-muted'}`}>{complete ? <Check className="h-3 w-3" /> : number}</span><span className="truncate font-medium">{label}</span></div>;
}

function VendorSummary({ vendor }: { vendor: Organization }) {
  return <div className="rounded-lg bg-muted/30 p-3 text-sm"><p className="font-semibold">{vendor.name}</p><p className="mt-1 text-xs text-muted-foreground">{[vendor.email, vendor.phone].filter(Boolean).join(' - ') || 'No contact details on file'}</p>{vendor.apas_crm_sync_status === 'synced' && <p className="mt-2 text-xs font-semibold text-emerald-700">Connected to APAS CRM</p>}</div>;
}
