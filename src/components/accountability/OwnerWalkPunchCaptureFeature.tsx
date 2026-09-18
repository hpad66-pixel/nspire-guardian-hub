import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Images,
  Mail,
  MessageSquareText,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FieldItem, FieldPhoto, FieldVisit } from '@/hooks/useFieldAccountability';
import {
  buildOwnerWalkPunchCaptureSummary,
  OWNER_WALK_CATEGORIES,
  OWNER_WALK_PIPELINE,
  type OwnerWalkCategoryId,
} from '@/lib/accountability/ownerWalkPunchCapture';
import { cn } from '@/lib/utils';

interface OwnerWalkPunchCaptureFeatureProps {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
  visits: FieldVisit[];
  ownerPortalUrl: string;
  onStartWalk: () => void;
  onOpenReport?: () => void;
}

export function OwnerWalkPunchCaptureFeature({
  projectName,
  photos,
  items,
  visits,
  ownerPortalUrl,
  onStartWalk,
  onOpenReport,
}: OwnerWalkPunchCaptureFeatureProps) {
  const summary = buildOwnerWalkPunchCaptureSummary({ photos, items, visits });
  const mostUsedCategory = OWNER_WALK_CATEGORIES
    .slice()
    .sort((a, b) => summary.categoryCounts[b.id] - summary.categoryCounts[a.id])[0];
  const hasExistingArchive = summary.totalPhotos >= 100;

  return (
    <div className="space-y-5" data-testid="owner-walk-punch-capture-feature">
      <section className="overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_24px_70px_rgba(8,43,35,.10)]">
        <div className="grid lg:grid-cols-[1.15fr_.85fr]">
          <div className="bg-[#082b23] p-5 text-white sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-300 text-amber-950 hover:bg-amber-300">Reusable feature</Badge>
              {hasExistingArchive && <Badge variant="outline" className="border-white/25 bg-white/10 text-white">Photo archive detected</Badge>}
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-emerald-200">Owner walk to accountable scope</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">Punch capture workspace</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/75">
              Use this for any property walk: take before photos, attach the owner narrative,
              categorize each condition, assign the work, collect after proof, and publish a client-ready packet.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button className="h-11 rounded-xl bg-amber-300 text-amber-950 hover:bg-amber-200" onClick={onStartWalk}>
                <Camera className="mr-2 h-4 w-4" /> Start owner walk
              </Button>
              {onOpenReport && (
                <Button variant="outline" className="h-11 rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={onOpenReport}>
                  <FileText className="mr-2 h-4 w-4" /> Open scope packet
                </Button>
              )}
              <Button asChild variant="outline" className="h-11 rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link to={ownerPortalUrl}>Owner portal preview <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-200">
            <Metric label="Photos" value={summary.totalPhotos} hint={`${summary.untriagedPhotos} need triage`} />
            <Metric label="Owner walks" value={summary.ownerWalks} hint={`${summary.walkPhotos} walk photos`} />
            <Metric label="Scope items" value={summary.draftScopeItems} hint={`${summary.ownerVisibleItems} owner-visible`} />
            <Metric label="Blocked closeout" value={summary.blockedCloseout} hint="after proof needed" tone={summary.blockedCloseout ? 'amber' : 'emerald'} />
            <Metric label="Ready for owner" value={summary.readyForOwnerAcceptance} hint="accept/reopen" tone="sky" />
            <Metric label="Verified" value={summary.acceptedOrVerified} hint={`${summary.afterEvidence} after photos`} tone="emerald" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)]">
        <div className="rounded-[28px] border bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Reusable workflow</p>
              <h3 className="mt-1 font-display text-2xl text-[#082b23]">From photo to accepted work</h3>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800">
              {projectName}
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {OWNER_WALK_PIPELINE.map((stage, index) => (
              <article key={stage.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0d6b57] text-sm font-bold text-white">{index + 1}</span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#082b23]">{stage.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{stage.description}</p>
                    <p className="mt-2 text-[11px] font-medium leading-relaxed text-emerald-800">{stage.evidenceGate}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[28px] border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Controlled categories</p>
                <h3 className="mt-1 font-display text-2xl text-[#082b23]">Reusable discipline map</h3>
              </div>
              <SlidersHorizontal className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="mt-4 space-y-2">
              {OWNER_WALK_CATEGORIES.map((category) => (
                <CategoryRow
                  key={category.id}
                  categoryId={category.id}
                  label={category.label}
                  count={summary.categoryCounts[category.id]}
                  active={category.id === mostUsedCategory.id}
                  verification={category.ownerVerificationRequired}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h3 className="font-display text-xl text-amber-950">Owner-safe boundary</h3>
                <p className="mt-1 text-sm leading-relaxed text-amber-900/75">
                  Owner quotes, APAS scope, internal notes, and client-visible proof stay separate. The portal packet can show
                  the before/after record without exposing internal cost, vendor, or draft-review notes.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <BoundaryTile icon={MessageSquareText} label="Quote" />
              <BoundaryTile icon={ClipboardCheck} label="Scope" />
              <BoundaryTile icon={Mail} label="Packet" />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, hint, tone = 'slate' }: { label: string; value: number; hint: string; tone?: 'slate' | 'amber' | 'emerald' | 'sky' }) {
  const colors = {
    slate: 'bg-white text-slate-800',
    amber: 'bg-amber-50 text-amber-900',
    emerald: 'bg-emerald-50 text-emerald-900',
    sky: 'bg-sky-50 text-sky-900',
  };
  return (
    <div className={cn('min-h-28 p-4 sm:p-5', colors[tone])}>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] opacity-65">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs opacity-70">{hint}</p>
    </div>
  );
}

function CategoryRow({
  categoryId,
  label,
  count,
  active,
  verification,
}: {
  categoryId: OwnerWalkCategoryId;
  label: string;
  count: number;
  active: boolean;
  verification: boolean;
}) {
  const categoryTone: Record<OwnerWalkCategoryId, string> = {
    structural: 'bg-slate-100 text-slate-800',
    mechanical: 'bg-sky-100 text-sky-800',
    electrical: 'bg-amber-100 text-amber-900',
    plumbing: 'bg-cyan-100 text-cyan-900',
    landscaping: 'bg-emerald-100 text-emerald-900',
  };
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-2xl border p-3', active ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white')}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', categoryTone[categoryId])}>
          {verification ? <ShieldCheck className="h-4 w-4" /> : <Images className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#082b23]">{label}</p>
          <p className="text-xs text-muted-foreground">{verification ? 'Owner acceptance default' : 'APAS verification default'}</p>
        </div>
      </div>
      <span className="text-lg font-bold tabular-nums text-slate-700">{count}</span>
    </div>
  );
}

function BoundaryTile({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white/70 p-3 text-amber-950">
      <Icon className="mx-auto h-4 w-4" />
      <p className="mt-1 text-xs font-semibold">{label}</p>
    </div>
  );
}
