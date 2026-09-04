import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertTriangle, Building2, Check, CheckCircle2, ChevronRight, Circle,
  ClipboardCheck, FileQuestion, FileUp, Handshake, HelpCircle, Loader2,
  LockKeyhole, MessageSquare, Save, Send, ShieldCheck, Sparkles, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ReadinessBadge } from '@/components/contractors/ReadinessBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  RESPONSE_TYPE_COPY, contractorRequirementProgress, isAcknowledgement,
  isRequirementComplete, responseType, supportsDocumentUpload, supportsWrittenResponse,
} from '@/lib/contractors/requirements';

type PortalData = any;

async function portalCall(token: string, action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('contractor-portal', { body: { token, action, ...body } });
  if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Request failed');
  return data;
}

export default function ContractorOnboardingPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actorName, setActorName] = useState('');
  const [company, setCompany] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    try {
      const next = await portalCall(token, 'view');
      setData(next); setCompany(next.organization ?? {}); setProfile(next.profile ?? {}); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'This secure link is unavailable'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const requirements = (data?.requirements ?? []);
  const documents = useMemo(() => new Map((data?.documents ?? []).map((d: any) => [d.id, d])), [data?.documents]);
  const checklist = contractorRequirementProgress(requirements);

  const saveCompany = async () => {
    setSaving(true);
    try {
      await portalCall(token, 'update_company', {
        actorName,
        organization: company,
        profile: {
          ...profile,
          trade_categories: String(profile.trade_categories ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          service_areas: String(profile.service_areas ?? '').split(',').map((s) => s.trim()).filter(Boolean),
        },
      });
      toast.success('Company profile saved'); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setSaving(false); }
  };
  const submit = async () => {
    setSubmitting(true);
    try { await portalCall(token, 'submit', { actorName }); toast.success('Qualification package submitted'); await load(); }
    catch (e: any) { toast.error(e?.message ?? 'Could not submit'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed]"><Loader2 className="h-7 w-7 animate-spin text-emerald-800" /></div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] px-5"><Card className="max-w-md"><CardContent className="p-8 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-amber-600" /><h1 className="mt-4 text-xl font-bold">This secure link is not available</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><p className="mt-4 text-xs text-muted-foreground">Contact APAS Project Controls for a new link.</p></CardContent></Card></div>;

  const locked = data.qualification.status === 'under_review';
  const broker = data.access?.role === 'broker';
  return (
    <div className="min-h-screen bg-[#f5f3ed] pb-20 text-[#15332b]">
      <header className="bg-gradient-to-br from-[#092d25] via-[#12483a] to-[#1b6650] px-4 py-7 text-white shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f1d58a]">APAS Project Controls</div><h1 className="mt-1 text-xl font-bold sm:text-2xl">Contractor Community</h1><p className="mt-1 text-xs text-white/75">{data.project?.name ?? data.client?.name ?? 'Company qualification'}</p></div><div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">Secure · no password</div></div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 pt-5">
        <Card className="overflow-hidden border-0 shadow-lg"><div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-[#d2ad50]" /><CardContent className="p-5 sm:p-7"><div className="grid gap-6 sm:grid-cols-[1fr_220px] sm:items-center"><div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-emerald-700"><Sparkles className="h-4 w-4" />Welcome</div><h2 className="mt-2 text-2xl font-bold sm:text-3xl">We’re glad you’re here, {data.organization?.name}.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">We are building a trusted community of quality contractors who care about safe work, clear communication, and dependable results. This short readiness process helps us learn about your company and opens the door to future opportunities.</p><div className="mt-4 flex flex-wrap gap-2"><WelcomePill icon={Handshake} text="Future opportunities" /><WelcomePill icon={ShieldCheck} text="Quality & safety" /><WelcomePill icon={Users} text="Trusted community" /></div></div><div className="rounded-2xl bg-emerald-950 p-4 text-white"><div className="flex items-center justify-between text-xs font-semibold text-emerald-100"><span>Mandatory checklist</span><span>{checklist.percent}%</span></div><Progress value={checklist.percent} className="mt-3 h-2.5" /><p className="mt-3 text-xs leading-5 text-emerald-100">{checklist.completedRequired} of {checklist.required.length} mandatory items complete</p><div className="mt-3"><ReadinessBadge status={data.qualification.status} className="border-white/20 bg-white/10 text-white" /></div></div></div></CardContent></Card>

        <div className="grid grid-cols-3 gap-2"><JourneyStep number="1" label="Company" active /><JourneyStep number="2" label="Checklist" active={checklist.completedRequired > 0} /><JourneyStep number="3" label="Review" active={locked || data.qualification.status === 'qualified'} /></div>

        {locked && <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><p className="font-bold">Your package is under review</p><p className="mt-1 text-xs leading-5 text-blue-800">APAS will contact you here if a correction or updated document is needed. Verified items remain visible in this checklist.</p></div></div>}
        {broker && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">Insurance broker access</p><p className="mt-1 text-xs leading-5">You may upload requested insurance evidence and answer questions. Company profile and experience records remain controlled by the contractor.</p></div></div>}

        {!broker && <Card><CardHeader><div className="mb-1 text-xs font-extrabold uppercase tracking-[.13em] text-emerald-700">Step 1 · Your company</div><CardTitle>Help us get to know your team</CardTitle><CardDescription>Confirm the company we are qualifying. This creates one reusable profile, so future project onboarding can be faster.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Your name"><Input value={actorName} onChange={(e) => setActorName(e.target.value)} placeholder="Person completing this form" /></Field><Field label="Legal company name"><Input value={company.legal_name ?? ''} onChange={(e) => setCompany({ ...company, legal_name: e.target.value })} /></Field><Field label="Email"><Input type="email" value={company.email ?? ''} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></Field><Field label="Phone"><Input value={company.phone ?? ''} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></Field><Field label="Website"><Input value={company.website ?? ''} onChange={(e) => setCompany({ ...company, website: e.target.value })} placeholder="https://" /></Field><Field label="Emergency phone"><Input value={profile.emergency_phone ?? ''} onChange={(e) => setProfile({ ...profile, emergency_phone: e.target.value })} /></Field><Field label="Trades / services"><Input value={Array.isArray(profile.trade_categories) ? profile.trade_categories.join(', ') : profile.trade_categories ?? ''} onChange={(e) => setProfile({ ...profile, trade_categories: e.target.value })} placeholder="Roofing, concrete, electrical" /></Field><Field label="Service areas"><Input value={Array.isArray(profile.service_areas) ? profile.service_areas.join(', ') : profile.service_areas ?? ''} onChange={(e) => setProfile({ ...profile, service_areas: e.target.value })} placeholder="Miami-Dade, Broward" /></Field><Field label="Year established"><Input type="number" value={profile.year_established ?? ''} onChange={(e) => setProfile({ ...profile, year_established: e.target.value })} /></Field><Field label="Employees"><Input type="number" value={profile.employee_count ?? ''} onChange={(e) => setProfile({ ...profile, employee_count: e.target.value })} /></Field><div className="sm:col-span-2"><Field label="Company overview"><Textarea value={profile.description ?? ''} onChange={(e) => setProfile({ ...profile, description: e.target.value })} placeholder="Briefly describe your qualifications, crews, and typical work." /></Field></div><div className="sm:col-span-2"><Button variant="outline" onClick={saveCompany} disabled={saving || locked}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save company information</Button></div></CardContent></Card>}

        {!broker && <PortfolioSection token={token} items={data.portfolio ?? []} actorName={actorName} onDone={load} locked={locked} />}

        <ChecklistSection title="Step 2 · Mandatory checklist" description="Complete each item below before sending your package for review. Every item clearly tells you whether to upload a document, answer in writing, or acknowledge it." requirements={checklist.required} token={token} documents={documents} comments={data.comments ?? []} actorName={actorName} onDone={load} locked={locked} />
        {checklist.optional.length > 0 && <ChecklistSection optional title="Optional company information" description="These items help us understand your capabilities and may improve future matching, but they will never block submission." requirements={checklist.optional} token={token} documents={documents} comments={data.comments ?? []} actorName={actorName} onDone={load} locked={locked} />}

        {!broker && <Card className={checklist.readyToSubmit ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'}><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-extrabold uppercase tracking-[.13em] text-emerald-700">Step 3 · Send for review</div><h2 className="mt-1 text-lg font-bold">{checklist.readyToSubmit ? 'Your mandatory checklist is ready.' : `${checklist.required.length - checklist.completedRequired} mandatory item${checklist.required.length - checklist.completedRequired === 1 ? '' : 's'} left`}</h2><p className="mt-1 text-sm text-muted-foreground">Optional items may be completed now or later. APAS makes the final human verification decision.</p></div><Button size="lg" onClick={submit} disabled={submitting || locked || !checklist.readyToSubmit}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Submit for review</Button></div></CardContent></Card>}
        <p className="text-center text-[11px] text-muted-foreground">APAS Project Controls · Powered by projOS · Documents are stored in a private workspace vault</p>
      </main>
    </div>
  );
}

function WelcomePill({ icon: Icon, text }: { icon: typeof Handshake; text: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800"><Icon className="h-3.5 w-3.5" />{text}</span>;
}

function JourneyStep({ number, label, active }: { number: string; label: string; active?: boolean }) {
  return <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${active ? 'border-emerald-200 bg-white text-emerald-900 shadow-sm' : 'border-slate-200 bg-white/50 text-slate-500'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ${active ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'}`}>{number}</span><span className="truncate text-xs font-bold">{label}</span></div>;
}

function ChecklistSection({ optional = false, title, description, requirements, token, documents, comments, actorName, onDone, locked }: any) {
  return <Card className={optional ? 'border-slate-200 bg-white/70' : ''}><CardHeader><div className={`mb-1 text-xs font-extrabold uppercase tracking-[.13em] ${optional ? 'text-slate-500' : 'text-emerald-700'}`}>{title}</div><CardTitle>{optional ? 'Share more when it is useful' : 'Provide the requested information'}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{requirements.length ? <Accordion type="multiple" className="space-y-2">{requirements.map((requirement: any) => <PortalRequirement key={requirement.id} token={token} requirement={requirement} document={requirement.current_document_id ? documents.get(requirement.current_document_id) : null} comments={comments.filter((comment: any) => comment.requirement_id === requirement.id)} actorName={actorName} onDone={onDone} locked={locked && requirement.status !== 'needs_correction'} />)}</Accordion> : <div className="rounded-xl border border-dashed p-6 text-center"><ClipboardCheck className="mx-auto h-7 w-7 text-emerald-700" /><p className="mt-2 text-sm font-bold">No mandatory items</p><p className="mt-1 text-xs text-muted-foreground">You may submit this package whenever your company information is ready.</p></div>}</CardContent></Card>;
}

function PortfolioSection({ token, items, actorName, onDone, locked }: { token: string; items: any[]; actorName: string; onDone: () => Promise<void>; locked: boolean }) {
  const empty = { projectName: '', clientName: '', tradeScope: '', location: '', completedOn: '', referenceName: '', referenceEmail: '', referencePhone: '', notes: '' };
  const [form, setForm] = useState(empty);
  const [adding, setAdding] = useState(false);
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const add = async () => {
    if (!form.projectName.trim()) return toast.error('Enter a project name.');
    setAdding(true);
    try {
      await portalCall(token, 'add_portfolio', { ...form, actorName });
      toast.success('Project experience added'); setForm(empty); await onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add experience'); }
    finally { setAdding(false); }
  };
  return <Card><CardHeader><CardTitle>Experience &amp; references</CardTitle><CardDescription>Add representative work so the review team can confirm trade capability and references.</CardDescription></CardHeader><CardContent className="space-y-4">{items.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{items.map((item) => <div key={item.id} className="rounded-xl border bg-slate-50 p-4"><p className="font-bold">{item.project_name}</p><p className="mt-1 text-xs text-muted-foreground">{[item.client_name, item.trade_scope, item.location].filter(Boolean).join(' · ')}</p>{item.reference_name && <p className="mt-2 text-xs"><b>Reference:</b> {item.reference_name}{item.reference_phone ? ` · ${item.reference_phone}` : ''}</p>}</div>)}</div>}{!locked && <div className="rounded-xl border border-dashed p-4"><p className="mb-3 text-sm font-bold">Add representative project</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Project name *"><Input value={form.projectName} onChange={(event) => update('projectName', event.target.value)} /></Field><Field label="Client"><Input value={form.clientName} onChange={(event) => update('clientName', event.target.value)} /></Field><Field label="Trade scope"><Input value={form.tradeScope} onChange={(event) => update('tradeScope', event.target.value)} /></Field><Field label="Location"><Input value={form.location} onChange={(event) => update('location', event.target.value)} /></Field><Field label="Completion date"><Input type="date" value={form.completedOn} onChange={(event) => update('completedOn', event.target.value)} /></Field><Field label="Reference name"><Input value={form.referenceName} onChange={(event) => update('referenceName', event.target.value)} /></Field><Field label="Reference email"><Input type="email" value={form.referenceEmail} onChange={(event) => update('referenceEmail', event.target.value)} /></Field><Field label="Reference phone"><Input value={form.referencePhone} onChange={(event) => update('referencePhone', event.target.value)} /></Field><div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} /></Field></div></div><Button className="mt-3" variant="outline" onClick={add} disabled={adding}>{adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add experience</Button></div>}</CardContent></Card>;
}

function PortalRequirement({ token, requirement, document, comments, actorName, onDone, locked }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [expiration, setExpiration] = useState(document?.expiration_date ?? '');
  const [issueDate, setIssueDate] = useState(document?.issue_date ?? '');
  const [identifier, setIdentifier] = useState(document?.identifier ?? '');
  const [authority, setAuthority] = useState(document?.issuing_authority ?? '');
  const [writtenResponse, setWrittenResponse] = useState(requirement.response_text ?? '');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const done = isRequirementComplete(requirement);
  const kind = responseType(requirement);
  const actionCopy = RESPONSE_TYPE_COPY[kind];

  useEffect(() => { setWrittenResponse(requirement.response_text ?? ''); }, [requirement.id, requirement.response_text]);

  const upload = async () => {
    if (!file) return toast.error('Choose a file first');
    if (file.size > 15 * 1024 * 1024) return toast.error('File must be 15 MB or smaller');
    if (requirement.expiration_required && !expiration) return toast.error('Enter the document expiration date');
    setBusy(true);
    try {
      const intent = await portalCall(token, 'upload_intent', { requirementId: requirement.id, fileName: file.name, mimeType: file.type, fileSize: file.size });
      const { error } = await supabase.storage.from(intent.bucket).uploadToSignedUrl(intent.path, intent.token, file, { contentType: file.type });
      if (error) throw error;
      await portalCall(token, 'complete_upload', { requirementId: requirement.id, storagePath: intent.path, fileName: file.name, mimeType: file.type, fileSize: file.size, expirationDate: expiration || null, issueDate: issueDate || null, identifier, issuingAuthority: authority, actorName });
      toast.success('Document uploaded securely');
      setFile(null);
      await onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Upload failed'); }
    finally { setBusy(false); }
  };
  const saveResponse = async () => {
    if (!writtenResponse.trim()) return toast.error('Enter your response first');
    setBusy(true);
    try {
      await portalCall(token, 'save_response', { requirementId: requirement.id, responseText: writtenResponse.trim(), actorName });
      toast.success('Response saved');
      await onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save response'); }
    finally { setBusy(false); }
  };
  const acknowledge = async () => {
    setBusy(true);
    try {
      await portalCall(token, 'acknowledge', { requirementId: requirement.id, actorName });
      toast.success('Acknowledgement saved');
      await onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save acknowledgement'); }
    finally { setBusy(false); }
  };
  const ask = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await portalCall(token, 'comment', { requirementId: requirement.id, comment: comment.trim(), actorName });
      setComment('');
      toast.success('Question sent to the review team');
      await onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send'); }
    finally { setBusy(false); }
  };

  return <AccordionItem value={requirement.id} className={`rounded-xl border px-4 ${requirement.required ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-slate-50/50'}`}>
    <AccordionTrigger className="hover:no-underline"><div className="flex min-w-0 flex-1 items-center gap-3 text-left"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : requirement.status === 'needs_correction' || requirement.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{done ? <Check className="h-4 w-4" /> : requirement.legally_required ? <LockKeyhole className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{requirement.title}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${requirement.required ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>{requirement.required ? 'Mandatory' : 'Optional'}</span><ReadinessBadge status={requirement.status} /></div><p className="mt-1 text-xs text-muted-foreground">{actionCopy.contractorLabel}{requirement.expiration_required ? ' · expiration date required' : ''}</p></div><ChevronRight className="h-4 w-4" /></div></AccordionTrigger>
    <AccordionContent className="pb-4"><div className="ml-0 space-y-4 sm:ml-12"><div className="rounded-xl bg-emerald-50/70 p-3"><p className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">What to do</p><p className="mt-1 text-sm leading-6 text-emerald-950">{requirement.description} {requirement.instructions}</p></div>
      {requirement.status === 'needs_correction' && document?.rejection_reason && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><b>Correction requested:</b> {document.rejection_reason}</div>}
      {document && <div className="rounded-lg border bg-slate-50 p-3 text-sm"><div className="flex items-center gap-2"><FileUp className="h-4 w-4 text-emerald-700" /><p className="font-semibold">{document.file_name}</p></div><p className="mt-1 text-xs text-muted-foreground">Status: {document.verification_status.replace(/_/g, ' ')}{document.expiration_date ? ` · expires ${document.expiration_date}` : ''}</p></div>}
      {requirement.response_text && <div className="rounded-lg border bg-slate-50 p-3 text-sm"><div className="flex items-center gap-2"><FileQuestion className="h-4 w-4 text-emerald-700" /><p className="font-semibold">Your saved response</p></div><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{requirement.response_text}</p></div>}
      {!locked && supportsDocumentUpload(requirement) && <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-white p-4"><div className="flex items-center gap-2"><FileUp className="h-4 w-4 text-emerald-700" /><Label>{document ? 'Replace this document' : 'Upload your document'}</Label></div><p className="mt-1 text-xs text-muted-foreground">PDF, Word, JPG, PNG, or WebP · maximum 15 MB · phone camera supported</p><input type="file" accept=".pdf,.docx,image/jpeg,image/png,image/webp" capture="environment" className="mt-3 block w-full text-sm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Issue date"><Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></Field><Field label={`Expiration date${requirement.expiration_required ? ' *' : ''}`}><Input type="date" value={expiration} onChange={(event) => setExpiration(event.target.value)} /></Field><Field label="License / policy #"><Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></Field><Field label="Issuing authority"><Input value={authority} onChange={(event) => setAuthority(event.target.value)} /></Field></div><Button className="mt-3" onClick={upload} disabled={!file || busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}{document ? 'Upload replacement' : 'Upload securely'}</Button></div>}
      {!locked && supportsWrittenResponse(requirement) && <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4"><div className="flex items-center gap-2"><FileQuestion className="h-4 w-4 text-blue-700" /><Label>Write your response</Label></div><Textarea className="mt-3 min-h-28 bg-white" value={writtenResponse} onChange={(event) => setWrittenResponse(event.target.value)} placeholder="Give the review team the facts they need. You can edit this response until the package is submitted." maxLength={5000} /><div className="mt-2 flex items-center justify-between gap-3"><p className="text-[10px] text-muted-foreground">{writtenResponse.length.toLocaleString()} / 5,000</p><Button variant="outline" onClick={saveResponse} disabled={!writtenResponse.trim() || busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save response</Button></div></div>}
      {!locked && isAcknowledgement(requirement) && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="font-bold">Confirm this requirement</p><p className="mt-1 text-xs leading-5 text-emerald-900">By selecting acknowledge, you confirm that you have read and accept the requirement above.</p></div></div><Button className="mt-3" variant={done ? 'outline' : 'default'} onClick={acknowledge} disabled={busy || done}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{done ? 'Acknowledged' : 'I acknowledge'}</Button></div>}
      <div className="rounded-lg bg-slate-50 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-bold"><HelpCircle className="h-4 w-4" />Need help with this item?</div>{comments.map((item: any) => <div key={item.id} className="mb-2 rounded-md bg-white p-2 text-xs"><p className="font-semibold">{item.author_name || item.author_type} <span className="font-normal text-muted-foreground">· {format(new Date(item.created_at), 'MMM d, h:mm a')}</span></p><p className="mt-1 text-muted-foreground">{item.body}</p></div>)}<div className="flex gap-2"><Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ask the APAS team a question…" /><Button size="icon" variant="outline" onClick={ask} disabled={!comment.trim() || busy} aria-label="Send question"><MessageSquare className="h-4 w-4" /></Button></div></div>
    </div></AccordionContent>
  </AccordionItem>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
