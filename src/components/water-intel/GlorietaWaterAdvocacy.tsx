import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  FilePenLine,
  FileText,
  LockKeyhole,
  Mail,
  MessageSquareWarning,
  Scale,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProRichTextEditor, RichTextViewer } from '@/components/ui/rich-text-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildGlorietaDisputeCase,
  GLORIETA_FORMAL_RETROACTIVE_REBILL,
  GLORIETA_FORMAL_UNPAID_BALANCE,
  type GlorietaBuildingMonthlyRecord,
  type GlorietaFocusedPhasePoint,
} from '@/lib/water-intel/glorietaDispute';
import { gallons, money, type WaterExecNote } from '@/lib/water-intel';
import { useWaterNotes, type WaterIntelScope } from '@/hooks/useWaterIntelligence';

export const GLORIETA_CITY_LETTER_MARKER = '[[GLORIETA_CITY_LETTER_DRAFT_V1]]';
const GLORIETA_REVIEW_NOTE_MARKER = '[[GLORIETA_CLIENT_REVIEW_NOTE_V1]]';

function CompactMetric({ label, value, detail, tone = 'forest' }: { label: string; value: string; detail: string; tone?: 'forest' | 'gold' | 'rose' | 'blue' }) {
  const tones = {
    forest: 'border-[#08271f]/15 bg-[#08271f]/5 text-[#08271f]',
    gold: 'border-[#C4A35A]/30 bg-[#C4A35A]/10 text-[#6d5319]',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs leading-snug opacity-80">{detail}</div>
    </div>
  );
}

function ExplanationCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-[#e8e3d8] bg-white p-4">
      <h4 className="font-semibold text-[#08271f]">{title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-[#5c6863]">{body}</p>
    </article>
  );
}

function CfoAnswerCard({ title, answer, accent = 'forest' }: { title: string; answer: string; accent?: 'forest' | 'gold' | 'rose' | 'blue' }) {
  const accents = {
    forest: 'border-[#08271f]/20 bg-[#f7faf8] text-[#08271f]',
    gold: 'border-[#C4A35A]/35 bg-[#fff8e5] text-[#6d5319]',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  };
  return (
    <article className={`rounded-2xl border p-4 ${accents[accent]}`}>
      <h4 className="text-sm font-bold leading-snug">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-[#3d4a45]">{answer}</p>
    </article>
  );
}

function phaseLabel(key: 'pre' | 'vacancy' | 'current') {
  if (key === 'pre') return 'Pre-vacancy';
  if (key === 'vacancy') return 'Vacancy and rehab';
  return 'Current/post-rehab';
}

function phaseDates(key: 'pre' | 'vacancy' | 'current') {
  if (key === 'pre') return 'Before August 2023';
  if (key === 'vacancy') return 'August 2023 through February 2025';
  return 'March 2025 through latest indexed bills';
}

function readRange(phase: GlorietaFocusedPhasePoint['phases']['pre']) {
  if (typeof phase.firstRead !== 'number' || typeof phase.lastRead !== 'number') return 'No read span in source';
  return `Read ${phase.firstRead.toLocaleString()} to ${phase.lastRead.toLocaleString()}`;
}

function phaseTotal(focused: GlorietaFocusedPhasePoint[], key: 'pre' | 'vacancy' | 'current') {
  return focused.reduce(
    (total, account) => {
      const phase = account.phases[key];
      total.charges += phase.charges;
      total.gallons += phase.gallons;
      total.billCount += phase.billCount;
      return total;
    },
    { charges: 0, gallons: 0, billCount: 0 },
  );
}

function PhaseBracketCard({
  focused,
  phaseKey,
  tone,
}: {
  focused: GlorietaFocusedPhasePoint[];
  phaseKey: 'pre' | 'vacancy' | 'current';
  tone: 'slate' | 'rose' | 'forest';
}) {
  const total = phaseTotal(focused, phaseKey);
  const toneClasses = {
    slate: 'border-slate-300 bg-slate-50 text-slate-800',
    rose: 'border-rose-300 bg-rose-50 text-rose-950',
    forest: 'border-emerald-900/25 bg-emerald-50 text-[#08271f]',
  };
  const bracketColor = tone === 'rose' ? 'border-rose-400' : tone === 'forest' ? 'border-[#08271f]' : 'border-slate-400';
  return (
    <article className={`relative rounded-3xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <div className={`pointer-events-none absolute -top-3 left-6 right-6 h-6 border-x-4 border-t-4 ${bracketColor}`} aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-xl text-[#08271f]">{phaseLabel(phaseKey)}</h4>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6d746f]">{phaseDates(phaseKey)}</p>
        </div>
        {phaseKey === 'vacancy' && (
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-rose-800 ring-1 ring-rose-200">
            Dispute period
          </span>
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-white/80 p-3 ring-1 ring-black/5">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#6d746f]">Buildings 7 and 8 total</div>
        <div className="mt-1 font-mono text-2xl font-black text-[#08271f]">{money(total.charges)}</div>
        <p className="text-xs font-semibold text-[#3d4a45]">{gallons(total.gallons)} across {total.billCount} bill records</p>
      </div>
      <div className="mt-3 grid gap-2">
        {focused.map((account) => {
          const phase = account.phases[phaseKey];
          return (
            <div key={`${account.accountNumber}-${phaseKey}`} className="rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-black/5">
              <div className="flex flex-wrap justify-between gap-2">
                <strong className="text-[#08271f]">{account.label}</strong>
                <span className="font-mono font-bold text-[#08271f]">{phase.billCount ? money(phase.charges) : 'No indexed bills'}</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-[#5c6863]">
                {phase.billCount ? `${gallons(phase.gallons)} | ${readRange(phase)}` : 'Data gap in the source backup for this phase.'}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function FocusPhaseTable({ focused }: { focused: GlorietaFocusedPhasePoint[] }) {
  const phases: Array<'pre' | 'vacancy' | 'current'> = ['pre', 'vacancy', 'current'];
  return (
    <div className="overflow-x-auto rounded-3xl border border-[#dedbd1] bg-white">
      <table className="min-w-[860px] w-full border-collapse text-left text-sm">
        <thead className="bg-[#08271f] text-white">
          <tr>
            <th className="px-4 py-3 font-semibold">Building and meter</th>
            <th className="px-4 py-3 font-semibold">Unit context</th>
            {phases.map((phase) => (
              <th key={phase} className="px-4 py-3 font-semibold">{phaseLabel(phase)}<div className="text-[11px] font-normal text-white/75">{phaseDates(phase)}</div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {focused.map((account) => (
            <tr key={account.accountNumber} className={account.accountNumber === '2745714336' ? 'bg-[#fff8e8]' : 'bg-[#f7faf8]'}>
              <td className="border-t border-[#dedbd1] px-4 py-3 align-top">
                <div className="font-bold text-[#08271f]">{account.label}</div>
                <div className="text-xs text-[#5c6863]">Acct {account.accountNumber}</div>
                <div className="text-xs text-[#5c6863]">Meter {account.meterNumber || 'not shown'}</div>
              </td>
              <td className="border-t border-[#dedbd1] px-4 py-3 align-top text-[#3d4a45]">{account.unitContext}</td>
              {phases.map((phaseKey) => {
                const phase = account.phases[phaseKey];
                return (
                  <td key={phaseKey} className="border-t border-[#dedbd1] px-4 py-3 align-top">
                    <div className="font-mono font-bold text-[#08271f]">{phase.billCount ? money(phase.charges) : 'No indexed bills'}</div>
                    <div className="text-xs text-[#3d4a45]">{phase.billCount ? gallons(phase.gallons) : 'No gallons stated'}</div>
                    <div className="text-xs text-[#5c6863]">{phase.billCount ? `${phase.billCount} bill records` : 'Data gap'}</div>
                    <div className="mt-1 text-[11px] text-[#6d746f]">{readRange(phase)}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BuildingMonthlyTable({
  title,
  rows,
}: {
  title: string;
  rows: GlorietaBuildingMonthlyRecord[];
}) {
  return (
    <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
      <h3 className="font-display text-2xl text-[#08271f]">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[#5c6863]">
        Every row below comes from a canonical bill record. Current charges are the dollar amount for that service period; gallons are the stated consumption; meter reads show the register movement when the bill contains both reads.
      </p>
      <div className="mt-4 max-h-[560px] overflow-auto rounded-2xl border border-[#dedbd1]">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[#08271f] text-white">
            <tr>
              <th className="px-3 py-2 font-semibold">Service period</th>
              <th className="px-3 py-2 font-semibold">Gallons</th>
              <th className="px-3 py-2 font-semibold">Current charges</th>
              <th className="px-3 py-2 font-semibold">Meter reads</th>
              <th className="px-3 py-2 font-semibold">Phase</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.accountNumber}-${row.servicePeriod}`} className={row.phase === 'Vacancy/rehab' ? 'bg-rose-50/60' : row.phase === 'Current/post-rehab' ? 'bg-emerald-50/40' : 'bg-white'}>
                <td className="border-t border-[#dedbd1] px-3 py-2">{row.servicePeriod}</td>
                <td className="border-t border-[#dedbd1] px-3 py-2 font-mono font-semibold text-[#08271f]">{gallons(row.gallons)}</td>
                <td className="border-t border-[#dedbd1] px-3 py-2 font-mono font-semibold text-[#08271f]">{money(row.spend)}</td>
                <td className="border-t border-[#dedbd1] px-3 py-2">{typeof row.priorReading === 'number' && typeof row.currentReading === 'number' ? `${row.priorReading.toLocaleString()} to ${row.currentReading.toLocaleString()}` : 'Not shown'}</td>
                <td className="border-t border-[#dedbd1] px-3 py-2">{row.phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function extractSavedLetter(note: WaterExecNote | undefined) {
  if (!note?.body.includes(GLORIETA_CITY_LETTER_MARKER)) return null;
  const html = note.body.split(GLORIETA_CITY_LETTER_MARKER)[1]?.trim();
  return html || null;
}

function savedLetterNote(notes: WaterExecNote[]) {
  return notes.find((note) => note.body.includes(GLORIETA_CITY_LETTER_MARKER));
}

function savedReviewNotes(notes: WaterExecNote[]) {
  return notes.filter((note) => note.body.includes(GLORIETA_REVIEW_NOTE_MARKER));
}

function cleanReviewNote(note: WaterExecNote) {
  return note.body.replace(GLORIETA_REVIEW_NOTE_MARKER, '').trim();
}

export function GlorietaWaterAdvocacy({
  mode,
  scope,
  notes = [],
}: {
  mode: 'staff' | 'magic' | 'property_manager';
  scope: WaterIntelScope;
  notes?: WaterExecNote[];
}) {
  const dispute = useMemo(() => buildGlorietaDisputeCase(), []);
  const savedDraft = savedLetterNote(notes);
  const reviewNotes = savedReviewNotes(notes);
  const [letterHtml, setLetterHtml] = useState(dispute.draftLetterHtml);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewerName, setReviewerName] = useState(mode === 'magic' ? '' : 'R4 reviewer');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastLoadedDraftId, setLastLoadedDraftId] = useState<string | null>(null);
  const confidential = mode === 'magic';
  const savePortalNote = useWaterNotes(scope);

  useEffect(() => {
    const savedHtml = extractSavedLetter(savedDraft);
    if (savedHtml && savedDraft?.id !== lastLoadedDraftId) {
      setLetterHtml(savedHtml);
      setLastLoadedDraftId(savedDraft.id);
    }
  }, [lastLoadedDraftId, savedDraft]);

  async function copyLetter() {
    await navigator.clipboard?.writeText(letterHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function persistLetter() {
    savePortalNote.mutate({
      body: `Glorieta City Letter Draft\nSaved from R4 billing review on ${new Date().toLocaleString()}\n\n${GLORIETA_CITY_LETTER_MARKER}\n${letterHtml}`,
      authorName: mode === 'magic' ? 'Magic-link reviewer' : 'R4 reviewer',
      authorEmail: undefined,
    });
  }

  function persistReviewNote() {
    savePortalNote.mutate(
      {
        body: `${GLORIETA_REVIEW_NOTE_MARKER}\n${reviewNote}`,
        authorName: reviewerName.trim() || (mode === 'magic' ? 'Magic-link reviewer' : 'R4 reviewer'),
        authorEmail: reviewerEmail.trim() || undefined,
      },
      { onSuccess: () => setReviewNote('') },
    );
  }

  const extracted = dispute.summary.disputeCurrentCharges;
  const complexSpend = dispute.accounts.reduce((sum, account) => sum + account.spend, 0);
  const complexGallons = dispute.accounts.reduce((sum, account) => sum + account.gallons, 0);
  const vacancyComplexSpend = dispute.meterTimeline.reduce((sum, account) => sum + account.vacancySpend, 0);
  const disputeShare = complexSpend > 0 ? (extracted / complexSpend) * 100 : 0;
  const building7Rows = dispute.focusedMonthly.filter((row) => row.accountNumber === '1692380502');
  const building8Rows = dispute.focusedMonthly.filter((row) => row.accountNumber === String(dispute.summary.disputeAccount));
  const mailSubject = encodeURIComponent(`Glorieta Gardens billing dispute - Account ${dispute.summary.disputeAccount}`);
  const mailBody = encodeURIComponent(letterHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

  return (
    <section className="relative rounded-[28px] border border-[#dedbd1] bg-[#f7f3ea] shadow-sm" data-testid="glorieta-water-advocacy">
      <div className="border-b border-[#dedbd1] bg-[#061f1a] px-5 py-5 text-white md:px-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d5aa52]">
              <LockKeyhole className="h-3.5 w-3.5" /> Confidential for our use and analysis
            </div>
            <h2 className="mt-3 font-display text-3xl font-medium leading-tight md:text-4xl">
              Glorieta Gardens billing evidence workspace
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#c5d2cd]">
              Prepared for R4. This workspace organizes the WASD bills, Building 7 and Building 8 period comparison, Building 8 vacancy record, and draft city letter into one reviewable client link.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-[#d8e2de]">
            <div className="font-semibold text-white">Client-ready magic-link posture</div>
            <div>No login required when opened through the secure review link.</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 md:p-6">
        <CompactMetric label="Formal rebill cited" value={money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} detail="Retroactive back-bill amount cited in the July 23, 2026 dispute package." tone="rose" />
        <CompactMetric label="Unpaid balance cited" value={money(GLORIETA_FORMAL_UNPAID_BALANCE)} detail="Balance cited in the formal dispute package for Account 2745714336." tone="gold" />
        <CompactMetric label="Building 8 support" value={money(extracted)} detail="Current charges from Building 8 records inside the dispute window." tone="blue" />
        <CompactMetric label="Reviewed source files" value={String(dispute.summary.sourceFileCount)} detail={`${dispute.summary.canonicalBillCount} canonical records after duplicate control.`} tone="blue" />
      </div>

      <Tabs defaultValue="case" className="px-4 pb-5 md:px-6">
        <div className="sticky top-2 z-20 mt-1 rounded-[28px] border-2 border-[#d5aa52] bg-[#061f1a] p-2 shadow-2xl shadow-[#08271f]/25" data-testid="glorieta-popped-nav">
          <div className="mb-2 flex items-center justify-between gap-3 px-2 text-white">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f6df9c]">Start here - review navigation</div>
            <div className="hidden items-center gap-2 rounded-full bg-[#d5aa52] px-3 py-1 text-[11px] font-black uppercase text-[#08271f] md:flex">
              Use tabs <ArrowRight className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[20px] border border-white/15 bg-white/10 p-1.5">
            <TabsTrigger value="case" className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm data-[state=active]:border-[#f6df9c] data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Case</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm data-[state=active]:border-[#f6df9c] data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Analytics</TabsTrigger>
            <TabsTrigger value="regulatory" className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm data-[state=active]:border-[#f6df9c] data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Regulatory Basis</TabsTrigger>
            <TabsTrigger value="letter" className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm data-[state=active]:border-[#f6df9c] data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">City Letter</TabsTrigger>
            <TabsTrigger value="evidence" className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm data-[state=active]:border-[#f6df9c] data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Evidence</TabsTrigger>
            <TabsTrigger value="qa" className="rounded-2xl border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm data-[state=active]:border-[#f6df9c] data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Q&amp;A</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="case" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Plain-English position
              </div>
              <h3 className="mt-2 font-display text-3xl text-[#08271f]">What the factual billing dispute is</h3>
              <div className="mt-4 grid gap-3">
                <ExplanationCard title="The disputed account is Building 8" body={`Account ${dispute.summary.disputeAccount}, Meter ${dispute.summary.disputeMeter}, Building 8 / 13200 Alexandria Drive is the account being challenged.`} />
                <ExplanationCard title="The dispute is about a back-bill, not a broad damages claim" body={`The formal dispute package cites a ${money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill, a ${money(GLORIETA_FORMAL_UNPAID_BALANCE)} unpaid balance, and estimated usage of about 216,000 gallons per month.`} />
                <ExplanationCard title="The vacancy record matters" body="Building 8 was red-tagged, condemned, vacated, and under rehabilitation during the core dispute window. That is why occupied-building estimated usage needs to be corrected to actual reads or a reasonable vacant-building basis." />
                <ExplanationCard title="The review stays bill-backed" body={`The reviewed Building 8 dispute-window subtotal is ${money(extracted)} in current charges and ${dispute.summary.disputeGallons.toLocaleString()} gallons. This page does not add speculative numbers to the case.`} />
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-[#dedbd1] bg-white p-5">
              <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
                <svg viewBox="0 0 600 260" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 90 C70 30 135 150 205 90 S345 30 420 90 535 150 600 90" fill="none" stroke="#1D6FE8" strokeWidth="18" />
                  <path d="M0 175 C85 115 130 230 220 175 S365 115 455 175 545 225 600 175" fill="none" stroke="#C4A35A" strokeWidth="14" />
                </svg>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
                <AlertTriangle className="h-4 w-4 text-rose-600" /> Billing timeline
              </div>
              <h3 className="relative mt-2 font-display text-2xl text-[#08271f]">Pre, vacancy, and post-rehab story</h3>
              <div className="relative mt-5 grid gap-3">
                {[
                  ['Pre-Vacancy', 'Before Aug 2023', 'Normal operations before Building 8 was condemned.'],
                  ['Vacancy / Rehab', 'Aug 2023 - Feb 2025', 'Building 8 was red-tagged, vacated, and under rehabilitation. This is the core reason estimated occupied usage should be challenged.'],
                  ['Post-Rehab', 'Mar 2025 - Sep 2026', 'Building reoccupation and the later back-bill/dispute activity occur here.'],
                ].map(([title, dates, body], index) => (
                  <div key={title} className={`rounded-2xl border px-4 py-3 ${index === 1 ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-[#e8e3d8] bg-[#fcfbf7] text-[#3d4a45]'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-[#08271f]">{title}</strong>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#8a8478]">{dates}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Bracketed comparison
            </div>
            <h3 className="mt-2 font-display text-3xl text-[#08271f]">Pre, vacancy, and current billing periods</h3>
            <p className="mt-2 max-w-5xl text-sm leading-relaxed text-[#5c6863]">
              This is the same structure used in the evidence packet. The rose bracket is the disputed vacancy and rehabilitation period: August 2023 through February 2025. The dollars are current charges from canonical WASD bill records. The gallons are the stated consumption on those bills. The meter reads are copied from the bill when both the prior and current register reads are present.
            </p>
            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <PhaseBracketCard focused={dispute.focusedPhase} phaseKey="pre" tone="slate" />
              <PhaseBracketCard focused={dispute.focusedPhase} phaseKey="vacancy" tone="rose" />
              <PhaseBracketCard focused={dispute.focusedPhase} phaseKey="current" tone="forest" />
            </div>
          </section>

          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-700">Amount to keep front and center</div>
                <h3 className="mt-1 font-display text-3xl text-[#08271f]">The Building 8 dispute is in the approximately $100,000 range</h3>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#4f2027]">
                  The formal package cites a {money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill and a {money(GLORIETA_FORMAL_UNPAID_BALANCE)} unpaid balance. The reviewed Building 8 bill records inside the dispute window total {money(extracted)} in current charges and {dispute.summary.disputeGallons.toLocaleString()} gallons. That is why the analysis should stay focused on the Building 8 back-bill, not any speculative or unrelated number.
                </p>
              </div>
              <div className="min-w-56 rounded-2xl bg-white p-4 text-center ring-1 ring-rose-200">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">Reviewed support</div>
                <div className="mt-1 font-mono text-3xl font-black text-[#08271f]">{money(extracted)}</div>
                <div className="mt-1 text-xs font-semibold text-[#5c6863]">Building 8 dispute-window current charges</div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-[#dedbd1] bg-white p-5">
            <div>
              <h3 className="font-display text-2xl text-[#08271f]">Building 7 and Building 8 phase table</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#5c6863]">
                Building 7 is included because it is part of the same vacancy and rehabilitation story. Building 8 is the disputed account. A data gap means the current source backup did not include a canonical bill for that building and phase.
              </p>
            </div>
            <FocusPhaseTable focused={dispute.focusedPhase} />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <BuildingMonthlyTable title="Building 7 source rows" rows={building7Rows} />
            <BuildingMonthlyTable title="Building 8 source rows" rows={building8Rows} />
          </div>
        </TabsContent>

        <TabsContent value="regulatory" className="mt-4">
          <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
              <Scale className="h-4 w-4 text-[#1D6FE8]" /> Regulatory explanation
            </div>
            <h3 className="mt-2 font-display text-3xl text-[#08271f]">Why the estimate should not stand without correction</h3>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#5c6863]">
              In simple English: if a building was condemned, vacant, and under rehabilitation, an occupied-building estimate is not a reliable measure of water that actually passed through the meter. The request is to correct the account using actual reads, meter-change records, or a reasonable vacant-building consumption basis.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {dispute.regulatoryPoints.map((point) => (
                <a key={point.label} href={point.href} target="_blank" rel="noreferrer" className="rounded-2xl border border-[#e8e3d8] bg-[#fcfbf7] p-4 transition hover:border-[#C4A35A] hover:bg-white">
                  <div className="font-semibold text-[#08271f]">{point.label}</div>
                  <p className="mt-1 text-sm leading-relaxed text-[#5c6863]">{point.body}</p>
                  <div className="mt-3 text-xs font-semibold text-[#1D6FE8]">Open source</div>
                </a>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="letter" className="mt-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="rounded-3xl border border-[#dedbd1] bg-white p-4 md:p-5">
              <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Editable HTML draft</div>
                  <h3 className="font-display text-2xl text-[#08271f]">Letter to Opa-locka / WASD</h3>
                </div>
                <Button variant="outline" onClick={copyLetter}>
                  {copied ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy text'}
                </Button>
                <Button variant="outline" asChild>
                  <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`}>
                    <Mail className="mr-1.5 h-4 w-4" /> Email draft
                  </a>
                </Button>
                <Button
                  className="bg-[#08271f] hover:bg-[#08271f]/90"
                  disabled={savePortalNote.isPending}
                  onClick={persistLetter}
                >
                  {savePortalNote.isPending ? 'Saving...' : 'Save to portal'}
                </Button>
              </div>
              {savedDraft && (
                <p className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs leading-relaxed text-emerald-900">
                  Saved draft loaded from the shared billing review record. Last saved {new Date(savedDraft.created_at).toLocaleString()} by {savedDraft.author_name || 'reviewer'}.
                </p>
              )}
              <ProRichTextEditor content={letterHtml} onChange={setLetterHtml} minHeight="520px" />
            </section>

            <aside className="space-y-4">
              <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
                  <FileText className="h-4 w-4" /> Client preview
                </div>
                <div className="mt-3 max-h-[360px] overflow-y-auto rounded-2xl border border-[#e8e3d8] bg-[#fcfbf7] p-4">
                  <RichTextViewer content={letterHtml} />
                </div>
              </section>
              <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
                  <FilePenLine className="h-4 w-4" /> Review comments
                </div>
                {mode === 'magic' && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      value={reviewerName}
                      onChange={(event) => setReviewerName(event.target.value)}
                      placeholder="Your name"
                      className="h-10 rounded-xl border border-[#dedbd1] bg-[#fcfbf7] px-3 text-sm outline-none focus:ring-2 focus:ring-[#C4A35A]"
                    />
                    <input
                      value={reviewerEmail}
                      onChange={(event) => setReviewerEmail(event.target.value)}
                      placeholder="Your email"
                      className="h-10 rounded-xl border border-[#dedbd1] bg-[#fcfbf7] px-3 text-sm outline-none focus:ring-2 focus:ring-[#C4A35A]"
                    />
                  </div>
                )}
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Add redline notes or client comments here. Save them and the review team will see the comment in the portal record."
                  className="mt-3 min-h-[150px] w-full rounded-2xl border border-[#dedbd1] bg-[#fcfbf7] p-3 text-sm outline-none focus:ring-2 focus:ring-[#C4A35A]"
                />
                <Button
                  className="mt-3 w-full bg-[#08271f] hover:bg-[#08271f]/90"
                  disabled={savePortalNote.isPending || reviewNote.trim().length < 2}
                  onClick={persistReviewNote}
                >
                  {savePortalNote.isPending ? 'Saving comment...' : 'Save client comment to portal'}
                </Button>
                <p className="mt-2 text-xs leading-relaxed text-[#6d746f]">
                  {confidential ? 'Magic-link comments save into the same billing review record visible in the portal.' : 'Staff and client comments are part of the shared billing review note trail.'}
                </p>
                <div className="mt-4 space-y-2">
                  {reviewNotes.length > 0 && (
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Saved client comments</div>
                  )}
                  {reviewNotes.slice(0, 6).map((note) => (
                    <article key={note.id} className="rounded-2xl border border-[#e8e3d8] bg-[#fcfbf7] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8a8478]">
                        <span className="font-semibold text-[#08271f]">{note.author_name || 'Reviewer'}</span>
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#3d4a45]">{cleanReviewNote(note)}</p>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
              <FileText className="h-4 w-4 text-[#1D6FE8]" /> Evidence and gaps
            </div>
            <h3 className="mt-2 font-display text-3xl text-[#08271f]">What is proven and what still needs reconciliation</h3>
            <div className="mt-5 grid gap-3">
              {dispute.evidenceFacts.map((fact) => (
                <div key={fact} className="flex gap-3 rounded-2xl border border-[#e8e3d8] bg-[#fcfbf7] p-4 text-sm leading-relaxed text-[#5c6863]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="qa" className="mt-4">
          <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
              <MessageSquareWarning className="h-4 w-4 text-[#1D6FE8]" /> Questions and review posture
            </div>
            <h3 className="mt-2 font-display text-3xl text-[#08271f]">CFO answer bank</h3>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#5c6863]">
              These are the quick answers a CFO or budget director needs before deciding whether the Building 8 bill should be paid, disputed, reserved, or escalated.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <CfoAnswerCard
                accent="rose"
                title="1. What is the approximately $100k problem?"
                answer={`The issue is a Building 8 back-bill. The formal dispute package cites a ${money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill, while the reviewed Building 8 bill records show ${money(extracted)} in current charges inside the dispute window. Those figures are close enough that the CFO should treat this as one bill-backed dispute workstream, not a broad unsupported damages number.`}
              />
              <CfoAnswerCard
                accent="gold"
                title="2. Is this one meter or the whole complex?"
                answer={`The challenged account is one meter: Building 8, Account ${dispute.summary.disputeAccount}, Meter ${dispute.summary.disputeMeter}. The whole complex data still matters because it lets the reviewer compare this account against ${dispute.summary.accountCount} total service accounts and see whether the disputed period stands out from the rest of Glorieta.`}
              />
              <CfoAnswerCard
                accent="blue"
                title="3. How much water is tied to the disputed window?"
                answer={`The indexed Building 8 dispute window carries ${dispute.summary.disputeGallons.toLocaleString()} gallons. The formal dispute also references estimated usage of about 216,000 gallons per month, which should be reconciled against actual reads, not accepted as ordinary occupied-building consumption.`}
              />
              <CfoAnswerCard
                title="4. What does the entire complex data show?"
                answer={`${dispute.summary.sourceFileCount} WASD PDFs were reviewed into ${dispute.summary.canonicalBillCount} canonical account-period records across ${dispute.summary.accountCount} service accounts. Across the reviewed complex ledger, current charges total ${money(complexSpend)} and consumption totals ${complexGallons.toLocaleString()} gallons, so the CFO can see Building 8 in context instead of as an isolated PDF.`}
              />
              <CfoAnswerCard
                accent="rose"
                title="5. How big is Building 8 compared with the full ledger?"
                answer={`The Building 8 dispute-window subtotal is about ${disputeShare.toFixed(1)}% of indexed complex current charges. The broader vacancy-window spend across all meters is ${money(vacancyComplexSpend)}, which helps separate the single disputed meter from normal complex-wide operating water costs.`}
              />
              <CfoAnswerCard
                accent="blue"
                title="6. What should finance ask for before paying?"
                answer="Ask for the meter-change work order, starting register read, monthly actual read history, estimate basis, rebill worksheet, payment ledger, late-charge ledger, and investigation notes. Without that package, finance cannot tell whether the back-bill is supported by actual consumption."
              />
              <CfoAnswerCard
                accent="gold"
                title="7. What is the recommended accounting posture?"
                answer={`Treat the ${money(GLORIETA_FORMAL_UNPAID_BALANCE)} cited unpaid balance as disputed pending reconciliation. The business question is not whether Glorieta uses water; it is whether this Building 8 back-bill is supported during the red-tagged/vacant/rehab period.`}
              />
              <CfoAnswerCard
                title="8. Which comparison should leadership look at first?"
                answer="Start with the pre-vacancy, vacancy/rehab, and current Building 7 and Building 8 comparison. Building 8 is the disputed account, and Building 7 helps leadership see the same property period in context."
              />
            </div>

            <h3 className="mt-8 font-display text-2xl text-[#08271f]">Additional review questions</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ['Which account and meter are actually disputed?', `Building 8, Account ${dispute.summary.disputeAccount}, Meter ${dispute.summary.disputeMeter}. Keep the case focused there unless another statement shows the same problem.`],
                ['What period should be challenged?', 'The vacancy/rehab window is the central period: August 2023 through February 2025, with the indexed dispute ledger running April 2024 through January 2026.'],
                ['What dollar amount is supported by the formal dispute?', `The formal package cites a ${money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill and a ${money(GLORIETA_FORMAL_UNPAID_BALANCE)} unpaid balance.`],
                ['What does the bill archive show?', `The reviewed Building 8 dispute-window subtotal is ${money(extracted)} in current charges and ${dispute.summary.disputeGallons.toLocaleString()} gallons.`],
                ['Why is the estimate suspect?', 'Because the building was red-tagged, vacated, and under rehabilitation while the billing record refers to large estimated usage.'],
                ['What proof should the City or WASD produce?', 'Actual reads, meter-change work orders, starting register reads, estimate worksheets, adjustment worksheets, payment ledger, late-charge ledger, and investigation notes.'],
                ['What would justify killing the charge?', 'A record showing that the rebilled usage is not supported by actual consumption, actual reads, or a reasonable vacant-building consumption basis.'],
                ['Which accounts are not part of the current dispute?', 'The other Glorieta meters remain useful as context, but the present billing challenge is Building 8 unless another account is separately documented.'],
                ['How should the pre/post chart be read?', 'It shows whether charges cluster during the vacancy/rehab window compared with normal operations before and after the building was reoccupied.'],
                ['What is the most important next step?', 'Send the corrected-billing request with the exact account, meter, vacancy timeline, rebill amount, unpaid balance, and document request.'],
                ['What should not be included?', 'Do not include unrelated field issues, speculative damages, or unsupported dollar targets. Keep the package bill-backed.'],
                ['What response should leadership expect?', 'A defensible response should include the rebill worksheet, meter history, estimate basis, and a credit or corrected account statement if the estimate cannot be supported.'],
              ].map(([title, body]) => (
                <ExplanationCard key={title} title={title} body={body} />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" size="sm"><ThumbsUp className="mr-1.5 h-4 w-4" /> Useful</Button>
              <Button variant="outline" size="sm"><ThumbsDown className="mr-1.5 h-4 w-4" /> Needs work</Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </section>
  );
}
