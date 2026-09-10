import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArchiveRestore, CalendarDays, CheckCheck, Download, FileText, Mail, Plus, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrandedReportEmailDialog } from '@/components/reports/BrandedReportEmailDialog';
import { useClientMeetings, type ClientMeeting, type ClientMeetingBundle, type MeetingAction, type MeetingPublication } from '@/hooks/useClientMeetings';
import { useAuth } from '@/hooks/useAuth';
import { resolveDistribution } from '@/lib/distribution';
import { htmlReportPdfBase64 } from '@/lib/reports/htmlReportPdf';
import { meetingReportHtml, type MeetingSnapshot } from '../../../supabase/functions/_shared/clientMeetingReport';
import { parseUpload } from '@/lib/docs/parseUpload';
import './client-meetings.css';
const reportSchema = z.object({ title: z.string().trim().min(1, 'Add a title'), meeting_date: z.string().min(1), attendees: z.string(), transcript: z.string(), project_ids: z.array(z.string()).min(1, 'Choose at least one project'), sections: z.array(z.object({ heading: z.string().trim().min(1), text: z.string(), basis: z.enum(['verified', 'interpretation', 'needs_review']) })) });
type ReportForm = Pick<ClientMeeting, 'title' | 'meeting_date' | 'attendees' | 'transcript' | 'project_ids' | 'sections'>;
type Command = ReturnType<typeof useClientMeetings>['command'];
const dateLabel = (d: string) => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
export default function ClientMeetingsPage() {
    const { clientId } = useParams();
    const portal = useLocation().pathname.startsWith('/owner-portal');
    const api = useClientMeetings(clientId);
    const [selected, setSelected] = useState<string>();
    const [tab, setTab] = useState<'actions' | 'report' | 'edit'>('actions');
    const [email, setEmail] = useState(false);
    const [weekly, setWeekly] = useState(false);
    const b = api.data;
    const edit = !!b?.canEdit && !portal;
    const records = useMemo(() => {
        if (!b)
            return [];
        if (edit)
            return b.meetings.map(m => ({ id: m.id, title: m.title, date: m.meeting_date }));
        const seen = new Set<string>();
        return b.publications.filter(p => { if (seen.has(p.meeting_id))
            return false; seen.add(p.meeting_id); return true; }).map(p => ({ id: p.meeting_id, title: p.snapshot.title, date: p.snapshot.meeting_date })).sort((a, c) => c.date.localeCompare(a.date));
    }, [b, edit]);
    const id = selected ?? records[0]?.id;
    const meeting = b?.meetings.find(m => m.id === id);
    const publication = b?.publications.find(p => p.meeting_id === id);
    const current = records.find(r => r.id === id);
    const [pendingAction, setPendingAction] = useState<Partial<MeetingAction> | null>(null);
    const [busyPdf, setBusyPdf] = useState(false);
    const portalUrl = `${window.location.origin}/owner-portal/clients/${clientId}/meetings`;
    const html = publication ? meetingReportHtml(publication.snapshot, portalUrl) : '';
    async function create() { const r = await api.command.mutateAsync({ operation: 'create', payload: { title: 'Portfolio coordination' } }); setSelected(r.id); setTab('edit'); }
    async function openTranscriptIntake() {
        if (!meeting) {
            await create();
            return;
        }
        setTab('edit');
        window.setTimeout(() => document.getElementById('meeting-transcript-intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
    async function archiveMeeting(meetingId: string) { if (!window.confirm('Remove this meeting from the journal and client portal? It will remain recoverable in Trash.'))
        return; await api.manage.mutateAsync({ operation: 'archive_meeting', id: meetingId }); setSelected(undefined); toast.success('Meeting moved to Trash'); }
    async function download() { if (!publication)
        return; setBusyPdf(true); try {
        const pdf = await htmlReportPdfBase64(html, { pageAware: true });
        const bytes = Uint8Array.from(atob(pdf.base64), c => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `Meeting-${publication.snapshot.meeting_date}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setBusyPdf(false);
    } }
    if (api.isLoading)
        return <div className="p-8" role="status">Opening Meetings &amp; Actions...</div>;
    if (api.error || !b)
        return <div className="p-8"><h1>Meetings &amp; Actions</h1><p role="alert">{api.error?.message || 'This client is not available.'}</p><Button onClick={() => api.refetch()}>Try again</Button></div>;
    const visibleActions = b.actions.filter(a => edit || a.published);
    const completed = visibleActions.filter(a => ['closed', 'approved'].includes(a.state)).length;
    return <div className="meeting-hub" data-testid="client-meeting-hub">
  <header className="meeting-hub__heading"><div><p className="meeting-hub__eyebrow">{b.client.name} · Entire client portfolio</p><h1>Meetings &amp; Actions</h1><p className="text-muted-foreground">One conversation. Every project. Clear next steps.</p></div><div className="flex flex-wrap gap-2">{edit && <><Button variant="outline" onClick={() => setWeekly(true)}><CalendarDays className="mr-2 h-4 w-4"/>Weekly delivery</Button><Button variant="outline" onClick={() => void openTranscriptIntake()}><Upload className="mr-2 h-4 w-4"/>Upload transcripts</Button><Button onClick={() => void create()} disabled={api.command.isPending}><Plus className="mr-2 h-4 w-4"/>New meeting</Button></>}{portal && b.canEdit && <Button asChild variant="outline"><Link to={`/organizations/${clientId}/meetings`}>Edit as APAS</Link></Button>}</div></header>
  {!records.length && !edit ? <section className="meeting-hub__surface p-8"><FileText className="h-8 w-8 mb-3 text-muted-foreground"/><h2>Your meeting journal is ready</h2><p className="text-muted-foreground">Approved meeting reports will appear here with shared actions and updates.</p></section> : <div className="meeting-hub__layout">
   <aside className="meeting-hub__journal" aria-label="Meeting and email journal"><p className="meeting-hub__eyebrow">Meeting journal</p>{records.map(r => <div className="meeting-hub__journal-row" key={r.id}><button aria-pressed={r.id === id} onClick={() => { if (tab === 'edit' && !window.confirm('Leave the editor? Unsaved changes will be lost.'))
            return; setSelected(r.id); setTab('actions'); }}><strong>{dateLabel(r.date)}</strong><span>{r.title}</span></button>{edit && <button className="meeting-hub__remove" aria-label={`Delete meeting ${r.title}`} onClick={() => void archiveMeeting(r.id)}><Trash2 className="h-4 w-4"/></button>}</div>)}{edit && <><p className="meeting-hub__eyebrow mt-8">Sent emails</p>{b.emails.length ? b.emails.map(e => <div className="meeting-hub__email" key={e.id}><div><strong>{e.subject}</strong><span>{new Date(e.sent_at).toLocaleDateString()} · {e.recipients.join(', ')}</span></div><button aria-label={`Delete email ${e.subject}`} onClick={async () => { if (!window.confirm('Remove this email from the journal? The delivery audit will be retained in Trash.'))
                            return; await api.manage.mutateAsync({ operation: 'dismiss_email', id: e.id }); toast.success('Email moved to Trash'); }}><Trash2 className="h-4 w-4"/></button></div>) : <p className="text-xs text-muted-foreground mt-2">No meeting reports emailed yet.</p>}<details className="meeting-hub__trash"><summary>Trash ({b.archivedMeetings.length + b.archivedSources.length + b.dismissedEmails.length})</summary>{b.archivedMeetings.map(m => <div key={m.id}><span>{m.title}</span><button aria-label={`Restore meeting ${m.title}`} onClick={() => void api.manage.mutateAsync({ operation: 'restore_meeting', id: m.id })}><ArchiveRestore className="h-4 w-4"/></button></div>)}{b.archivedSources.map(s => <div key={s.id}><span>{s.original_name}</span><button aria-label={`Restore transcript ${s.original_name}`} onClick={() => void api.manage.mutateAsync({ operation: 'restore_source', id: s.id })}><ArchiveRestore className="h-4 w-4"/></button></div>)}{b.dismissedEmails.map(e => <div key={e.id}><span>{e.subject}</span><button aria-label={`Restore email ${e.subject}`} onClick={() => void api.manage.mutateAsync({ operation: 'restore_email', id: e.id })}><ArchiveRestore className="h-4 w-4"/></button></div>)}</details></>}</aside>
   <div className="min-w-0">
    {!current ? <section className="meeting-hub__surface p-8"><FileText className="h-8 w-8 mb-3 text-muted-foreground"/><h2>Create your first client meeting</h2><p className="text-muted-foreground mb-4">Start a meeting, then upload ZIP exports, messages, transcripts, PDFs, Word documents, or paste notes directly.</p><Button onClick={() => void create()}><Plus className="mr-2 h-4 w-4"/>New meeting</Button></section> : <>
    <section className="meeting-hub__surface p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="meeting-hub__eyebrow">{current && dateLabel(current.date)}</p><h2>{current?.title}</h2></div><Badge variant="secondary">{publication ? `Released v${publication.revision}` : 'Internal draft'}</Badge></div><p className="mt-4 text-muted-foreground">{publication?.snapshot.sections[0]?.text || 'Create the narrative, review the actions, then release a dated report to the client.'}</p><div className="flex flex-wrap justify-between gap-2 text-sm mt-5"><span>{completed} of {visibleActions.length} actions confirmed complete</span><span>Current portfolio progress</span></div><progress className="w-full mt-2" max={Math.max(1, visibleActions.length)} value={completed} aria-label="Confirmed action completion"/></section>
    <div className="meeting-hub__tabs" aria-label="Meeting views">{([['actions', 'Action checklist'], ['report', 'Dated report'], ...(edit ? [['edit', 'Edit entire report']] : [])] as [
            typeof tab,
            string
        ][]).map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => { if (tab === 'edit' && key !== 'edit' && !window.confirm('Leave the editor? Unsaved changes will be lost.'))
            return; setTab(key); }}>{label}</button>)}</div>
    {tab === 'actions' && <><div className="flex flex-wrap justify-between gap-3 my-4"><p className="text-sm text-muted-foreground">Live actions across all meetings. Expand any item to provide an update.</p>{edit && meeting && <Button variant="outline" onClick={() => setPendingAction({ meeting_id: meeting.id })}><Plus className="mr-2 h-4 w-4"/>Add action</Button>}</div>{visibleActions.length === 0 ? <p className="py-6 text-muted-foreground">No actions have been recorded yet.</p> : [...visibleActions].sort((a, c) => Number(['closed', 'approved'].includes(c.state)) - Number(['closed', 'approved'].includes(a.state))).map(a => <ActionRow key={a.id} action={a} bundle={b} edit={edit} command={api.command} onEdit={() => setPendingAction(a)}/>)}</>}
    {tab === 'report' && (publication ? <><div className="flex flex-wrap gap-2 my-4"><Button variant="outline" disabled={busyPdf} onClick={() => void download()}><Download className="mr-2 h-4 w-4"/>{busyPdf ? 'Preparing PDF...' : 'Download PDF'}</Button>{edit && <Button onClick={() => setEmail(true)}><Mail className="mr-2 h-4 w-4"/>Email this report</Button>}<span className="self-center text-sm text-muted-foreground">Released {dateLabel(publication.published_at)} · Snapshot, not live progress</span></div><PublishedReport snapshot={publication.snapshot}/></> : <p className="py-8 text-muted-foreground">No client report released yet. Use Edit entire report to prepare and publish it.</p>)}
    {tab === 'edit' && edit && meeting && <ReportEditor key={meeting.id} meeting={meeting} bundle={b} api={api} onAction={setPendingAction} onReleased={() => setTab('report')}/>}
    </>}
   </div>
  </div>}
  {edit && pendingAction && <ActionEditor key={pendingAction.id || 'new'} action={pendingAction} bundle={b} command={api.command} close={() => setPendingAction(null)}/>}
  {edit && weekly && <WeeklyDelivery bundle={b} command={api.command} close={() => setWeekly(false)}/>}
  {edit && publication && <BrandedReportEmailDialog open={email} onOpenChange={setEmail} reportTitle={publication.snapshot.title} projectName={b.client.name} filename={`Meeting-${publication.snapshot.meeting_date}.pdf`} defaultSubject={`${b.client.name}: ${publication.snapshot.title} | ${publication.snapshot.meeting_date}`} sourceModule="client-meetings" reportType="client_meeting" clientMeetingPublicationId={publication.id} prepareDelivery={async (message) => {
                // Re-read the released record before rendering; never email unsaved editor text.
                const refreshed = await api.refetch();
                const released = refreshed.data?.publications.find(p => p.id === publication.id);
                if (!released)
                    throw new Error('Released report is no longer accessible.');
                const bodyHtml = meetingReportHtml(released.snapshot, portalUrl, message);
                const pdf = await htmlReportPdfBase64(meetingReportHtml(released.snapshot, portalUrl), { pageAware: true });
                return { bodyHtml, bodyText: `${message}\n${released.snapshot.title}\n${portalUrl}`, pdfBase64: pdf.base64, pdfSize: pdf.size };
            }}/>}<footer className="meeting-hub__footer">APAS Consulting · Powered by ProjOS · Client-scoped records and accountable updates</footer>
 </div>;
}
function TranscriptIntake({ meeting, bundle, api }: {
    meeting: ClientMeeting;
    bundle: ClientMeetingBundle;
    api: ReturnType<typeof useClientMeetings>;
}) {
    const sources = bundle.sources.filter(source => source.meeting_id === meeting.id);
    const accepted = '.zip,.txt,.md,.csv,.json,.html,.htm,.xml,.vtt,.srt,.log,.eml,.rtf,.pdf,.docx';
    async function upload(files: FileList | null) {
        if (!files)
            return;
        for (const file of Array.from(files)) {
            let extractedText: string | undefined;
            if (/\.(pdf|docx)$/i.test(file.name)) {
                try {
                    extractedText = (await parseUpload(file)).text;
                }
                catch {
                    toast.error(`${file.name} could not be read. If it is scanned, run OCR or paste the text.`);
                    continue;
                }
            }
            const result = await api.uploadSource.mutateAsync({ meetingId: meeting.id, file, extractedText });
            if (result.ignored?.length)
                toast.info(`${file.name}: ${result.ignored.length} non-text ZIP entries were retained but not analyzed.`);
            else
                toast.success(`${file.name} added to the transcript package`);
        }
    }
    return <section id="meeting-transcript-intake" className="meeting-hub__surface meeting-hub__intake p-5"><div><p className="meeting-hub__eyebrow">Step 1 · Source material</p><h3 className="font-semibold text-lg">Add every conversation and transcript</h3><p className="text-sm text-muted-foreground">Upload several files at once. ZIP packages are unpacked securely and readable conversations are labeled by source file so the report can cite them.</p></div><label className="meeting-hub__dropzone"><Upload className="h-6 w-6"/><span><strong>{api.uploadSource.isPending ? 'Reading source...' : 'Choose transcript files'}</strong><small>ZIP, messages, TXT, CSV, JSON, EML, PDF, Word, captions, or logs · 25 MB each</small></span><input type="file" multiple accept={accepted} disabled={api.uploadSource.isPending} onChange={e => { void upload(e.target.files).finally(() => { e.target.value = ''; }); }}/></label>{sources.length > 0 && <div className="meeting-hub__sources"><p className="text-sm font-medium">Included in the next analysis</p>{sources.map(source => <div key={source.id}><FileText className="h-4 w-4"/><span><strong>{source.original_name}</strong><small>{(source.byte_size / 1024).toFixed(source.byte_size > 10240 ? 0 : 1)} KB · {source.manifest.length} readable {source.manifest.length === 1 ? 'source' : 'sources'}</small></span><button type="button" aria-label={`Remove transcript ${source.original_name}`} onClick={async () => { if (!window.confirm(`Remove ${source.original_name} from future analysis? The original remains in the secure audit record.`))
                            return; await api.manage.mutateAsync({ operation: 'archive_source', id: source.id }); toast.success('Transcript removed from future analysis'); }}><Trash2 className="h-4 w-4"/></button></div>)}</div>}</section>;
}
function PublishedReport({ snapshot: s }: {
    snapshot: MeetingSnapshot;
}) {
    return <article className="meeting-hub__paper"><p className="meeting-hub__eyebrow">APAS Consulting · Prepared for {s.client_name}</p><h2 className="mt-5 text-3xl">{s.title}</h2><p className="text-muted-foreground mt-3">{dateLabel(s.meeting_date)} · {s.attendees || 'Participants not recorded'}</p><hr className="my-6"/>{s.sections.map((x, i) => <section key={i} className="mb-7"><h3 className="text-xl font-semibold">{String(i + 1).padStart(2, '0')} / {x.heading}</h3><p className="whitespace-pre-wrap mt-3 leading-relaxed">{x.text}</p><Badge variant="outline" className="mt-3">{x.basis === 'verified' ? 'Human-reviewed facts' : x.basis === 'interpretation' ? 'Interpretation / recommendation' : 'Needs verification'}</Badge></section>)}<h3 className="text-xl font-semibold">Dated action register</h3>{s.actions.map(a => <div key={a.id} className="border-b py-3"><strong>{a.title}</strong><p className="text-sm text-muted-foreground">{a.project} · {a.assignee || 'Unassigned'} · Due: {a.due_date || 'Not agreed'} · {['closed', 'approved'].includes(a.state) ? 'Confirmed complete' : a.step === 2 ? 'Completion review' : 'Open'}</p></div>)}</article>;
}
function ReportEditor({ meeting, bundle, api, onAction, onReleased }: {
    meeting: ClientMeeting;
    bundle: ClientMeetingBundle;
    api: ReturnType<typeof useClientMeetings>;
    onAction: (a: Partial<MeetingAction>) => void;
    onReleased: () => void;
}) {
    const form = useForm<ReportForm>({ resolver: zodResolver(reportSchema), defaultValues: meeting });
    const sections = useFieldArray({ control: form.control, name: 'sections' });
    const [revision, setRevision] = useState(meeting.revision);
    const instructions = useForm({ defaultValues: { instructions: '' } });
    const [draft, setDraft] = useState<Awaited<ReturnType<typeof api.generate.mutateAsync>> | null>(null);
    const [generationError, setGenerationError] = useState('');
    useEffect(() => { if (!form.formState.isDirty && meeting.revision !== revision) {
        form.reset(meeting);
        setRevision(meeting.revision);
    } }, [meeting, revision, form]);
    useEffect(() => { const listener = (e: BeforeUnloadEvent) => { if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', listener); return () => window.removeEventListener('beforeunload', listener); }, [form.formState.isDirty]);
    async function save(v: ReportForm) { const r = await api.command.mutateAsync({ operation: 'save', payload: { id: meeting.id, revision, ...v } }); setRevision(r.revision!); form.reset(v); toast.success('Report saved. Client copy is unchanged until you release it.'); return r.revision!; }
    async function publish() { if (!await form.trigger())
        return; if (!window.confirm('Release this reviewed report to the client portal? This creates a dated snapshot and makes its actions visible. No email is sent now.'))
        return; const rev = await save(form.getValues()); await api.command.mutateAsync({ operation: 'publish', payload: { id: meeting.id, revision: rev } }); toast.success('Report released to the client portal'); onReleased(); }
    return <div className="space-y-6 py-5"><div className="rounded-xl border bg-muted/30 p-4 text-sm">Edit any field below. Draft edits stay internal. Mark each section as reviewed before releasing. {form.formState.isDirty ? 'You have unsaved changes.' : 'All local edits are saved.'}</div>
  <form onSubmit={form.handleSubmit(v => void save(v))} className="space-y-5">
   <div className="grid gap-4 sm:grid-cols-[1fr_180px]"><label>Report title<Input {...form.register('title')}/></label><label>Meeting date<Input type="date" {...form.register('meeting_date')}/></label></div>
   <label className="block">Participants<Input {...form.register('attendees')} placeholder="Names and organizations"/></label>
   <fieldset><legend className="mb-2">Projects discussed</legend><div className="flex flex-wrap gap-3">{bundle.projects.map(p => <label key={p.id} className="flex items-center gap-2 border rounded-lg p-3"><input type="checkbox" value={p.id} {...form.register('project_ids')}/>{p.name}</label>)}</div></fieldset>
   <TranscriptIntake meeting={meeting} bundle={bundle} api={api}/>
   <label className="block meeting-hub__surface p-5">Paste, type, or dictate transcript notes<Textarea className="mt-3 min-h-56" {...form.register('transcript')} placeholder="Paste an Otter transcript, text-message conversation, email thread, meeting notes, or dictate directly here."/><p className="text-xs text-muted-foreground mt-2">Private source material. It is never shown in the client report. Uploaded sources and these notes are analyzed together.</p></label>
   <div className="meeting-hub__surface p-5 space-y-3"><h3 className="font-semibold">Build the project-by-project report</h3><p className="text-sm text-muted-foreground">The meeting skill reads every attached source, extracts decisions, explicit commitments, risks, questions, blockers, and next agenda items, then organizes them under the matching client projects. Unknowns remain flagged for your review.</p><label className="block">Additional direction for the report<Input {...instructions.register('instructions')} placeholder="For example: emphasize inspection decisions and separate sewer, stormwater, and landscaping"/></label><Button type="button" disabled={api.generate.isPending || api.uploadSource.isPending} onClick={async () => { setGenerationError(''); try {
        setDraft(await api.generate.mutateAsync({ meetingId: meeting.id, transcript: form.getValues('transcript'), sections: form.getValues('sections'), instructions: instructions.getValues('instructions') }));
    }
    catch (error) {
        setGenerationError(error instanceof Error ? error.message : 'The report could not be generated.');
    } }}><Sparkles className="mr-2 h-4 w-4"/>{api.generate.isPending ? 'Building report, this may take up to two minutes...' : 'Extract and build report'}</Button>{generationError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><strong>Report not generated.</strong> {generationError}</div>}</div>
   {draft && <div className="border rounded-xl p-5 space-y-4"><h3 className="font-semibold">AI draft preview</h3><p className="text-sm text-muted-foreground">Nothing has been overwritten. Review the narrative and action candidates.</p>{draft.sections.map((s, i) => <details key={i}><summary>{s.heading}</summary><p className="whitespace-pre-wrap my-2">{s.text}</p></details>)}<div className="flex flex-wrap gap-2"><Button type="button" onClick={() => { if (window.confirm('Replace the current draft narrative with this AI suggestion? Your published report will not change.')) {
        form.setValue('title', draft.title, { shouldDirty: true });
        form.setValue('sections', draft.sections, { shouldDirty: true });
        toast.success('Draft applied. Review each section and save.');
    } }}>Apply narrative to editor</Button><Button type="button" variant="ghost" onClick={() => setDraft(null)}>Dismiss suggestions</Button></div>{draft.actions.map((a, i) => <div key={i} className="border-t pt-3"><strong>{a.title}</strong><p className="text-sm text-muted-foreground">{a.source_quote ? `Source: "${a.source_quote}"` : 'No verified source quote. Confirm this action manually.'}</p><Button type="button" size="sm" variant="outline" onClick={() => onAction({ ...a, meeting_id: meeting.id })}>Review and add action</Button></div>)}</div>}
   {sections.fields.map((s, i) => <section key={s.id} className="meeting-hub__surface p-5 space-y-3"><div className="flex items-end gap-3"><label className="flex-1">Section heading<Input {...form.register(`sections.${i}.heading`)}/></label><Button type="button" variant="ghost" aria-label={`Remove section ${i + 1}`} onClick={() => sections.remove(i)}><Trash2 className="h-4 w-4"/></Button></div><label className="block">Narrative<Textarea className="min-h-40 leading-relaxed" {...form.register(`sections.${i}.text`)}/></label><label className="block text-sm">Evidence and review status<select className="meeting-hub__select mt-1" {...form.register(`sections.${i}.basis`)}><option value="needs_review">Needs human review</option><option value="verified">Human-reviewed facts</option><option value="interpretation">Reviewed interpretation / recommendation</option></select></label></section>)}
   <Button type="button" variant="outline" onClick={() => sections.append({ heading: 'New section', text: '', basis: 'needs_review' })}><Plus className="mr-2 h-4 w-4"/>Add section</Button>
   {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-destructive">Check the title, meeting date, selected projects, and section headings.</p>}
   <div className="flex flex-wrap gap-3"><Button type="submit" disabled={api.command.isPending}><Save className="mr-2 h-4 w-4"/>Save draft</Button><Button type="button" variant="outline" disabled={api.command.isPending} onClick={() => void publish()}><CheckCheck className="mr-2 h-4 w-4"/>Approve &amp; release to portal</Button></div>
  </form>
 </div>;
}
function ActionRow({ action: a, bundle, edit, command, onEdit }: {
    action: MeetingAction;
    bundle: ClientMeetingBundle;
    edit: boolean;
    command: Command;
    onEdit: () => void;
}) {
    const { user } = useAuth();
    const done = ['closed', 'approved'].includes(a.state);
    const form = useForm({ defaultValues: { body: '' } });
    const comments = bundle.comments.filter(c => c.action_id === a.id);
    return <article className={`meeting-hub__action ${done ? 'is-complete' : ''}`}><div className="flex gap-3 items-start"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" aria-label={done ? `Reopen ${a.title}` : `${edit ? 'Confirm' : 'Submit'} completion: ${a.title}`} checked={done || (!edit && a.step === 2)} disabled={command.isPending || (!edit && (a.assignee_id !== user?.id || done || a.step === 2))} onChange={() => void command.mutateAsync({ operation: edit ? (done ? 'reopen' : 'confirm') : 'submit', payload: { id: a.id } })}/><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2 items-center"><span className="meeting-hub__eyebrow">{bundle.projects.find(p => p.id === a.project_id)?.name || 'Project'}</span><Badge variant="secondary">{done ? 'Confirmed complete' : a.step === 2 ? 'Completion review' : 'Open'}</Badge>{!a.published && edit && <Badge variant="outline">Not released</Badge>}</div><h3 className="mt-2 font-semibold text-lg">{a.title}</h3><p className="text-sm text-muted-foreground mt-1">Owner: {a.assignee_name || 'Unassigned'} · Ball in court: {a.step === 2 ? 'APAS reviewer' : a.ball_in_court || 'To confirm'} · Due: {a.due_date || 'Not agreed'}</p>{edit && <Button variant="link" className="px-0" onClick={onEdit}>Edit action</Button>}<details className="mt-3"><summary className="cursor-pointer text-sm">{comments.length} updates · Discuss &amp; view evidence</summary>{comments.map(c => <div key={c.id} className="border-l-2 pl-3 my-4"><p className="text-xs text-muted-foreground">{c.author_name} · {new Date(c.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap mt-1">{c.body}</p></div>)}{edit && a.source_quote && <blockquote className="text-sm bg-muted p-3 my-3">{a.source_quote}<br />{a.source_locator}</blockquote>}<form className="mt-4 space-y-2" onSubmit={form.handleSubmit(async (v) => { if (!v.body.trim())
        return; await command.mutateAsync({ operation: 'comment', payload: { id: a.id, body: v.body } }); form.reset(); })}><label>Provide an update<Textarea {...form.register('body', { required: true })} placeholder="What changed? What do you need from the team?"/></label><Button type="submit" disabled={command.isPending}>Post update</Button></form></details></div></div></article>;
}
const actionSchema = z.object({ title: z.string().trim().min(1), project_id: z.string().uuid(), assignee_id: z.string(), assignee_name: z.string(), ball_in_court: z.string(), due_date: z.string(), source_quote: z.string(), source_locator: z.string() });
function ActionEditor({ action: a, bundle, command, close }: {
    action: Partial<MeetingAction>;
    bundle: ClientMeetingBundle;
    command: Command;
    close: () => void;
}) {
    const form = useForm<z.infer<typeof actionSchema>>({ resolver: zodResolver(actionSchema), defaultValues: { title: a.title || '', project_id: a.project_id || '', assignee_id: a.assignee_id || '', assignee_name: a.assignee_name || '', ball_in_court: a.ball_in_court || '', due_date: a.due_date || '', source_quote: a.source_quote || '', source_locator: a.source_locator || '' } });
    return <Dialog open onOpenChange={v => !v && close()}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{a.id ? 'Edit action' : 'Review and add action'}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit(async (v) => { await command.mutateAsync({ operation: 'action', payload: { ...v, id: a.id, revision: a.revision, meeting_id: a.meeting_id } }); close(); })}><label className="block">Action<Input {...form.register('title')}/></label><label className="block">Project<select className="meeting-hub__select" {...form.register('project_id')} aria-readonly={!!a.id} onChange={e => { if (a.id)
        e.target.value = a.project_id!;
    else
        void form.register('project_id').onChange(e); }}><option value="">Choose project</option>{bundle.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Controller control={form.control} name="assignee_id" render={({ field }) => <label className="block">Assigned portal/account user<select className="meeting-hub__select" {...field} onChange={e => { field.onChange(e.target.value); const member = bundle.members.find(m => m.id === e.target.value); if (member)
        form.setValue('assignee_name', member.name); }}><option value="">Unassigned or external contact</option>{bundle.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}/><label className="block">Responsible person or company<Input {...form.register('assignee_name')}/></label><p className="text-xs text-muted-foreground">Assign a portal user above to let that person submit completion. External parties can be named without granting account access.</p><label className="block">Ball in court<Input {...form.register('ball_in_court')}/></label><label className="block">Due date (leave blank if not agreed)<Input type="date" {...form.register('due_date')}/></label><label className="block">Source quote<Textarea {...form.register('source_quote')}/></label><label className="block">Source timestamp or location<Input {...form.register('source_locator')}/></label>{Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-destructive">Add an action title and select a project.</p>}<Button disabled={command.isPending} type="submit">Save action</Button></form></DialogContent></Dialog>;
}
function WeeklyDelivery({ bundle, command, close }: {
    bundle: ClientMeetingBundle;
    command: Command;
    close: () => void;
}) {
    const s = bundle.delivery;
    const form = useForm({ defaultValues: { enabled: s?.enabled ?? false, weekday: String(s?.weekday ?? 5), hour: String(s?.hour ?? 9), timezone: s?.timezone ?? 'America/New_York', recipients: s?.recipients.join(', ') ?? '', cc: s?.cc.join(', ') ?? '', bcc: s?.bcc.join(', ') ?? '' } });
    const emails = async (v: string) => (await resolveDistribution({ extraEmails: v.split(/[,;\s]+/).filter(Boolean) })).map(r => r.email);
    return <Dialog open onOpenChange={v => !v && close()}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Weekly client meeting report</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Email the newest approved report as a standalone branded HTML message with its portal link. Unchanged versions and unapproved drafts are not sent. Use Email this report for on-demand HTML and PDF.</p><form className="space-y-4" onSubmit={form.handleSubmit(async (v) => { const [recipients, cc, bcc] = await Promise.all([emails(v.recipients), emails(v.cc), emails(v.bcc)]); await command.mutateAsync({ operation: 'schedule', payload: { ...v, weekday: Number(v.weekday), hour: Number(v.hour), recipients, cc, bcc } }); toast.success('Weekly delivery preferences saved'); close(); })}><label className="flex items-center gap-2"><input type="checkbox" {...form.register('enabled')}/>Enable weekly delivery</label><div className="grid grid-cols-2 gap-3"><label>Day<select className="meeting-hub__select" {...form.register('weekday')}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label><label>Hour<select className="meeting-hub__select" {...form.register('hour')}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}</select></label></div><label className="block">Time zone<Input {...form.register('timezone')} placeholder="America/New_York"/></label>{(['recipients', 'cc', 'bcc'] as const).map(k => <label key={k} className="block">{k === 'recipients' ? 'To' : k.toUpperCase()}<Textarea {...form.register(k)} placeholder="Email addresses separated by commas"/></label>)}<p className="text-xs text-muted-foreground">Delivery occurs during the selected hour. BCC stays private. Enabling this authorizes future sends of new approved reports to these recipients.</p><Button type="submit" disabled={command.isPending}>Save delivery preferences</Button></form>{bundle.deliveries.slice(0, 3).map(d => <p key={d.id} className="text-xs">{new Date(d.updated_at).toLocaleString()}: {d.status}{d.error ? ` (${d.error})` : ''}</p>)}</DialogContent></Dialog>;
}
