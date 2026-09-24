import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArchiveRestore, Bot, CalendarDays, CheckCheck, ClipboardList, Database, Download, FileText, KeyRound, Mail, Plus, Save, Send, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrandedReportEmailDialog } from '@/components/reports/BrandedReportEmailDialog';
import { useClientMeetings, type ClientMeeting, type ClientMeetingBundle, type MeetingAction, type MeetingPublication } from '@/hooks/useClientMeetings';
import { useAuth } from '@/hooks/useAuth';
import { useNotionConnection, type NotionMapping } from '@/hooks/useNotionConnection';
import { resolveDistribution } from '@/lib/distribution';
import { htmlReportPdfBase64 } from '@/lib/reports/htmlReportPdf';
import { meetingReportHtml, type MeetingSnapshot } from '../../../supabase/functions/_shared/clientMeetingReport';
import { identityColor } from '@/lib/people/identityColor';
import './client-meetings.css';
const reportSchema = z.object({ title: z.string().trim().min(1, 'Add a title'), meeting_date: z.string().min(1), attendees: z.string(), transcript: z.string(), project_ids: z.array(z.string()).min(1, 'Choose at least one project'), sections: z.array(z.object({ heading: z.string().trim().min(1), text: z.string(), basis: z.enum(['verified', 'interpretation', 'needs_review']) })) });
type ReportForm = Pick<ClientMeeting, 'title' | 'meeting_date' | 'attendees' | 'transcript' | 'project_ids' | 'sections'>;
type Command = ReturnType<typeof useClientMeetings>['command'];
type AddUpdate = ReturnType<typeof useClientMeetings>['addUpdate'];
type SubmitCompletion = ReturnType<typeof useClientMeetings>['submitCompletion'];
const dateLabel = (d: string) => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
export default function ClientMeetingsPage() {
    const { clientId } = useParams();
    const portal = useLocation().pathname.startsWith('/owner-portal');
    const api = useClientMeetings(clientId);
    const notion = useNotionConnection();
    const [selected, setSelected] = useState<string>();
    const [tab, setTab] = useState<'actions' | 'report' | 'edit'>('actions');
    const [email, setEmail] = useState(false);
    const [weekly, setWeekly] = useState(false);
    const [selectedReportActions, setSelectedReportActions] = useState<Set<string>>(new Set());
    const [actionReportOpen, setActionReportOpen] = useState(false);
    const [digestOpen, setDigestOpen] = useState(false);
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
    async function syncNotion(mappingId?: string) {
        if (!mappingId) {
            toast.info('Connect Notion in Settings and map a meeting page or database to this client first.');
            return;
        }
        const result = await notion.sync.mutateAsync(mappingId);
        await api.refetch();
        setSelected(result.meetingId);
        setTab('edit');
        toast.success('Notion record imported as an internal draft. Review it before client release.');
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
    const notionMappings = (notion.status.data?.mappings ?? []).filter(mapping => mapping.client_id === clientId && mapping.mapping_purpose === 'meetings' && mapping.status === 'active');
    const defaultMapping = notionMappings[0];
    return <div className="meeting-hub" data-testid="client-meeting-hub">
  <header className="meeting-hub__heading"><div><p className="meeting-hub__eyebrow">{b.client.name} · Entire client portfolio</p><h1>Project Meetings &amp; Actions</h1><p className="text-muted-foreground">{b.viewerKind === 'assigned_team' ? 'Your assigned meeting actions, instructions, and due dates.' : 'Notion-fed project records. Reviewed project actions. Controlled client releases.'}</p></div><div className="flex flex-wrap gap-2">{edit && <><Button variant="outline" onClick={() => setWeekly(true)}><CalendarDays className="mr-2 h-4 w-4"/>Weekly delivery</Button><Button variant="outline" disabled={notion.sync.isPending} onClick={() => void syncNotion(defaultMapping?.id)}><Database className="mr-2 h-4 w-4"/>{notion.sync.isPending ? 'Syncing...' : 'Sync Notion'}</Button><Button onClick={() => void create()} disabled={api.command.isPending}><Plus className="mr-2 h-4 w-4"/>New reviewed record</Button></>}{portal && b.canEdit && <Button asChild variant="outline"><Link to={`/organizations/${clientId}/meetings`}>Edit as APAS</Link></Button>}</div></header>
  {edit && <MeetingIntelligencePanel clientName={b.client.name} projectCount={b.projects.length} mappings={notionMappings} connected={!!notion.status.data?.connected} syncing={notion.sync.isPending} onSync={(mappingId) => void syncNotion(mappingId)}/>}
  {!records.length && !edit ? <section className="meeting-hub__surface p-8"><FileText className="h-8 w-8 mb-3 text-muted-foreground"/><h2>Your meeting journal is ready</h2><p className="text-muted-foreground">Approved meeting reports will appear here with shared actions and updates.</p></section> : <div className="meeting-hub__layout">
   <aside className="meeting-hub__journal" aria-label="Project meeting and email journal"><p className="meeting-hub__eyebrow">Notion project records</p>{records.map(r => <div className="meeting-hub__journal-row" key={r.id}><button aria-pressed={r.id === id} onClick={() => { if (tab === 'edit' && !window.confirm('Leave the editor? Unsaved changes will be lost.'))
            return; setSelected(r.id); setTab('actions'); }}><strong>{dateLabel(r.date)}</strong><span>{r.title}</span></button>{edit && <button className="meeting-hub__remove" aria-label={`Delete meeting ${r.title}`} onClick={() => void archiveMeeting(r.id)}><Trash2 className="h-4 w-4"/></button>}</div>)}{edit && <><p className="meeting-hub__eyebrow mt-8">Sent emails</p>{b.emails.length ? b.emails.map(e => <div className="meeting-hub__email" key={e.id}><div><strong>{e.subject}</strong><span>{new Date(e.sent_at).toLocaleDateString()} · {e.recipients.join(', ')}</span></div><button aria-label={`Delete email ${e.subject}`} onClick={async () => { if (!window.confirm('Remove this email from the journal? The delivery audit will be retained in Trash.'))
                            return; await api.manage.mutateAsync({ operation: 'dismiss_email', id: e.id }); toast.success('Email moved to Trash'); }}><Trash2 className="h-4 w-4"/></button></div>) : <p className="text-xs text-muted-foreground mt-2">No meeting reports emailed yet.</p>}<details className="meeting-hub__trash"><summary>Trash ({b.archivedMeetings.length + b.dismissedEmails.length})</summary>{b.archivedMeetings.map(m => <div key={m.id}><span>{m.title}</span><button aria-label={`Restore meeting ${m.title}`} onClick={() => void api.manage.mutateAsync({ operation: 'restore_meeting', id: m.id })}><ArchiveRestore className="h-4 w-4"/></button></div>)}{b.dismissedEmails.map(e => <div key={e.id}><span>{e.subject}</span><button aria-label={`Restore email ${e.subject}`} onClick={() => void api.manage.mutateAsync({ operation: 'restore_email', id: e.id })}><ArchiveRestore className="h-4 w-4"/></button></div>)}</details></>}</aside>
   <div className="min-w-0">
    {!current ? <section className="meeting-hub__surface p-8"><FileText className="h-8 w-8 mb-3 text-muted-foreground"/><h2>Create your first Notion-fed project record</h2><p className="text-muted-foreground mb-4">Create a reviewed record from a mapped Notion source, then publish only the approved actions and report snapshot.</p><Button onClick={() => void create()}><Plus className="mr-2 h-4 w-4"/>New reviewed record</Button></section> : <>
    <section className="meeting-hub__surface p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="meeting-hub__eyebrow">{current && dateLabel(current.date)}</p><h2>{current?.title}</h2></div><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{publication ? `Released v${publication.revision}` : 'Internal draft'}</Badge>{edit && publication && <Button variant="outline" onClick={() => { setTab('report'); setDigestOpen(true); }}><ClipboardList className="mr-2 h-4 w-4"/>Create client digest</Button>}{edit && !publication && <Button variant="outline" onClick={() => setTab('edit')}><CheckCheck className="mr-2 h-4 w-4"/>Prepare release first</Button>}</div></div><p className="mt-4 text-muted-foreground">{publication?.snapshot.sections[0]?.text || 'Create the narrative, review the actions, then release a dated report to the client.'}</p><div className="flex flex-wrap justify-between gap-2 text-sm mt-5"><span>{completed} of {visibleActions.length} actions confirmed complete</span><span>Current portfolio progress</span></div><progress className="w-full mt-2" max={Math.max(1, visibleActions.length)} value={completed} aria-label="Confirmed action completion"/></section>
    <div className="meeting-hub__tabs" aria-label="Meeting views">{([['actions', 'Action checklist'], ['report', 'Dated report'], ...(edit ? [['edit', 'Edit entire report']] : [])] as [
            typeof tab,
            string
        ][]).map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => { if (tab === 'edit' && key !== 'edit' && !window.confirm('Leave the editor? Unsaved changes will be lost.'))
            return; setTab(key); }}>{label}</button>)}</div>
    {tab === 'actions' && <><div className="meeting-hub__action-toolbar my-4"><div><p className="text-sm font-medium">Live actions across all meetings</p><p className="text-sm text-muted-foreground">Expand an item to provide an update. Released items can be selected for a client report.</p></div>{edit && <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => { const released = visibleActions.filter(a => a.published).map(a => a.id); setSelectedReportActions(selectedReportActions.size === released.length ? new Set() : new Set(released)); }}>{selectedReportActions.size === visibleActions.filter(a => a.published).length && selectedReportActions.size ? 'Clear report selection' : 'Select client-visible'}</Button><Button variant="outline" disabled={!selectedReportActions.size} onClick={() => setActionReportOpen(true)}><ClipboardList className="mr-2 h-4 w-4"/>Compile update {selectedReportActions.size ? `(${selectedReportActions.size})` : ''}</Button>{meeting && <Button variant="outline" onClick={() => setPendingAction({ meeting_id: meeting.id })}><Plus className="mr-2 h-4 w-4"/>Add action</Button>}</div>}</div>{visibleActions.length === 0 ? <p className="py-6 text-muted-foreground">No actions have been recorded yet.</p> : [...visibleActions].sort((a, c) => Number(['closed', 'approved'].includes(c.state)) - Number(['closed', 'approved'].includes(a.state))).map(a => <ActionRow key={a.id} action={a} bundle={b} edit={edit} command={api.command} addUpdate={api.addUpdate} submitCompletion={api.submitCompletion} onEdit={() => setPendingAction(a)} reportSelected={selectedReportActions.has(a.id)} onReportSelect={(checked) => setSelectedReportActions(current => { const next = new Set(current); if (checked) next.add(a.id); else next.delete(a.id); return next; })}/>)}</>}
    {tab === 'report' && (publication ? <><div className="flex flex-wrap gap-2 my-4"><Button variant="outline" disabled={busyPdf} onClick={() => void download()}><Download className="mr-2 h-4 w-4"/>{busyPdf ? 'Preparing PDF...' : 'Download PDF'}</Button>{edit && <Button variant="outline" onClick={() => setDigestOpen(true)}><ClipboardList className="mr-2 h-4 w-4"/>Create client digest</Button>}{edit && <Button onClick={() => setEmail(true)}><Mail className="mr-2 h-4 w-4"/>Email this report</Button>}<span className="self-center text-sm text-muted-foreground">Released {dateLabel(publication.published_at)} · Snapshot, not live progress</span></div><PublishedReport snapshot={publication.snapshot}/></> : <section className="meeting-hub__surface my-4 p-6"><p className="meeting-hub__eyebrow">Client digest is almost ready</p><h3 className="text-xl font-semibold">Release the reviewed meeting first</h3><p className="mt-2 text-muted-foreground">The digest is generated from a controlled released snapshot, not from raw or unsaved meeting notes. Review the record, approve the client version, then create the digest.</p>{edit && <Button className="mt-4" onClick={() => setTab('edit')}><CheckCheck className="mr-2 h-4 w-4"/>Open editor and release</Button>}</section>)}
    {tab === 'edit' && edit && meeting && <ReportEditor key={meeting.id} meeting={meeting} bundle={b} api={api} notionMappings={notionMappings} notionSyncing={notion.sync.isPending} onNotionSync={(mappingId) => void syncNotion(mappingId)} onAction={setPendingAction} onReleased={() => setTab('report')}/>}
    </>}
   </div>
  </div>}
  {edit && pendingAction && <ActionEditor key={pendingAction.id || 'new'} action={pendingAction} bundle={b} command={api.command} close={() => setPendingAction(null)}/>}
  {edit && weekly && <WeeklyDelivery bundle={b} command={api.command} close={() => setWeekly(false)}/>}
  {edit && actionReportOpen && <ActionUpdateReportDialog bundle={b} actions={visibleActions.filter(a => selectedReportActions.has(a.id) && a.published)} portalUrl={portalUrl} close={() => setActionReportOpen(false)}/>}
  {edit && publication && digestOpen && <MeetingDigestDialog bundle={b} publication={publication} actions={visibleActions.filter(a => a.meeting_id === publication.meeting_id && a.published)} portalUrl={portalUrl} close={() => setDigestOpen(false)}/>}
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
function MeetingIntelligencePanel({ clientName, projectCount, mappings, connected, syncing, onSync }: { clientName: string; projectCount: number; mappings: NotionMapping[]; connected: boolean; syncing: boolean; onSync: (mappingId?: string) => void }) {
    const items = [
        {
            icon: KeyRound,
            label: 'Business Notion connection',
            text: 'Recordings, source notes, staff drafts, and raw meeting material belong in Notion first. Proj OS imports the approved Notion meeting record after the client and project mapping is set.',
            state: connected ? 'Workspace connected' : 'OAuth setup required',
        },
        {
            icon: Database,
            label: 'Project meeting source of truth',
            text: 'Notion owns the working meeting source. Proj OS owns the reviewed project action register, release snapshot, email delivery, and client portal visibility.',
            state: mappings.length ? `${mappings.length} mapped source${mappings.length === 1 ? '' : 's'}` : `${projectCount} project${projectCount === 1 ? '' : 's'} in scope`,
        },
        {
            icon: Bot,
            label: 'Hermes intelligence boundary',
            text: 'Hermes can read approved context and draft summaries, actions, and staff follow-ups. It cannot publish, email, or overwrite client records without human approval.',
            state: 'Draft-only agent path',
        },
    ];
    return <section className="meeting-hub__surface meeting-hub__intel p-5" aria-label="Notion and Hermes intelligence setup">
  <div className="meeting-hub__intel-head"><div><p className="meeting-hub__eyebrow">Intelligence layer</p><h2>Notion-fed meetings and Hermes for {clientName}</h2><p className="text-sm text-muted-foreground">Meetings come from Notion into Proj OS. Proj OS reviews, assigns, releases, emails, and keeps the client-facing record controlled.</p></div><Badge variant="outline">Human release required</Badge></div>
  <div className="meeting-hub__intel-grid">{items.map((item) => <article key={item.label}><div className="meeting-hub__intel-icon"><item.icon className="h-4 w-4"/></div><div><h3>{item.label}</h3><p>{item.text}</p><span>{item.state}</span></div></article>)}</div>
  {mappings.length > 0 && <div className="meeting-hub__notion-actions">{mappings.map(mapping => <Button key={mapping.id} type="button" variant="outline" disabled={syncing} onClick={() => onSync(mapping.id)}><Database className="mr-2 h-4 w-4"/>{syncing ? 'Syncing...' : `Import ${mapping.notion_title}`}</Button>)}</div>}
  <div className="meeting-hub__intel-flow"><strong>Required operating flow:</strong> capture and working notes in Notion, Notion to Proj OS sync, Proj OS human review, approved release to portal and email, Hermes reads only governed context for staff coordination.</div>
 </section>;
}
function NotionMeetingSourcePanel({ clientName, mappings, syncing, onSync, onAddAction }: {
    clientName: string;
    mappings?: NotionMapping[];
    syncing?: boolean;
    onSync?: (mappingId?: string) => void;
    onAddAction: () => void;
}) {
    return <section className="meeting-hub__surface meeting-hub__notion-source p-5">
  <div><p className="meeting-hub__eyebrow">Step 1 · Notion source</p><h3 className="font-semibold text-lg">Meetings come from Notion</h3><p className="text-sm text-muted-foreground">Recordings, working notes, attachments, decisions, and staff drafts should be stored in Notion first. This Proj OS screen only imports the approved Notion meeting record for {clientName}, then lets APAS review actions and release the client-facing snapshot.</p></div>
  <ol>
   <li><strong>Capture in Notion.</strong><span>Put decisions, attachments, staff notes, and source material in the mapped Notion meeting database.</span></li>
   <li><strong>Sync into Proj OS.</strong><span>Import the approved Notion meeting record into this project management journal.</span></li>
   <li><strong>Review and release.</strong><span>Edit the project narrative, assign actions, then publish only the approved snapshot to the client portal.</span></li>
  </ol>
  <div className="meeting-hub__notion-actions">{mappings?.length ? mappings.map(mapping => <Button key={mapping.id} type="button" variant="outline" disabled={syncing} onClick={() => onSync?.(mapping.id)}><Database className="mr-2 h-4 w-4"/>{syncing ? 'Syncing...' : `Sync ${mapping.notion_title}`}</Button>) : <Button type="button" variant="outline" onClick={() => onSync?.()}><Database className="mr-2 h-4 w-4"/>Sync from Notion</Button>}<Button type="button" variant="ghost" onClick={onAddAction}><Plus className="mr-2 h-4 w-4"/>Add action manually</Button></div>
 </section>;
}
function PublishedReport({ snapshot: s }: {
    snapshot: MeetingSnapshot;
}) {
    return <article className="meeting-hub__paper"><p className="meeting-hub__eyebrow">APAS Consulting · Prepared for {s.client_name}</p><h2 className="mt-5 text-3xl">{s.title}</h2><p className="text-muted-foreground mt-3">{dateLabel(s.meeting_date)} · {s.attendees || 'Participants not recorded'}</p><hr className="my-6"/>{s.sections.map((x, i) => <section key={i} className="mb-7"><h3 className="text-xl font-semibold">{String(i + 1).padStart(2, '0')} / {x.heading}</h3><p className="whitespace-pre-wrap mt-3 leading-relaxed">{x.text}</p><Badge variant="outline" className="mt-3">{x.basis === 'verified' ? 'Human-reviewed facts' : x.basis === 'interpretation' ? 'Interpretation / recommendation' : 'Needs verification'}</Badge></section>)}<h3 className="text-xl font-semibold">Dated action register</h3>{s.actions.map(a => <div key={a.id} className="border-b py-3"><strong>{a.title}</strong><p className="text-sm text-muted-foreground">{a.project} · {a.assignee || 'Unassigned'} · Due: {a.due_date || 'Not agreed'} · {['closed', 'approved'].includes(a.state) ? 'Confirmed complete' : a.step === 2 ? 'Completion review' : 'Open'}</p></div>)}</article>;
}
function ReportEditor({ meeting, bundle, api, notionMappings, notionSyncing, onNotionSync, onAction, onReleased }: {
    meeting: ClientMeeting;
    bundle: ClientMeetingBundle;
    api: ReturnType<typeof useClientMeetings>;
    notionMappings: NotionMapping[];
    notionSyncing: boolean;
    onNotionSync: (mappingId?: string) => void;
    onAction: (a: Partial<MeetingAction>) => void;
    onReleased: () => void;
}) {
    const form = useForm<ReportForm>({ resolver: zodResolver(reportSchema), defaultValues: meeting });
    const sections = useFieldArray({ control: form.control, name: 'sections' });
    const [revision, setRevision] = useState(meeting.revision);
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
   <NotionMeetingSourcePanel clientName={bundle.client.name} mappings={notionMappings} syncing={notionSyncing} onSync={onNotionSync} onAddAction={() => onAction({ meeting_id: meeting.id })}/>
   <div className="meeting-hub__surface p-5 space-y-3"><h3 className="font-semibold">Prepare the project-by-project record</h3><p className="text-sm text-muted-foreground">Use the Notion-synced meeting record as the source. Proj OS keeps the reviewed narrative, action list, release snapshot, client portal view, and email delivery. Until Notion OAuth is connected, edit the reviewed sections and actions manually here.</p><Button type="button" variant="outline" onClick={() => toast.info('Drafting from Notion will be enabled after the Notion workspace and meeting database are mapped for this client.')}><Database className="mr-2 h-4 w-4"/>Draft from Notion source</Button></div>
   {sections.fields.map((s, i) => <section key={s.id} className="meeting-hub__surface p-5 space-y-3"><div className="flex items-end gap-3"><label className="flex-1">Section heading<Input {...form.register(`sections.${i}.heading`)}/></label><Button type="button" variant="ghost" aria-label={`Remove section ${i + 1}`} onClick={() => sections.remove(i)}><Trash2 className="h-4 w-4"/></Button></div><label className="block">Narrative<Textarea className="min-h-40 leading-relaxed" {...form.register(`sections.${i}.text`)}/></label><label className="block text-sm">Evidence and review status<select className="meeting-hub__select mt-1" {...form.register(`sections.${i}.basis`)}><option value="needs_review">Needs human review</option><option value="verified">Human-reviewed facts</option><option value="interpretation">Reviewed interpretation / recommendation</option></select></label></section>)}
   <Button type="button" variant="outline" onClick={() => sections.append({ heading: 'New section', text: '', basis: 'needs_review' })}><Plus className="mr-2 h-4 w-4"/>Add section</Button>
   {Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-destructive">Check the title, meeting date, selected projects, and section headings.</p>}
   <div className="flex flex-wrap gap-3"><Button type="submit" disabled={api.command.isPending}><Save className="mr-2 h-4 w-4"/>Save draft</Button><Button type="button" variant="outline" disabled={api.command.isPending} onClick={() => void publish()}><CheckCheck className="mr-2 h-4 w-4"/>Approve &amp; release to portal</Button></div>
  </form>
 </div>;
}
function ActionRow({ action: a, bundle, edit, command, addUpdate, submitCompletion, onEdit, reportSelected, onReportSelect }: {
    action: MeetingAction;
    bundle: ClientMeetingBundle;
    edit: boolean;
    command: Command;
    addUpdate: AddUpdate;
    submitCompletion: SubmitCompletion;
    onEdit: () => void;
    reportSelected: boolean;
    onReportSelect: (checked: boolean) => void;
}) {
    const { user } = useAuth();
    const done = ['closed', 'approved'].includes(a.state);
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState<'internal' | 'client'>(bundle.canAddInternalUpdates ? 'internal' : 'client');
    const comments = bundle.comments.filter(c => c.action_id === a.id);
    const owner = a.assignee_name || 'Unassigned';
    const ownerColor = identityColor(owner);
    return <article className={`meeting-hub__action ${done ? 'is-complete' : ''}`}><div className="flex gap-3 items-start"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" aria-label={done ? `Reopen ${a.title}` : `${edit ? 'Confirm' : 'Submit'} completion: ${a.title}`} checked={done || (!edit && a.step === 2)} disabled={command.isPending || submitCompletion.isPending || (!edit && (a.assignee_id !== user?.id || done || a.step === 2))} onChange={() => void (edit ? command.mutateAsync({ operation: done ? 'reopen' : 'confirm', payload: { id: a.id } }) : submitCompletion.mutateAsync(a.id))}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap gap-2 items-center"><span className="meeting-hub__eyebrow">{bundle.projects.find(p => p.id === a.project_id)?.name || 'Project'}</span><Badge variant="secondary">{done ? 'Confirmed complete' : a.step === 2 ? 'Completion review' : 'Open'}</Badge>{!a.published && edit && <Badge variant="outline">Not released</Badge>}</div><div className="flex flex-wrap items-center justify-end gap-2">{edit && a.published && <label className="meeting-hub__report-select"><input type="checkbox" aria-label={`Include ${a.title} in client report`} checked={reportSelected} onChange={event => onReportSelect(event.target.checked)}/><span>Include in report</span></label>}<span className="meeting-hub__owner-chip" aria-label={`Action owner: ${owner}`} style={{ color: ownerColor.accent, borderColor: ownerColor.border, backgroundColor: ownerColor.soft, boxShadow: `0 4px 16px ${ownerColor.glow}` }}><UserRound className="h-4 w-4"/><span><small>Owner</small><strong>{owner}</strong></span></span></div></div><h3 className="mt-2 font-semibold text-lg">{a.title}</h3><p className="text-sm text-muted-foreground mt-1">Ball in court: {a.step === 2 ? 'APAS reviewer' : a.ball_in_court || 'To confirm'} · Due: {a.due_date || 'Not agreed'}</p>{edit && <Button variant="link" className="px-0" onClick={onEdit}>Edit action</Button>}<details className="mt-3"><summary className="cursor-pointer text-sm">{comments.length} updates · Discuss &amp; view evidence</summary>{comments.map(c => <div key={c.id} className="border-l-2 pl-3 my-4"><div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">{c.author_name} · {new Date(c.created_at).toLocaleString()} {edit && <Badge variant="outline" className="ml-2">{c.audience === 'internal' ? 'Team only' : 'Client visible'}</Badge>}</div><p className="whitespace-pre-wrap mt-1">{c.body}</p></div>)}{edit && a.source_quote && <blockquote className="text-sm bg-muted p-3 my-3">{a.source_quote}<br />{a.source_locator}</blockquote>}<form className="mt-4 space-y-3" onSubmit={async e => { e.preventDefault(); if (!body.trim()) return; await addUpdate.mutateAsync({ actionId: a.id, body, audience }); setBody(''); }}><div className="flex flex-wrap gap-2">{bundle.canAddInternalUpdates && <Button type="button" size="sm" variant={audience === 'internal' ? 'default' : 'outline'} onClick={() => setAudience('internal')}>Team instruction</Button>}<Button type="button" size="sm" variant={audience === 'client' ? 'default' : 'outline'} onClick={() => setAudience('client')} disabled={!a.published}>Client-visible update</Button></div><label className="block">{audience === 'internal' ? 'Add instructions for the team' : 'Add an update for the client'}<VoiceDictationTextareaWithAI value={body} onValueChange={setBody} context="notes" placeholder={audience === 'internal' ? 'Dictate context, constraints, evidence needed, and the expected result.' : 'Write a concise progress update the client can understand.'}/></label><Button type="submit" disabled={addUpdate.isPending || !body.trim()}><Send className="mr-2 h-4 w-4"/>{audience === 'internal' ? 'Post team instruction' : 'Publish client update'}</Button></form></details></div></div></article>;
}

function compactClientText(text: string, max = 900) {
    const clean = text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (clean.length <= max)
        return clean;
    const slice = clean.slice(0, max);
    const breakAt = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('\n'));
    return `${slice.slice(0, breakAt > 240 ? breakAt + 1 : max).trim()}...`;
}
function actionStatus(action: Pick<MeetingAction, 'state' | 'step'>) {
    if (['closed', 'approved'].includes(action.state))
        return 'Confirmed complete';
    if (action.step === 2)
        return 'Completion under APAS review';
    return 'Open';
}
function buildClientDigestText(snapshot: MeetingSnapshot, actions: MeetingAction[], bundle: ClientMeetingBundle, purpose: 'progress' | 'decision') {
    const opener = purpose === 'decision'
        ? 'This digest summarizes the reviewed meeting record and the items that need client attention.'
        : 'This digest summarizes the reviewed meeting record in a shorter client-facing format.';
    const sections = snapshot.sections.slice(0, 4).map(section => `${section.heading}\n${compactClientText(section.text)}`);
    const actionLines = actions.slice(0, 8).map(action => {
        const project = bundle.projects.find(p => p.id === action.project_id)?.name || 'Project';
        const owner = action.assignee_name || action.ball_in_court || 'To be assigned';
        const due = action.due_date ? ` Due ${action.due_date}.` : '';
        return `${action.title}: ${actionStatus(action)}. ${project}. Owner: ${owner}.${due}`;
    });
    return [opener, ...sections, actionLines.length ? `Client visible actions\n${actionLines.join('\n')}` : 'No client-visible actions are attached to this digest yet.'].join('\n\n');
}
function MeetingDigestDialog({ bundle, publication, actions, portalUrl, close }: {
    bundle: ClientMeetingBundle;
    publication: MeetingPublication;
    actions: MeetingAction[];
    portalUrl: string;
    close: () => void;
}) {
    const [purpose, setPurpose] = useState<'progress' | 'decision'>('progress');
    const [title, setTitle] = useState(`${bundle.client.name}: ${publication.snapshot.title} digest`);
    const [digest, setDigest] = useState(() => buildClientDigestText(publication.snapshot, actions, bundle, 'progress'));
    const [includeActions, setIncludeActions] = useState(true);
    const [emailOpen, setEmailOpen] = useState(false);
    const meetingDate = publication.snapshot.meeting_date;
    const refreshPurpose = (nextPurpose: 'progress' | 'decision') => {
        setPurpose(nextPurpose);
        setDigest(buildClientDigestText(publication.snapshot, actions, bundle, nextPurpose));
    };
    const snapshot: MeetingSnapshot = {
        title,
        meeting_date: meetingDate,
        client_name: bundle.client.name,
        attendees: 'Prepared by APAS Consulting',
        project_ids: publication.snapshot.project_ids,
        sections: [
            {
                heading: purpose === 'decision' ? 'Client decision digest' : 'Client progress digest',
                text: digest,
                basis: 'verified',
            },
        ],
        actions: includeActions ? actions.map(action => ({
            id: action.id,
            title: action.title,
            project: bundle.projects.find(project => project.id === action.project_id)?.name || 'Project',
            assignee: action.assignee_name,
            ball_in_court: action.step === 2 ? 'APAS reviewer' : action.ball_in_court,
            due_date: action.due_date,
            state: action.state,
            step: action.step,
        })) : [],
    };
    return <><Dialog open onOpenChange={value => !value && close()}><DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>Create client digest from reviewed meeting</DialogTitle></DialogHeader><div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]"><div className="space-y-4"><div className="rounded-xl border bg-muted/30 p-3 text-sm"><strong>Notion stays the working source.</strong><p className="mt-1 text-muted-foreground">This digest starts from the approved Proj OS meeting snapshot, excludes raw transcript material, and lets APAS edit the client-facing version before email or PDF delivery.</p></div><div className="grid grid-cols-2 gap-2"><Button type="button" variant={purpose === 'progress' ? 'default' : 'outline'} onClick={() => refreshPurpose('progress')}>Progress update</Button><Button type="button" variant={purpose === 'decision' ? 'default' : 'outline'} onClick={() => refreshPurpose('decision')}>Decision note</Button></div><label className="block">Digest title<Input value={title} onChange={event => setTitle(event.target.value)}/></label><label className="block">Editable client digest<VoiceDictationTextareaWithAI value={digest} onValueChange={setDigest} context="notes" placeholder="Edit the short client version here before sending." className="mt-1 min-h-72"/></label><label className="flex items-start gap-2 rounded-xl border bg-background p-3 text-sm"><input type="checkbox" className="mt-1" checked={includeActions} onChange={event => setIncludeActions(event.target.checked)}/><span><strong>Attach client-visible action register</strong><br/><span className="text-muted-foreground">{actions.length} approved action{actions.length === 1 ? '' : 's'} from this meeting can be included below the digest.</span></span></label><Button className="w-full" disabled={!title.trim() || !digest.trim()} onClick={() => setEmailOpen(true)}><Mail className="mr-2 h-4 w-4"/>Email digest HTML + PDF</Button></div><div className="min-w-0"><PublishedReport snapshot={snapshot}/></div></div></DialogContent></Dialog><BrandedReportEmailDialog open={emailOpen} onOpenChange={setEmailOpen} reportTitle={snapshot.title} projectName={bundle.client.name} filename={`Meeting-Digest-${meetingDate}.pdf`} defaultSubject={`${bundle.client.name}: meeting digest | ${meetingDate}`} defaultMessage={`Please see the attached meeting digest for ${bundle.client.name}.`} sourceModule="client-meetings" reportType="client_meeting_digest" clientMeetingPublicationId={publication.id} prepareDelivery={async deliveryMessage => {
        const bodyHtml = meetingReportHtml(snapshot, portalUrl, deliveryMessage);
        const pdf = await htmlReportPdfBase64(meetingReportHtml(snapshot, portalUrl), { pageAware: true });
        return { bodyHtml, bodyText: `${deliveryMessage}\n${snapshot.title}\n${portalUrl}`, pdfBase64: pdf.base64, pdfSize: pdf.size };
    }}/></>;
}
function ActionUpdateReportDialog({ bundle, actions, portalUrl, close }: {
    bundle: ClientMeetingBundle;
    actions: MeetingAction[];
    portalUrl: string;
    close: () => void;
}) {
    const [purpose, setPurpose] = useState<'progress' | 'request'>('progress');
    const [title, setTitle] = useState(`${bundle.client.name} action update`);
    const [message, setMessage] = useState('');
    const [emailOpen, setEmailOpen] = useState(false);
    const today = new Date().toISOString().slice(0, 10);
    const projectGroups = bundle.projects.filter(project => actions.some(action => action.project_id === project.id));
    const snapshot: MeetingSnapshot = {
        title,
        meeting_date: today,
        client_name: bundle.client.name,
        attendees: 'Prepared by APAS Consulting',
        project_ids: projectGroups.map(project => project.id),
        sections: [
            {
                heading: purpose === 'request' ? 'Update requested' : 'Portfolio action update',
                text: message.trim() || (purpose === 'request'
                    ? 'Please review the selected action items and provide the requested status, decision, or supporting information in the secure client portal.'
                    : 'This report summarizes the selected client-visible action items and their current recorded status.'),
                basis: 'verified',
            },
            ...projectGroups.map(project => {
                const projectActions = actions.filter(action => action.project_id === project.id);
                const text = projectActions.map(action => {
                    const update = bundle.comments.filter(comment => comment.action_id === action.id && comment.audience === 'client').at(-1);
                    const status = ['closed', 'approved'].includes(action.state) ? 'Confirmed complete' : action.step === 2 ? 'Completion review' : 'Open';
                    return `${action.title}\nOwner: ${action.assignee_name || 'Unassigned'}\nStatus: ${status}${action.due_date ? `\nDue: ${action.due_date}` : ''}${update ? `\nLatest update: ${update.body}` : ''}`;
                }).join('\n\n');
                return { heading: `Project: ${project.name}`, text, basis: 'verified' as const };
            }),
        ],
        actions: actions.map(action => ({
            id: action.id,
            title: action.title,
            project: bundle.projects.find(project => project.id === action.project_id)?.name || 'Project',
            assignee: action.assignee_name,
            ball_in_court: action.step === 2 ? 'APAS reviewer' : action.ball_in_court,
            due_date: action.due_date,
            state: action.state,
            step: action.step,
        })),
    };
    return <><Dialog open onOpenChange={value => !value && close()}><DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Compile selected action update</DialogTitle></DialogHeader><div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"><div className="space-y-4"><div className="grid grid-cols-2 gap-2"><Button type="button" variant={purpose === 'progress' ? 'default' : 'outline'} onClick={() => setPurpose('progress')}>Send update</Button><Button type="button" variant={purpose === 'request' ? 'default' : 'outline'} onClick={() => setPurpose('request')}>Request update</Button></div><label className="block">Report title<Input value={title} onChange={event => setTitle(event.target.value)}/></label><label className="block">Opening note<VoiceDictationTextareaWithAI value={message} onValueChange={setMessage} context="notes" placeholder="Dictate a concise message for the client. Only approved, client-visible content will be included." className="mt-1 min-h-36"/></label><div className="rounded-xl border bg-muted/30 p-3 text-sm"><strong>{actions.length} selected action{actions.length === 1 ? '' : 's'}</strong><p className="mt-1 text-muted-foreground">Grouped across {projectGroups.length} project{projectGroups.length === 1 ? '' : 's'}. Team-only comments and source evidence are excluded.</p></div><Button className="w-full" disabled={!title.trim() || !actions.length} onClick={() => setEmailOpen(true)}><Mail className="mr-2 h-4 w-4"/>Email HTML + PDF</Button></div><div className="min-w-0"><PublishedReport snapshot={snapshot}/></div></div></DialogContent></Dialog><BrandedReportEmailDialog open={emailOpen} onOpenChange={setEmailOpen} reportTitle={snapshot.title} projectName={bundle.client.name} filename={`Action-Update-${today}.pdf`} defaultSubject={`${bundle.client.name}: ${purpose === 'request' ? 'action update requested' : 'action update'} | ${today}`} defaultMessage={message} sourceModule="client-meetings" reportType="client_action_update" prepareDelivery={async deliveryMessage => {
        const bodyHtml = meetingReportHtml(snapshot, portalUrl, deliveryMessage);
        const pdf = await htmlReportPdfBase64(meetingReportHtml(snapshot, portalUrl), { pageAware: true });
        return { bodyHtml, bodyText: `${deliveryMessage}\n${snapshot.title}\n${portalUrl}`, pdfBase64: pdf.base64, pdfSize: pdf.size };
    }}/></>;
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
    return <Dialog open onOpenChange={v => !v && close()}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Weekly client and team delivery</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Send the newest approved report as a concise APAS-branded HTML email with a direct link to the client portal. Put the client in To and the responsible project team in CC. Unapproved drafts, private Notion source material, and team-only instructions are never included.</p><form className="space-y-4" onSubmit={form.handleSubmit(async (v) => { const [recipients, cc, bcc] = await Promise.all([emails(v.recipients), emails(v.cc), emails(v.bcc)]); await command.mutateAsync({ operation: 'schedule', payload: { ...v, weekday: Number(v.weekday), hour: Number(v.hour), recipients, cc, bcc } }); toast.success('Weekly delivery preferences saved'); close(); })}><label className="flex items-center gap-2"><input type="checkbox" {...form.register('enabled')}/>Enable weekly delivery</label><div className="grid grid-cols-2 gap-3"><label>Day<select className="meeting-hub__select" {...form.register('weekday')}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label><label>Hour<select className="meeting-hub__select" {...form.register('hour')}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}</select></label></div><label className="block">Time zone<Input {...form.register('timezone')} placeholder="America/New_York"/></label><label className="block">Client recipients (To)<Textarea {...form.register('recipients')} placeholder="Client email addresses separated by commas"/></label><label className="block">Project team (CC)<Textarea {...form.register('cc')} placeholder="Responsible team email addresses separated by commas"/></label><label className="block">Private copy (BCC)<Textarea {...form.register('bcc')} placeholder="Optional email addresses separated by commas"/></label><p className="text-xs text-muted-foreground">Delivery occurs during the selected hour. BCC stays private. Every delivery links to the same approved portal report, so the client and team see one controlled version.</p><Button type="submit" disabled={command.isPending}>Save delivery preferences</Button></form>{bundle.deliveries.slice(0, 3).map(d => <p key={d.id} className="text-xs">{new Date(d.updated_at).toLocaleString()}: {d.status}{d.error ? ` (${d.error})` : ''}</p>)}</DialogContent></Dialog>;
}
