import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Clock3, Eye,
  Camera, Loader2, MessageCircleQuestion, Pencil, Repeat2, ShieldCheck, Sparkles, UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountabilityPhotoViewer } from '@/components/accountability/AccountabilityPhotoViewer';
import { FieldAccountabilityDetail } from '@/components/accountability/FieldAccountabilityDetail';
import { FieldWalkCaptureDialog } from '@/components/accountability/FieldWalkCaptureDialog';
import { useClientPortalProject, useOwnerPortalHref } from '@/components/portal/ClientPortalProjectContext';
import { useFieldAccountability, type FieldItem } from '@/hooks/useFieldAccountability';
import { cn } from '@/lib/utils';

const CLOSED = new Set(['verified', 'rejected']);

export default function OwnerAccountabilityPage() {
  const href = useOwnerPortalHref();
  const { selectedProjectId: projectId, projects } = useClientPortalProject();
  const { data, isLoading, error, updatePhotoCaption } = useFieldAccountability(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const submittedPhotos = data?.untriagedPhotos ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const projectName = projects.find((project) => project.id === projectId)?.name || 'your project';

  const view = useMemo(() => {
    const verified = items.filter((item) => item.status === 'verified');
    const waitingOwner = items.filter((item) => item.status === 'ready_for_review' && item.owner_verification_required);
    const overdue = items.filter((item) => item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date() && !CLOSED.has(item.status));
    return {
      verified,
      waitingOwner,
      overdue,
      open: items.filter((item) => !CLOSED.has(item.status)).length,
      repeats: items.filter((item) => item.repeat_count > 0).length,
    };
  }, [items]);

  if (!projectId) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-9" data-testid="owner-accountability-page">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to={href()} className="text-sm text-slate-500 hover:underline">← Portal overview</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Evidence-backed project care</p>
          <h1 className="mt-1 font-display text-4xl font-medium text-[#082b23] sm:text-5xl">Site Accountability</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">A clear view of what was observed, who owns the next action, and the photographic proof behind every verified result at {projectName}.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />Private, project-specific record</span>
          <Button className="h-11 rounded-xl bg-[#0d6b57] hover:bg-[#095746]" onClick={() => setCaptureOpen(true)}><Camera className="mr-2 h-4 w-4" />Add site photos</Button>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_1.95fr]">
          <div className="bg-gradient-to-br from-[#082b23] to-[#0d6b57] p-6 text-white sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[.17em] text-emerald-200">Simple photo update</p>
            <h2 className="mt-2 font-display text-3xl">Show the team what you see.</h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50/75">Upload from your phone, review the AI starting caption, and keep your own words under your control.</p>
            <Button className="mt-5 bg-amber-400 text-amber-950 hover:bg-amber-300" onClick={() => setCaptureOpen(true)}><Camera className="mr-2 h-4 w-4" />Start an owner walk</Button>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
            <HowStep number="1" title="Capture" body="Take one photo or choose a full batch. Date and GPS metadata are preserved when available." />
            <HowStep number="2" title="Explain" body="Use your voice or type a caption. AI may suggest wording, always labeled as a draft." />
            <HowStep number="3" title="Follow through" body="The team triages the condition. Questions, responsibility, and completion proof stay connected." />
          </div>
        </div>
      </section>

      {submittedPhotos.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-sky-200 bg-sky-50/45 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-sky-700">Your walk inbox</p><h2 className="mt-1 font-display text-2xl text-[#082b23]">Submitted photos awaiting triage</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">Open a photo to review the AI suggestion or edit your caption. No one else can rewrite the caption you supplied.</p></div><Badge variant="outline" className="w-fit border-sky-200 bg-white text-sky-800">{submittedPhotos.length} pending</Badge></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {submittedPhotos.map((photo) => (
              <div key={photo.id} className="space-y-2 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
                <AccountabilityPhotoViewer link={photo} compact canAnnotate={false} onCaptionUpdate={(photoId, caption) => updatePhotoCaption.mutateAsync({ photoId, caption })} />
                <p className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500"><Pencil className="h-3.5 w-3.5 text-sky-700" />Open to review or edit your caption</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border bg-white p-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading site accountability…</div>
      ) : error ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900"><AlertTriangle className="mx-auto h-7 w-7" /><h2 className="mt-3 text-xl font-semibold">Site Accountability is being prepared</h2><p className="mt-1 text-sm">Please check again after the project team publishes its first evidence-backed update.</p></div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-white p-12 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-emerald-700" /><h2 className="mt-3 font-display text-2xl text-[#082b23]">No site items published yet</h2><p className="mt-1 text-sm text-slate-500">Your project team will publish observations and verified completion evidence here.</p></div>
      ) : (
        <>
          {view.waitingOwner.length > 0 && (
            <section className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950"><MessageCircleQuestion className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">Your decision</p><h2 className="font-display text-2xl text-[#082b23]">{view.waitingOwner.length} item{view.waitingOwner.length === 1 ? '' : 's'} ready for your review</h2><p className="mt-1 text-sm text-slate-600">Compare the evidence, accept the work, or reopen it with a reason.</p></div></div><Button onClick={() => setSelectedId(view.waitingOwner[0].id)} className="bg-amber-400 text-amber-950 hover:bg-amber-300">Review now <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <OwnerMetric icon={CheckCircle2} label="Verified" value={view.verified.length} tone="emerald" />
            <OwnerMetric icon={Clock3} label="Open" value={view.open} tone="slate" />
            <OwnerMetric icon={Eye} label="Your review" value={view.waitingOwner.length} tone="amber" />
            <OwnerMetric icon={AlertTriangle} label="Overdue" value={view.overdue.length} tone="rose" />
            <OwnerMetric icon={Repeat2} label="Repeat" value={view.repeats} tone="violet" />
          </section>

          {view.verified.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-emerald-700"><Sparkles className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[.16em]">Proof of progress</p></div><h2 className="mt-1 font-display text-3xl text-[#082b23]">Completed and verified</h2><p className="mt-1 text-sm text-slate-500">Celebrated first, with the evidence still one tap away.</p></div><Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{view.verified.length} verified</Badge></div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {view.verified.slice(0, 6).map((item) => <OwnerItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} complete />)}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Current obligations</p><h2 className="mt-1 font-display text-3xl text-[#082b23]">What still needs attention</h2></div>
            {items.filter((item) => !CLOSED.has(item.status)).length === 0 ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900"><CheckCircle2 className="mx-auto h-7 w-7" /><p className="mt-2 font-semibold">All published items are verified.</p></div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.filter((item) => !CLOSED.has(item.status)).map((item) => <OwnerItemCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />)}
              </div>
            )}
          </section>
        </>
      )}

      <FieldAccountabilityDetail item={selected} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }} portalMode="owner" />
      <FieldWalkCaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} projectId={projectId} audience="owner" />
    </div>
  );
}

function HowStep({ number, title, body }: { number: string; title: string; body: string }) {
  return <div className="bg-white p-5 sm:p-6"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">{number}</span><h3 className="mt-3 text-base font-semibold text-[#082b23]">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p></div>;
}

function OwnerMetric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string }) {
  const colors: Record<string, string> = { emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900', slate: 'border-slate-200 bg-white text-slate-800', amber: 'border-amber-200 bg-amber-50 text-amber-900', rose: 'border-rose-200 bg-rose-50 text-rose-900', violet: 'border-violet-200 bg-violet-50 text-violet-900' };
  return <div className={cn('rounded-2xl border p-4 shadow-sm', colors[tone])}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] opacity-70">{label}</p><Icon className="h-4 w-4" /></div><p className="mt-2 text-3xl font-bold tabular-nums">{value}</p></div>;
}

function OwnerItemCard({ item, onClick, complete = false }: { item: FieldItem; onClick: () => void; complete?: boolean }) {
  const before = item.photos.find((photo) => photo.evidence_type === 'before' || photo.evidence_type === 'observation');
  const after = item.photos.find((photo) => photo.evidence_type === 'after');
  return (
    <button type="button" onClick={onClick} className={cn('group overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg', complete ? 'border-emerald-200' : 'border-slate-200')}>
      <div className="grid aspect-[16/8] grid-cols-2 gap-px bg-slate-200">
        {before ? <OwnerPhotoStill photo={before} label="Before" /> : <PhotoPlaceholder label="Observation" />}
        {after ? <OwnerPhotoStill photo={after} label="After" after /> : <PhotoPlaceholder label="Awaiting proof" />}
      </div>
      <div className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3"><Badge className={complete ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : item.status === 'ready_for_review' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>{item.status.replace(/_/g, ' ')}</Badge><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700" /></div>
        <h3 className="line-clamp-2 text-lg font-semibold text-[#082b23]">{item.title}</h3>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{item.ball_in_court.replace(/_/g, ' ')}</span>{item.due_date && <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{item.due_date}</span>}</div>
      </div>
    </button>
  );
}

function PhotoPlaceholder({ label }: { label: string }) { return <div className="grid place-items-center bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>; }

function OwnerPhotoStill({ photo, label, after = false }: { photo: FieldItem['photos'][number]; label: string; after?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    import('@/lib/pdf-viewer')
      .then(({ signedUrlFor }) => signedUrlFor('project-photos', photo.photo.thumb_path || photo.photo.storage_path, 1800))
      .then((url) => { if (live) setSrc(url); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [photo.photo.storage_path, photo.photo.thumb_path]);
  return <div className="relative overflow-hidden">{src ? <img src={src} alt={photo.photo.caption || label} className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-slate-200" />}<span className={cn('absolute bottom-2 left-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase text-white', after ? 'bg-emerald-700/90' : 'bg-slate-950/70')}>{label}</span></div>;
}
