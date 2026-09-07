import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileDown,
  HardHat,
  Images,
  Loader2,
  MapPinned,
  Ruler,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FieldItem, FieldPhoto } from '@/hooks/useFieldAccountability';
import {
  buildPhotoScopeGroups,
  openFieldPhotoScopeReport,
  photoFileLabel,
  type PhotoScopeGroup,
} from '@/lib/accountability/photoScopeReport';
import { cn } from '@/lib/utils';

export function OwnerPhotoScopeReport({
  projectName,
  photos,
  items,
  audience = 'staff',
}: {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
  audience?: 'staff' | 'owner';
}) {
  const groups = useMemo(() => buildPhotoScopeGroups(photos, items), [items, photos]);
  const issueCount = groups.reduce((sum, group) => sum + group.issues.length, 0);
  const confirmed = photos.filter((photo) => photo.review_status === 'confirmed').length;
  const immediate = groups.filter((group) => group.priority === 'Immediate field check').length;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(groups.slice(0, 2).map((group) => group.key)));
  const [printing, setPrinting] = useState(false);

  async function printReport() {
    setPrinting(true);
    try {
      await openFieldPhotoScopeReport({ projectName, photos, items });
    } finally {
      setPrinting(false);
    }
  }

  function toggleGroup(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setExpanded(expanded.size === groups.length ? new Set() : new Set(groups.map((group) => group.key)));
  }

  if (!photos.length) {
    return <div className="rounded-3xl border border-dashed bg-white p-12 text-center"><Images className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-display text-2xl text-[#082b23]">The owner scope report is waiting for photographs</h2><p className="mt-1 text-sm text-slate-500">Once a site walk is uploaded, its evidence groups and scope-development language will appear here.</p></div>;
  }

  return (
    <article className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-[#f3f6f4] shadow-[0_22px_70px_rgba(8,43,35,.10)]" data-testid="owner-photo-scope-report">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#061f19] via-[#082b23] to-[#0d6b57] px-5 py-8 text-white sm:px-8 sm:py-10 lg:px-10">
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">APAS Project Controls · Proj OS</p>
            <h2 className="mt-4 font-display text-4xl font-medium sm:text-5xl">Owner Condition &amp;<br className="hidden sm:block" /> Scope Intelligence</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-50/75 sm:text-base">A professional translation of the owner walk into visible conditions, field checks, measurable repair packages and evidence required for closeout.</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-[.12em] text-emerald-100/60"><span>{projectName}</span><span>Evidence captured August 31, 2026</span><span>{audience === 'owner' ? 'Owner portal edition' : 'Management working edition'}</span></div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Button variant="outline" className="h-11 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={toggleAll}>{expanded.size === groups.length ? 'Collapse detailed scope' : `Expand all ${issueCount} scope items`}<ChevronDown className={cn('ml-2 h-4 w-4 transition', expanded.size === groups.length && 'rotate-180')} /></Button>
            <Button className="h-11 rounded-xl bg-amber-300 font-bold text-amber-950 hover:bg-amber-200" onClick={() => void printReport()} disabled={printing}>{printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}Open print / PDF report</Button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px bg-slate-200 lg:grid-cols-4">
        <ReportMetric icon={Camera} value={photos.length} label="Photographs reviewed" />
        <ReportMetric icon={ClipboardCheck} value={groups.length} label="Work packages" />
        <ReportMetric icon={Ruler} value={issueCount} label="Scope-development items" />
        <ReportMetric icon={BadgeCheck} value={confirmed} label="Human-confirmed photos" />
      </section>

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">What we gathered for the owner</p>
            <h3 className="mt-2 font-display text-3xl text-[#082b23]">One walk. Ten accountable work packages.</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">The value is not in delivering {photos.length} disconnected photographs. The value is converting them into {issueCount} traceable scope-development items, assigning field checks, establishing quantities and requiring comparable proof before the owner accepts the work.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3"><MiniInsight value={immediate} label="Immediate field checks" tone="rose" /><MiniInsight value={photos.length - confirmed} label="Draft / pending review" tone="amber" /><MiniInsight value={groups.reduce((sum, group) => sum + group.verification.length, 0)} label="Closeout checks" tone="emerald" /></div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-amber-900"><ShieldCheck className="h-5 w-5" /><p className="font-semibold">Professional-use boundary</p></div>
            <p className="mt-3 text-xs leading-relaxed text-amber-950/70">This report describes what is visible and what should be field-verified. It does not invent dimensions, concealed conditions, code findings or authorization to proceed. Confirmed Proj OS reviews remain visibly separate from AI-assisted starting language.</p>
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Scope package index">
          {groups.map((group) => <a key={group.key} href={`#scope-${group.key}`} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800">{String(group.sequence).padStart(2, '0')} · {group.title}</a>)}
        </nav>

        <section className="space-y-5">
          {groups.map((group) => <ScopePackage key={group.key} group={group} open={expanded.has(group.key)} onToggle={() => toggleGroup(group.key)} />)}
        </section>

        <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white">
          <div className="border-b border-emerald-100 bg-[#082b23] p-5 text-white sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">APAS value path</p><h3 className="mt-1 font-display text-3xl">From photographs to an executable scope</h3></div>
          <div className="grid gap-px bg-slate-200 md:grid-cols-4"><PathStep icon={MapPinned} number="01" title="Verify" body="Walk each referenced location and confirm the condition, ownership and urgency." /><PathStep icon={Ruler} number="02" title="Quantify" body="Measure count, area, length, depth and material so bidders price the same scope." /><PathStep icon={HardHat} number="03" title="Execute" body="Approve the repair package, responsible contractor, schedule and resident protection." /><PathStep icon={CheckCircle2} number="04" title="Prove" body="Require matching-angle before, progress and after evidence before acceptance." /></div>
        </section>
      </div>
    </article>
  );
}

function ScopePackage({ group, open, onToggle }: { group: PhotoScopeGroup; open: boolean; onToggle: () => void }) {
  const priorityStyle = group.priority === 'Immediate field check'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : group.priority === 'Priority repair'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-sky-200 bg-sky-50 text-sky-800';
  return (
    <section id={`scope-${group.key}`} className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 bg-[#082b23] p-5 text-white sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div><p className="text-[10px] font-black uppercase tracking-[.17em] text-amber-300">Work package {String(group.sequence).padStart(2, '0')}</p><h3 className="mt-1 font-display text-2xl sm:text-3xl">{group.title}</h3><p className="mt-1 text-xs text-emerald-100/65">{group.photoRange} · {group.photos.length} photographs · {group.confirmedCount} human-confirmed</p></div>
        <Badge variant="outline" className={cn('w-fit shrink-0 border px-3 py-1.5 text-[10px] font-black uppercase', priorityStyle)}>{group.priority}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-px bg-slate-200">
        {group.representativePhotos.map((photo) => <ReportThumbnail key={photo.id} photo={photo} />)}
      </div>

      <div className="grid gap-5 border-b p-5 sm:p-6 lg:grid-cols-2">
        <Readout icon={Sparkles} label="Owner readout" body={group.ownerSummary} />
        <Readout icon={HardHat} label="Contractor / consultant approach" body={group.contractorReadout} />
      </div>

      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 border-b bg-slate-50 px-5 py-3 text-left text-xs font-bold uppercase tracking-[.1em] text-[#082b23] transition hover:bg-emerald-50 sm:px-6"><span>{open ? 'Hide' : 'View'} {group.issues.length} detailed scope items</span><ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /></button>

      {open && <div className="divide-y divide-slate-100" data-testid={`scope-details-${group.key}`}>
        {group.issues.map((issue, index) => (
          <div key={`${group.key}-${issue.title}`} className="grid gap-3 p-5 sm:grid-cols-[44px_1fr] sm:p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-700">{group.sequence}.{index + 1}</span>
            <div><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><h4 className="font-semibold text-[#082b23]">{issue.title}</h4><span className="shrink-0 text-[10px] font-bold text-slate-400">{issue.photoRefs}</span></div><div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.35fr_1fr]"><ScopeColumn label="Visible condition" body={issue.observation} /><ScopeColumn label="Proposed scope" body={issue.scope} strong /><ScopeColumn label="Owner result" body={issue.ownerOutcome} /></div></div>
          </div>
        ))}
      </div>}

      <div className="border-t bg-emerald-50/60 p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-emerald-800"><BadgeCheck className="h-4 w-4" />Closeout evidence required</div><div className="mt-3 flex flex-wrap gap-2">{group.verification.map((entry) => <span key={entry} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-900"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{entry}</span>)}</div></div>
    </section>
  );
}

function ReportThumbnail({ photo }: { photo: FieldPhoto }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    import('@/lib/pdf-viewer')
      .then(({ signedUrlFor }) => signedUrlFor('project-photos', photo.photo.thumb_path || photo.photo.storage_path, 1800))
      .then((url) => { if (active) setSrc(url); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [photo.photo.storage_path, photo.photo.thumb_path]);
  return <figure className="relative aspect-[4/3] overflow-hidden bg-slate-100">{src ? <img src={src} alt={photo.photo.caption || photoFileLabel(photo)} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>}<figcaption className="absolute bottom-2 left-2 rounded-full bg-slate-950/70 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">{photoFileLabel(photo)}</figcaption></figure>;
}

function ReportMetric({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) { return <div className="bg-white p-4 sm:p-5"><div className="flex items-center justify-between text-emerald-700"><strong className="font-display text-3xl text-[#082b23]">{value}</strong><Icon className="h-5 w-5" /></div><p className="mt-1 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">{label}</p></div>; }
function MiniInsight({ value, label, tone }: { value: number; label: string; tone: 'rose' | 'amber' | 'emerald' }) { const styles = { rose: 'border-rose-200 bg-rose-50 text-rose-900', amber: 'border-amber-200 bg-amber-50 text-amber-900', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900' }; return <div className={cn('rounded-2xl border p-3', styles[tone])}><strong className="block text-2xl">{value}</strong><span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span></div>; }
function Readout({ icon: Icon, label, body }: { icon: React.ComponentType<{ className?: string }>; label: string; body: string }) { return <div className="border-l-4 border-amber-300 pl-4"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.15em] text-emerald-700"><Icon className="h-4 w-4" />{label}</p><p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p></div>; }
function ScopeColumn({ label, body, strong = false }: { label: string; body: string; strong?: boolean }) { return <div className={cn('rounded-2xl border p-3', strong ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100 bg-slate-50')}><p className="text-[9px] font-black uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-1 text-xs leading-relaxed text-slate-700">{body}</p></div>; }
function PathStep({ icon: Icon, number, title, body }: { icon: React.ComponentType<{ className?: string }>; number: string; title: string; body: string }) { return <div className="bg-white p-5"><div className="flex items-center justify-between text-emerald-700"><Icon className="h-5 w-5" /><span className="font-mono text-[10px] font-bold text-slate-400">{number}</span></div><h4 className="mt-3 font-semibold text-[#082b23]">{title}</h4><p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>{number !== '04' && <ArrowRight className="mt-3 hidden h-4 w-4 text-amber-500 md:block" />}</div>; }
