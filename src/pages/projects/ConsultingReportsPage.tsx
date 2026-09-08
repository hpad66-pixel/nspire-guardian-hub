import { useQuery } from '@tanstack/react-query';
import { ReportEvidencePanel, type EvidenceMode } from '@/components/reports/ReportEvidencePanel';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight, Cloud,
  ExternalLink, FileChartColumn, FileDown, FileText, Image as ImageIcon, Loader2,
  Mail, MessageSquareText, MoreHorizontal, Paperclip, Plus, Save, Send, ShieldCheck,
  Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProRichTextEditor } from '@/components/ui/rich-text-editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { BrandedReportEmailDialog } from '@/components/reports/BrandedReportEmailDialog';
import { useProject } from '@/hooks/useProjects';
import {
  useConsultingReports, useConsultingReportSources,
  type ConsultingReport, type ConsultingReportSource, type ReportConversationMessage,
} from '@/hooks/useConsultingReports';
import { useGoogleDriveReport, type GoogleDriveFile } from '@/hooks/useGoogleDriveReport';
import { useGmailConnection } from '@/hooks/useGmailConnection';
import { supabase } from '@/integrations/supabase/client';
import {
  buildConsultingReportHtml, downloadConsultingReport, prepareConsultingReportDelivery,
  removeLongDashes, secureMandatoryDocumentPages, isPlacedEvidence,
} from '@/lib/reports/consultingReport';
import { projectKind } from '@/lib/projectKind';
import { cn } from '@/lib/utils';

const SOURCE_ACCEPT = 'image/*,.pdf,.docx,.csv,.txt,.md,.xlsx,.xls,.pptx';
const statusMeta = {
  draft: { label: 'Draft', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ready: { label: 'Ready for review', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  issued: { label: 'Issued', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90) || 'apas-consulting-report';
}

export default function ConsultingReportsPage() {
  const { projectId, reportId: routeReportId } = useParams<{ projectId: string; reportId?: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(projectId ?? null);
  const reports = useConsultingReports(projectId ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(routeReportId ?? null);

  useEffect(() => { setSelectedId(routeReportId ?? null); }, [routeReportId]);

  const selected = (reports.data ?? []).find((report) => report.id === selectedId) ?? null;
  async function createReport() {
    try {
      const report = await reports.create.mutateAsync(`${project?.name || 'Project'} Consulting Report`);
      setSelectedId(report.id);
      navigate(`/projects/${projectId}/reports/${report.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the report.');
    }
  }

  if (!projectId) return null;
  if (projectLoading) return <div className="grid min-h-[55vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-700" /></div>;
  if (project && projectKind(project) !== 'consulting') {
    return <div className="container mx-auto max-w-3xl p-6"><Card><CardContent className="p-10 text-center"><FileChartColumn className="mx-auto h-9 w-9 text-muted-foreground" /><h1 className="mt-4 font-display text-3xl text-[#082b23]">Reports is configured for consulting projects</h1><p className="mt-2 text-muted-foreground">Use the construction reporting tools for schedule-of-values and field reporting workflows.</p><Button className="mt-5" onClick={() => navigate(`/projects/${projectId}`)}>Return to project</Button></CardContent></Card></div>;
  }
  if (selected) return <ReportWorkspace key={selected.id} report={selected} projectId={projectId} projectName={project?.name || 'Consulting project'} onBack={() => { setSelectedId(null); navigate(`/projects/${projectId}/reports`); }} reports={reports} />;

  return (
    <div className="container mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#061f19] via-[#082b23] to-[#0d6b57] p-6 text-white shadow-[0_22px_65px_rgba(8,43,35,.16)] sm:p-8">
        <div className="absolute -right-24 -top-36 h-96 w-96 rounded-full border border-amber-300/20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-emerald-50/75 hover:bg-white/10 hover:text-white" onClick={() => navigate(`/projects/${projectId}`)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to project</Button>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-300"><FileChartColumn className="h-4 w-4" />APAS Consulting</p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl">Reports</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/75 sm:text-base">Talk through the assignment, collect private source records and photographs, edit the narrative, then issue one consistent client-ready report.</p>
          </div>
          <Button className="h-12 rounded-xl bg-amber-300 px-5 font-bold text-amber-950 hover:bg-amber-200" onClick={() => void createReport()} disabled={reports.create.isPending}>{reports.create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}New report</Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <ProcessCard number="01" icon={MessageSquareText} title="Narrate" body="Describe the assignment in plain English and refine it with the report editor." />
        <ProcessCard number="02" icon={Paperclip} title="Source" body="Select Drive images, manifests, and project files with a traceable source register." />
        <ProcessCard number="03" icon={ShieldCheck} title="Review and issue" body="Edit every word, preview the final pages, then email matching HTML and PDF." />
      </section>

      {reports.isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : !(reports.data ?? []).length ? (
        <Card className="overflow-hidden border-dashed"><CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center"><div><h2 className="font-display text-3xl text-[#082b23]">Start with the conversation, not a blank template</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Tell the report editor what happened, what the client needs to understand, and what decision or action should follow. Add the supporting records when you are ready.</p></div><Button onClick={() => void createReport()}><Sparkles className="mr-2 h-4 w-4" />Create the first report</Button></CardContent></Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(reports.data ?? []).map((report) => {
            const meta = statusMeta[report.status];
            return <Card key={report.id} className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"><div className="h-2 bg-gradient-to-r from-[#082b23] via-[#0d6b57] to-[#dfbd67]" /><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><FileText className="h-5 w-5" /></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onClick={() => { if (window.confirm(`Delete “${report.title}”? Its private report sources will also be removed.`)) void reports.remove.mutateAsync(report.id).catch((error) => toast.error(error.message)); }}><Trash2 className="mr-2 h-4 w-4" />Delete report</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><Badge variant="outline" className={cn('mt-4', meta.className)}>{meta.label}</Badge><h2 className="mt-3 line-clamp-2 font-display text-2xl text-[#082b23]">{report.title}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{report.subtitle || 'Client-ready APAS Consulting report'}</p><div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground"><span>Updated {formatDate(report.updated_at)}</span><Button size="sm" variant="ghost" className="text-emerald-800" onClick={() => navigate(`/projects/${projectId}/reports/${report.id}`)}>Open<ChevronRight className="ml-1 h-4 w-4" /></Button></div></CardContent></Card>;
          })}
        </section>
      )}
    </div>
  );
}

function ProcessCard({ number, icon: Icon, title, body }: { number: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return <div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-emerald-700" /><span className="text-[10px] font-black tracking-[.15em] text-amber-700">{number}</span></div><h2 className="mt-3 font-semibold text-[#082b23]">{title}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div>;
}

type ReportsHook = ReturnType<typeof useConsultingReports>;

function ReportWorkspace({ report, projectId, projectName, onBack, reports }: { report: ConsultingReport; projectId: string; projectName: string; onBack: () => void; reports: ReportsHook }) {
  const sources = useConsultingReportSources(report.id, projectId);
  const [title, setTitle] = useState(report.title);
  const [subtitle, setSubtitle] = useState(report.subtitle ?? '');
  const [reportDate, setReportDate] = useState(report.report_date);
  const [bodyHtml, setBodyHtml] = useState(report.body_html);
  const [conversation, setConversation] = useState<ReportConversationMessage[]>(report.conversation ?? []);
  const [narrative, setNarrative] = useState('');
  const [tab, setTab] = useState('conversation');
  const [thinking, setThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [driveOpen, setDriveOpen] = useState(false);
  const [placementMode, setPlacementMode] = useState<EvidenceMode>('supporting');
  const [photoLimit, setPhotoLimit] = useState(Number(report.generation_notes?.photoLimit ?? 8));
  const [analyzing, setAnalyzing] = useState(false);
  const placementRef = useRef<EvidenceMode>('supporting');
  const mandatoryPages = useQuery({ queryKey: ['report-receipt-pages', report.id, (sources.data || []).filter(s => s.placement_mode === 'mandatory').map(s => s.id).join(',')], enabled: tab === 'preview', queryFn: () => secureMandatoryDocumentPages(sources.data || []) });
  const uploadRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentReport = useMemo<ConsultingReport>(() => ({ ...report, title, subtitle: subtitle || null, report_date: reportDate, body_html: bodyHtml, conversation }), [bodyHtml, conversation, report, reportDate, subtitle, title]);
  const includedSources = (sources.data ?? []).filter((source) => source.included || source.placement_mode === 'mandatory');
  const previewHtml = useMemo(() => buildConsultingReportHtml({ projectName, report: currentReport, sources: sources.data ?? [], documentPages: mandatoryPages.data, imageUrls: Object.fromEntries((sources.data ?? []).filter((source) => source.preview_url).map((source) => [source.id, source.preview_url!])) }), [currentReport, projectName, sources.data, mandatoryPages.data]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [conversation]);

  async function saveReport(patch: Partial<ConsultingReport> = {}) {
    setSaving(true);
    try {
      await reports.update.mutateAsync({ id: report.id, title: removeLongDashes(title.trim() || 'Untitled report'), subtitle: removeLongDashes(subtitle.trim()) || null, report_date: reportDate, body_html: removeLongDashes(bodyHtml), conversation, ...patch });
      toast.success('Report saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The report could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function askReportEditor() {
    const message = removeLongDashes(narrative.trim());
    if (!message) return;
    const userMessage: ReportConversationMessage = { id: crypto.randomUUID(), role: 'user', content: message, createdAt: new Date().toISOString() };
    const next = [...conversation, userMessage];
    setConversation(next);
    setNarrative('');
    setThinking(true);
    try {
      await reports.update.mutateAsync({ id: report.id, conversation: next });
      const { data, error } = await supabase.functions.invoke('consulting-report-ai', { body: { operation: 'conversation', projectId, reportId: report.id, conversation: next } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const assistantMessage: ReportConversationMessage = { id: crypto.randomUUID(), role: 'assistant', content: removeLongDashes(String(data.reply ?? '')), createdAt: new Date().toISOString() };
      const complete = [...next, assistantMessage];
      setConversation(complete);
      await reports.update.mutateAsync({ id: report.id, conversation: complete });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The report editor could not respond.');
    } finally {
      setThinking(false);
    }
  }

  async function reviewPhotographs(force = false) {
    const images = includedSources.filter(s => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(s.mime_type || '') && (force || !s.visual_analysis?.summary));
    setAnalyzing(true);
    try {
      for (let start = 0; start < images.length; start += 8) {
        toast.loading('Reviewing photos ' + (start + 1) + '-' + Math.min(start + 8, images.length) + ' of ' + images.length, { id: 'report-photo-review' });
        const { data, error } = await supabase.functions.invoke('consulting-report-ai', { body: { operation: 'analyze', projectId, reportId: report.id, sourceIds: images.slice(start, start + 8).map(s => s.id), conversation } });
        if (error || data?.error) throw error || new Error(data.error);
      }
      await sources.refetch();
      if (images.length) toast.success('Photo review complete. Generate the report to apply the recommended selection.', { id: 'report-photo-review' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Photo review failed.', { id: 'report-photo-review' });
      throw error;
    } finally { setAnalyzing(false); }
  }

  async function generateDraft() {
    if (generating || analyzing || sources.upload.isPending || sources.update.isPending) return;
    if (!conversation.some((message) => message.role === 'user')) {
      toast.error('Tell the report editor what the report needs to cover first.');
      setTab('conversation');
      return;
    }
    setGenerating(true);
    const progress = toast.loading('Building the report from the reviewed narrative and selected sources...');
    try {
      await sources.extractDocuments();
      await reviewPhotographs(true);
      const { data, error } = await supabase.functions.invoke('consulting-report-ai', { body: { operation: 'generate', projectId, reportId: report.id, conversation, photoLimit } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const selectedIds = new Set<string>(data.selectedSourceIds || []);
      await sources.applySelection([...selectedIds]);
      const nextTitle = removeLongDashes(String(data.title ?? title));
      const nextSubtitle = removeLongDashes(String(data.subtitle ?? subtitle));
      const nextBody = removeLongDashes(String(data.bodyHtml ?? bodyHtml));
      setTitle(nextTitle); setSubtitle(nextSubtitle); setBodyHtml(nextBody);
      await reports.update.mutateAsync({ id: report.id, title: nextTitle, subtitle: nextSubtitle || null, body_html: nextBody, generation_notes: { editorNote: data.editorNote, model: data.model, generatedAt: new Date().toISOString(), photoLimit, sourceCount: includedSources.length }, status: 'draft' });
      setTab('draft');
      toast.success('Report draft created. Review and edit every section before issue.', { id: progress });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The report could not be generated.', { id: progress });
    } finally {
      setGenerating(false);
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const progress = toast.loading(`Adding ${files.length} source file${files.length === 1 ? '' : 's'}...`);
    try {
      const selectedFiles = Array.from(files);
      if (placementRef.current === 'mandatory' && selectedFiles.some(file => !file.type.startsWith('image/') && file.type !== 'application/pdf')) throw new Error('Use images or PDF files for mandatory evidence. Add other documents to Supporting documents and photos.');
      await sources.upload.mutateAsync({ files: selectedFiles, placementMode: placementRef.current });
      toast.success('Sources added to the private project manifest.', { id: progress });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The files could not be added.', { id: progress });
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f4f6f4]">
      <input ref={uploadRef} type="file" multiple accept={placementMode === "mandatory" ? "image/*,.pdf" : SOURCE_ACCEPT} className="hidden" onChange={(event) => { void addFiles(event.target.files); event.target.value = ''; }} />
      <header className="sticky top-0 z-20 border-b bg-[#071f19]/95 text-white shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="sm" className="text-emerald-50/75 hover:bg-white/10 hover:text-white" onClick={onBack}><ArrowLeft className="mr-1.5 h-4 w-4" />Reports</Button>
          <div className="hidden h-6 w-px bg-white/15 sm:block" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{title || 'Untitled report'}</p><p className="truncate text-[10px] uppercase tracking-[.12em] text-emerald-100/55">{projectName} | APAS Consulting</p></div>
          <Badge variant="outline" className={cn('border-white/15', statusMeta[currentReport.status].className)}>{statusMeta[currentReport.status].label}</Badge>
          <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => void saveReport()} disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}Save</Button>
          <Button size="sm" className="bg-amber-300 font-bold text-amber-950 hover:bg-amber-200" onClick={() => void generateDraft()} disabled={generating || analyzing || sources.upload.isPending || sources.update.isPending}>{generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}Generate report</Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-3 sm:p-5">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl bg-white p-1 shadow-sm sm:w-[720px]">
            <TabsTrigger value="conversation" className="gap-2 rounded-lg py-2.5"><MessageSquareText className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Conversation</span></TabsTrigger>
            <TabsTrigger value="sources" className="gap-2 rounded-lg py-2.5"><Paperclip className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Sources</span><Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{includedSources.length}</Badge></TabsTrigger>
            <TabsTrigger value="draft" className="gap-2 rounded-lg py-2.5"><FileText className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Draft</span></TabsTrigger>
            <TabsTrigger value="preview" className="gap-2 rounded-lg py-2.5"><BookOpen className="h-4 w-4" /><span className="text-[10px] sm:text-sm">Preview</span></TabsTrigger>
          </TabsList>

          <TabsContent value="conversation" className="mt-0">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
              <Card className="overflow-hidden"><div className="border-b bg-gradient-to-r from-emerald-50 to-amber-50/50 px-5 py-4"><h2 className="font-display text-2xl text-[#082b23]">Talk through the report</h2><p className="text-sm text-muted-foreground">Speak naturally. The editor will organize the assignment, identify missing evidence, and prepare the report only when you ask.</p></div><div ref={scrollRef} className="h-[460px] space-y-4 overflow-y-auto p-4 sm:p-5">{conversation.length ? conversation.map((message) => <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed', message.role === 'user' ? 'bg-[#082b23] text-white' : 'border border-emerald-100 bg-emerald-50/60 text-[#173a32]')}><p className="mb-1 text-[9px] font-black uppercase tracking-[.12em] opacity-60">{message.role === 'user' ? 'You' : 'APAS report editor'}</p><p className="whitespace-pre-wrap">{message.content}</p></div></div>) : <div className="grid h-full place-items-center text-center"><div><Sparkles className="mx-auto h-8 w-8 text-amber-500" /><h3 className="mt-3 font-display text-2xl text-[#082b23]">Start with what happened</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Describe the purpose, audience, key facts, findings, decisions, and action you want from the client. You can add evidence before or after the conversation.</p></div></div>}{thinking && <div className="flex justify-start"><div className="rounded-2xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Reviewing the narrative and manifest...</div></div>}</div><div className="border-t bg-white p-4"><Textarea value={narrative} onChange={(event) => setNarrative(removeLongDashes(event.target.value))} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); void askReportEditor(); } }} rows={4} placeholder="Example: This report is for R4. Summarize the site walk, group the visible conditions by trade, state what must happen before the inspection, and identify the decisions I need from the owner..." /><div className="mt-2 flex items-center justify-between gap-3"><p className="text-[11px] text-muted-foreground">Cmd or Ctrl + Enter to send. No word limit.</p><Button onClick={() => void askReportEditor()} disabled={!narrative.trim() || thinking}><Send className="mr-2 h-4 w-4" />Send</Button></div></div></Card>
              <aside className="space-y-3"><GuidanceCard number="1" title="State the purpose" body="Who will read it, what happened, and what decision or action should follow?" /><GuidanceCard number="2" title="Add the evidence" body="Upload the manifests and select the Google Drive folder containing the photographs." /><GuidanceCard number="3" title="Review the distinction" body="Verified facts, author narrative, and AI interpretation must remain clear before issue." /><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 font-semibold text-amber-950"><ShieldCheck className="h-4 w-4" />Human approval required</div><p className="mt-2 text-xs leading-relaxed text-amber-950/70">Generating a draft never sends it. You must edit, mark it ready, and choose the recipients.</p></div></aside>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="mt-0">
            <ReportEvidencePanel sources={sources.data || []} loading={sources.isLoading} busy={generating || analyzing || sources.upload.isPending || sources.update.isPending} photoLimit={photoLimit} onPhotoLimit={setPhotoLimit}
              onUpload={mode => { placementRef.current = mode; setPlacementMode(mode); if (uploadRef.current) uploadRef.current.accept = mode === 'mandatory' ? 'image/*,.pdf' : SOURCE_ACCEPT; uploadRef.current?.click(); }}
              onDrive={mode => { setPlacementMode(mode); setDriveOpen(true); }}
              onAnalyze={() => void reviewPhotographs(true).catch(() => {})}
              onUpdate={(id, patch) => void sources.update.mutateAsync({ id, ...patch }).catch(error => toast.error(error.message))}
              onRemove={source => { if (window.confirm('Remove ' + source.source_name + ' from this report?')) void sources.remove.mutateAsync(source).catch(error => toast.error(error.message)); }} />
          </TabsContent>

          <TabsContent value="draft" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"><Card><CardContent className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Report title</Label><Input value={title} onChange={(event) => setTitle(removeLongDashes(event.target.value))} className="text-base font-semibold" /></div><div className="space-y-2 sm:col-span-2"><Label>Subtitle</Label><Input value={subtitle} onChange={(event) => setSubtitle(removeLongDashes(event.target.value))} /></div><div className="space-y-2"><Label>Report date</Label><Input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} /></div><div className="space-y-2"><Label>Review status</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">{statusMeta[currentReport.status].label}</div></div></div><div className="space-y-2"><div className="flex items-center justify-between"><Label>Report narrative</Label><span className="text-[11px] text-muted-foreground">Fully editable before issue</span></div><ProRichTextEditor content={bodyHtml} onChange={(html) => setBodyHtml(removeLongDashes(html))} placeholder="Generate a draft or begin writing the report..." minHeight="620px" /></div></CardContent></Card><aside className="space-y-3"><div className="rounded-2xl border bg-white p-4"><h3 className="font-semibold text-[#082b23]">Report controls</h3><div className="mt-3 grid gap-2"><Button variant="outline" onClick={() => void saveReport()} disabled={saving}><Save className="mr-2 h-4 w-4" />Save changes</Button><Button variant="outline" onClick={() => { setTab('preview'); void saveReport({ status: 'ready' }); }}><CheckCircle2 className="mr-2 h-4 w-4" />Mark ready and preview</Button><Button onClick={() => void generateDraft()} disabled={generating || analyzing || sources.upload.isPending || sources.update.isPending}><Sparkles className="mr-2 h-4 w-4" />Regenerate from sources</Button></div></div><div className="rounded-2xl border bg-white p-4"><h3 className="font-semibold text-[#082b23]">Automatic document structure</h3><ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground"><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />APAS Consulting cover page</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Live table of contents</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Readable client typography</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Selected photographic record</li><li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />Controlled source manifest</li></ul></div></aside></div>
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"><Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3"><div><p className="font-semibold text-[#082b23]">Client-ready preview</p><p className="text-xs text-muted-foreground">Cover, contents, narrative, photographs, and manifest</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void downloadConsultingReport({ projectName, report: currentReport, sources: sources.data ?? [] }).catch((error) => toast.error(error.message))}><FileDown className="mr-1.5 h-4 w-4" />Download PDF</Button><Button size="sm" onClick={() => setEmailOpen(true)}><Mail className="mr-1.5 h-4 w-4" />Email client</Button></div></div>{mandatoryPages.error && <p role="alert" className="p-4 text-sm text-destructive">Could not load a mandatory receipt. Retry the preview before sending.</p>}<iframe sandbox="" title="Consulting report preview" srcDoc={previewHtml} className="h-[900px] w-full bg-slate-100" /></Card><aside className="space-y-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-semibold text-emerald-950"><CheckCircle2 className="h-4 w-4" />Issue checklist</div><div className="mt-3 space-y-2 text-xs text-emerald-950/75"><p>{conversation.filter((message) => message.role === 'user').length} author narrative entries reviewed</p><p>{includedSources.length} source records included</p><p>{includedSources.filter((source) => source.mime_type?.startsWith('image/') && isPlacedEvidence(source)).length} photographs placed</p><p>Long dash characters removed</p></div></div><Button className="w-full" onClick={() => setEmailOpen(true)}><Mail className="mr-2 h-4 w-4" />Issue as HTML + PDF</Button><Button variant="outline" className="w-full" onClick={() => setTab('draft')}><FileText className="mr-2 h-4 w-4" />Return to editor</Button></aside></div>
          </TabsContent>
        </Tabs>
      </main>

      <GoogleDriveDialog open={driveOpen} onOpenChange={setDriveOpen} reportId={report.id} projectId={projectId} placementMode={placementMode} />
      <BrandedReportEmailDialog open={emailOpen} onOpenChange={setEmailOpen} reportTitle={title} projectName={projectName} projectId={projectId} filename={`${safeSlug(title)}.pdf`} defaultSubject={`${projectName} - ${title}`} defaultMessage={`Please review the attached ${title}. The report is included in the email and attached as a matching PDF for your records.`} sourceModule="consulting_reports" reportType="consulting_report" reportId={report.id} prepareDelivery={(personalMessage) => prepareConsultingReportDelivery({ projectName, report: currentReport, sources: sources.data ?? [], personalMessage })} onSent={async () => { await reports.update.mutateAsync({ id: report.id, status: 'issued', issued_at: new Date().toISOString() }); }} />
    </div>
  );
}

function GuidanceCard({ number, title, body }: { number: string; title: string; body: string }) { return <div className="rounded-2xl border bg-white p-4"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#082b23] text-[10px] font-black text-amber-300">{number}</span><div><h3 className="font-semibold text-[#082b23]">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div></div></div>; }

function GoogleDriveDialog({ open, onOpenChange, reportId, projectId, placementMode }: { placementMode: EvidenceMode; open: boolean; onOpenChange: (open: boolean) => void; reportId: string; projectId: string }) {
  const google = useGmailConnection();
  const drive = useGoogleDriveReport(reportId, projectId);
  const [folderUrl, setFolderUrl] = useState('');
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const driveConnected = Boolean(google.status.data?.driveConnected);

  async function loadFolder() {
    try {
      const rows = await drive.listFolder.mutateAsync(folderUrl);
      setFiles(rows.filter((file) => file.mimeType !== 'application/vnd.google-apps.folder' && (placementMode !== 'mandatory' || file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf')));
      setSelected(new Set());
      if (!rows.length) toast.info('That folder is empty or contains no visible files.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not open the Drive folder.'); }
  }
  async function importSelected() {
    if (!selected.size) return;
    const progress = toast.loading(`Importing ${selected.size} selected Drive file${selected.size === 1 ? '' : 's'}...`);
    try {
      const result = await drive.importFiles.mutateAsync({ fileIds: [...selected], placementMode });
      toast.success(`${result.imported.length} file${result.imported.length === 1 ? '' : 's'} copied into the private report manifest.${result.skipped ? ` ${result.skipped} could not be imported.` : ''}`, { id: progress });
      onOpenChange(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Drive files could not be imported.', { id: progress }); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-3xl"><DialogHeader><div className="mb-1 grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Cloud className="h-5 w-5" /></div><DialogTitle className="font-display text-2xl text-[#082b23]">{placementMode === 'mandatory' ? 'Add mandatory photos and receipts' : 'Add supporting documents and photos'}</DialogTitle><DialogDescription>Proj OS requests read-only Drive access. Only the files you select are copied into this project report.</DialogDescription></DialogHeader>{google.status.isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : !driveConnected ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-emerald-700" /><h3 className="mt-3 font-semibold text-[#082b23]">Connect Google Drive securely</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your Google password is never stored. Proj OS receives read-only file permission and does not edit or delete anything in Drive.</p><Button className="mt-5" onClick={() => google.connectDrive.mutate(window.location.pathname)} disabled={google.connectDrive.isPending}>{google.connectDrive.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}Connect Google Drive</Button></div> : <div className="min-h-0 space-y-4"><div className="rounded-xl border bg-muted/30 p-3"><Label htmlFor="drive-folder">Google Drive folder link</Label><div className="mt-2 flex gap-2"><Input id="drive-folder" value={folderUrl} onChange={(event) => setFolderUrl(event.target.value)} placeholder="https://drive.google.com/drive/folders/..." /><Button onClick={() => void loadFolder()} disabled={!folderUrl.trim() || drive.listFolder.isPending}>{drive.listFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open folder'}</Button></div></div>{files.length > 0 && <><div className="flex items-center justify-between text-sm"><p><strong>{files.length}</strong> visible files | <strong>{selected.size}</strong> selected</p><Button variant="ghost" size="sm" onClick={() => setSelected(selected.size === files.length ? new Set() : new Set(files.map((file) => file.id)))}>{selected.size === files.length ? 'Clear all' : 'Select all'}</Button></div><ScrollArea className="h-[380px] rounded-xl border"><div className="grid gap-2 p-3 sm:grid-cols-2">{files.map((file) => { const checked = selected.has(file.id); return <button type="button" key={file.id} onClick={() => setSelected((current) => { const next = new Set(current); if (next.has(file.id)) next.delete(file.id); else next.add(file.id); return next; })} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition', checked ? 'border-emerald-400 bg-emerald-50' : 'bg-white hover:border-emerald-200')}><span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', file.mimeType.startsWith('image/') ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700')}>{file.mimeType.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{file.name}</span><span className="block truncate text-[10px] text-muted-foreground">{file.mimeType.replace('application/', '').replace('vnd.google-apps.', 'Google ')}</span></span>{checked && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}</button>; })}</div></ScrollArea></>}</div>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>{driveConnected && <Button onClick={() => void importSelected()} disabled={!selected.size || drive.importFiles.isPending}>{drive.importFiles.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}Import selected</Button>}</DialogFooter></DialogContent></Dialog>;
}
