import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow, isBefore, startOfToday } from 'date-fns';
import {
  AlertTriangle, ArrowLeft, Camera, CheckCircle2, ChevronRight, ClipboardCheck,
  Clock3, Filter, Inbox, Loader2, MapPin, Plus, Repeat2, Search, ShieldCheck, UserRound,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccountabilityPhotoViewer } from '@/components/accountability/AccountabilityPhotoViewer';
import { CreateFieldItemDialog } from '@/components/accountability/CreateFieldItemDialog';
import { FieldAccountabilityDetail } from '@/components/accountability/FieldAccountabilityDetail';
import { FieldWalkCaptureDialog } from '@/components/accountability/FieldWalkCaptureDialog';
import { useFieldAccountability, type FieldItem, type FieldStatus } from '@/hooks/useFieldAccountability';
import { useProject } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS: Record<FieldStatus, string> = {
  needs_triage: 'Needs triage', assigned: 'Assigned', in_progress: 'In progress', ready_for_review: 'Ready for review',
  verified: 'Verified', reopened: 'Reopened', deferred: 'Deferred', rejected: 'Rejected',
};

const BALL_LABELS: Record<string, string> = {
  apas: 'APAS', property_management: 'Property management', maintenance: 'Maintenance', owner: 'Owner', vendor: 'Vendor',
};

export default function FieldAccountabilityPage() {
  const params = useParams<{ projectId?: string; id?: string }>();
  const projectId = params.projectId || params.id || null;
  const { data: project } = useProject(projectId);
  const { data, isLoading, error, analyzePhoto, updatePhotoCaption } = useFieldAccountability(projectId);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPhotoId, setCreatePhotoId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [ball, setBall] = useState('all');
  const [organizing, setOrganizing] = useState<string | null>(null);
  const [organizeProgress, setOrganizeProgress] = useState<{ done: number; total: number } | null>(null);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const createPhoto = data?.untriagedPhotos.find((photo) => photo.id === createPhotoId) ?? null;
  const today = startOfToday();
  const metrics = useMemo(() => ({
    pending: items.filter((item) => !['verified', 'rejected', 'deferred'].includes(item.status)).length,
    progress: items.filter((item) => item.status === 'in_progress').length,
    review: items.filter((item) => item.status === 'ready_for_review').length,
    verified: items.filter((item) => item.status === 'verified').length,
    overdue: items.filter((item) => item.due_date && isBefore(new Date(`${item.due_date}T12:00:00`), today) && !['verified', 'rejected'].includes(item.status)).length,
    repeats: items.filter((item) => item.repeat_count > 0).length,
  }), [items, today]);

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.title} ${item.description || ''} ${item.location_label || ''}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (status === 'all' || item.status === status)
      && (ball === 'all' || item.ball_in_court === ball);
  }), [items, query, status, ball]);

  if (!projectId) return null;

  async function organizeOne(photoId: string) {
    setOrganizing(photoId);
    try {
      await analyzePhoto.mutateAsync(photoId);
      toast.success('AI suggestions are ready for your review');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'AI could not review this photograph');
    } finally {
      setOrganizing(null);
    }
  }

  async function organizeInbox() {
    const remaining = (data?.untriagedPhotos ?? []).filter((photo) => !Object.keys(photo.ai_suggestion || {}).length);
    if (!remaining.length) return;
    setOrganizeProgress({ done: 0, total: remaining.length });
    for (let index = 0; index < remaining.length; index += 1) {
      try { await analyzePhoto.mutateAsync(remaining[index].id); } catch { /* keep the batch moving; each card remains available for retry */ }
      setOrganizeProgress({ done: index + 1, total: remaining.length });
    }
    setOrganizeProgress(null);
    toast.success('Photo organization pass complete. Review every suggestion before creating records.');
  }

  return (
    <div className="min-h-full bg-[#f7f8f6]" data-testid="field-accountability-page">
      <section className="relative overflow-hidden border-b bg-[#082b23] text-white">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="container relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
          <Link to={`/projects/${projectId}`} className="mb-5 inline-flex items-center gap-1.5 text-sm text-emerald-100/80 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to project</Link>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">{project?.name || 'Project'} · evidence control</p>
              <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">Field Accountability</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/75 sm:text-base">Every site observation has an owner, due date, photographic proof, conversation, and verifiable closeout.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="h-12 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => { setCreatePhotoId(null); setCreateOpen(true); }}><Plus className="mr-2 h-5 w-5" />New item</Button>
              <Button className="h-12 bg-amber-400 text-amber-950 hover:bg-amber-300" onClick={() => setCaptureOpen(true)}><Camera className="mr-2 h-5 w-5" />Start site walk</Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric icon={ClipboardCheck} label="Pending" value={metrics.pending} tone="slate" />
          <Metric icon={Clock3} label="In progress" value={metrics.progress} tone="blue" />
          <Metric icon={ShieldCheck} label="Review" value={metrics.review} tone="amber" />
          <Metric icon={CheckCircle2} label="Verified" value={metrics.verified} tone="emerald" />
          <Metric icon={AlertTriangle} label="Overdue" value={metrics.overdue} tone="rose" />
          <Metric icon={Repeat2} label="Repeats" value={metrics.repeats} tone="violet" />
        </section>

        <Tabs defaultValue="board" className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList className="h-12 w-full rounded-2xl bg-slate-200/70 p-1 lg:w-auto">
              <TabsTrigger value="board" className="h-10 flex-1 rounded-xl px-5 lg:flex-none">Accountability board</TabsTrigger>
              <TabsTrigger value="inbox" className="h-10 flex-1 rounded-xl px-5 lg:flex-none"><Inbox className="mr-2 h-4 w-4" />Walk inbox <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{data?.untriagedPhotos.length ?? 0}</span></TabsTrigger>
            </TabsList>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conditions or locations" className="h-11 rounded-xl bg-white pl-9" /></div>
              <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
              <Select value={ball} onValueChange={setBall}><SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-48"><UserRound className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Everyone</SelectItem>{Object.entries(BALL_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>

          <TabsContent value="board" className="mt-0">
            {isLoading ? <LoadingState /> : error ? <EmptyState icon={AlertTriangle} title="Field Accountability is not available" body="Apply the Field Accountability database migration, then refresh this page." /> : filtered.length === 0 ? <EmptyState icon={ClipboardCheck} title="No accountability items yet" body="Start a site walk or create the first condition. Each one will remain connected to its evidence and closeout." action={<Button onClick={() => setCaptureOpen(true)}><Camera className="mr-2 h-4 w-4" />Start site walk</Button>} /> : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => <ItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inbox" className="mt-0">
            {!data?.untriagedPhotos.length ? <EmptyState icon={Inbox} title="Walk inbox is clear" body="Every photograph has been triaged into an accountable condition." /> : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-1.5 text-sm font-semibold text-sky-950"><Sparkles className="h-4 w-4" />AI-assisted photo triage</p><p className="mt-0.5 text-xs text-sky-800/75">AI suggests only what it can see; you approve every caption, category, severity, and location clue.</p></div><Button variant="outline" className="border-sky-200 bg-white text-sky-900" onClick={() => void organizeInbox()} disabled={Boolean(organizeProgress)}>{organizeProgress ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Organizing {organizeProgress.done}/{organizeProgress.total}</> : <><Sparkles className="mr-2 h-4 w-4" />Organize unreviewed photos</>}</Button></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.untriagedPhotos.map((photo) => (
                  <Card key={photo.id} className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
                    <CardContent className="space-y-3 p-3">
                      <AccountabilityPhotoViewer link={photo} compact canAnnotate={false} onCaptionUpdate={(photoId, caption) => updatePhotoCaption.mutateAsync({ photoId, caption })} />
                      <div className="px-1"><p className="line-clamp-2 text-sm font-semibold text-[#082b23]">{typeof photo.ai_suggestion?.caption === 'string' ? photo.ai_suggestion.caption : photo.photo.caption || 'Untriaged site observation'}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(photo.photo.taken_at || photo.photo.created_at).toLocaleString()}</p>{Object.keys(photo.ai_suggestion || {}).length > 0 && <div className="mt-2 flex flex-wrap gap-1"><Badge variant="outline" className="border-sky-200 bg-sky-50 text-[10px] text-sky-800"><Sparkles className="mr-1 h-3 w-3" />AI suggestion</Badge>{typeof photo.ai_suggestion.category === 'string' && <Badge variant="outline" className="text-[10px] capitalize">{photo.ai_suggestion.category.replace(/_/g, ' ')}</Badge>}</div>}</div>
                      {!Object.keys(photo.ai_suggestion || {}).length && <Button variant="outline" className="w-full rounded-xl" disabled={organizing === photo.id || Boolean(organizeProgress)} onClick={() => void organizeOne(photo.id)}>{organizing === photo.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Suggest organization</Button>}
                      <Button className="w-full rounded-xl bg-[#0d6b57] hover:bg-[#095746]" onClick={() => { setCreatePhotoId(photo.id); setCreateOpen(true); }}>Turn into accountable item <ChevronRight className="ml-1 h-4 w-4" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div></div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <FieldWalkCaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} projectId={projectId} propertyId={project?.property_id} />
      <CreateFieldItemDialog open={createOpen} onOpenChange={setCreateOpen} projectId={projectId} propertyId={project?.property_id} photo={createPhoto} />
      <FieldAccountabilityDetail item={selected} open={Boolean(selected)} onOpenChange={(value) => { if (!value) setSelectedId(null); }} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string }) {
  const colors: Record<string, string> = { slate: 'border-slate-200 bg-white text-slate-700', blue: 'border-sky-200 bg-sky-50 text-sky-800', amber: 'border-amber-200 bg-amber-50 text-amber-800', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800', rose: 'border-rose-200 bg-rose-50 text-rose-800', violet: 'border-violet-200 bg-violet-50 text-violet-800' };
  return <div className={cn('rounded-2xl border p-4 shadow-sm', colors[tone])}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.12em] opacity-70">{label}</span><Icon className="h-4 w-4" /></div><p className="mt-2 text-3xl font-bold tabular-nums">{value}</p></div>;
}

function ItemCard({ item, onClick }: { item: FieldItem; onClick: () => void }) {
  const before = item.photos.find((photo) => photo.evidence_type === 'before' || photo.evidence_type === 'observation');
  const after = item.photos.find((photo) => photo.evidence_type === 'after');
  const overdue = item.due_date && isBefore(new Date(`${item.due_date}T12:00:00`), startOfToday()) && !['verified', 'rejected'].includes(item.status);
  return (
    <button type="button" onClick={onClick} className={cn('group overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg', item.status === 'verified' ? 'border-emerald-200' : overdue ? 'border-rose-200' : 'border-slate-200')}>
      {(before || after) && <div className="grid aspect-[16/7] grid-cols-2 gap-px bg-slate-200"><PhotoStill photo={before} label={after ? 'Before' : 'Observation'} /><PhotoStill photo={after} label="After" emptyLabel="Awaiting proof" /></div>}
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><div className="mb-2 flex flex-wrap items-center gap-1.5"><Badge className={item.status === 'verified' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : item.status === 'ready_for_review' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>{STATUS_LABELS[item.status]}</Badge><span className="text-[10px] font-bold text-muted-foreground">FA-{String(item.item_number).padStart(4, '0')}</span></div><h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[#082b23]">{item.title}</h3></div><ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700" /></div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">{item.location_label && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.location_label}</span>}<span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{BALL_LABELS[item.ball_in_court]}</span>{item.due_date && <span className={cn('flex items-center gap-1', overdue && 'font-semibold text-rose-700')}><Clock3 className="h-3.5 w-3.5" />{overdue ? 'Overdue · ' : ''}{item.due_date}</span>}</div>
        <div className="flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground"><span className="capitalize">{item.category.replace(/_/g, ' ')} · {item.severity}</span><span>{formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}</span></div>
      </div>
    </button>
  );
}

function PhotoStill({ photo, label, emptyLabel }: { photo?: FieldItem['photos'][number]; label: string; emptyLabel?: string }) {
  if (!photo) return <div className="flex items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">{emptyLabel || label}</div>;
  return <div className="relative overflow-hidden"><SignedImage path={photo.photo.thumb_path || photo.photo.storage_path} alt={photo.photo.caption || label} /><span className="absolute bottom-2 left-2 rounded-full bg-slate-950/65 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur">{label}</span></div>;
}

function SignedImage({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    import('@/lib/pdf-viewer').then(({ signedUrlFor }) => signedUrlFor('project-photos', path, 1800)).then((url) => { if (live) setSrc(url); }).catch(() => undefined);
    return () => { live = false; };
  }, [path]);
  return src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-slate-200" />;
}

function LoadingState() { return <div className="flex items-center justify-center gap-2 rounded-3xl border bg-white p-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading accountability…</div>; }

function EmptyState({ icon: Icon, title, body, action }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; action?: React.ReactNode }) {
  return <div className="rounded-3xl border border-dashed bg-white p-10 text-center sm:p-16"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-6 w-6" /></span><h2 className="mt-4 font-display text-2xl text-[#082b23]">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
