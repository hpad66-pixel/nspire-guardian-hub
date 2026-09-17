import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { ProRichTextEditor, RichTextViewer } from '@/components/ui/rich-text-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildGlorietaDisputeCase,
  GLORIETA_FORMAL_RETROACTIVE_REBILL,
  GLORIETA_FORMAL_UNPAID_BALANCE,
  type GlorietaMonthlyPoint,
} from '@/lib/water-intel/glorietaDispute';
import { gallons, money, type WaterExecNote } from '@/lib/water-intel';
import { useWaterNotes, type WaterIntelScope } from '@/hooks/useWaterIntelligence';

const FOREST = '#08271f';
const GOLD = '#C4A35A';
const BLUE = '#1D6FE8';
const ROSE = '#E11D48';
export const GLORIETA_CITY_LETTER_MARKER = '[[GLORIETA_CITY_LETTER_DRAFT_V1]]';

interface TipEntry {
  dataKey?: string;
  name?: string;
  value?: number;
}

function currency(value: unknown) {
  return money(Number(value) || 0);
}

function TrendTip({ active, payload, label }: { active?: boolean; payload?: TipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#dedbd1] bg-white px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-[#08271f]">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex min-w-48 justify-between gap-4 text-[#5c6863]">
          <span>{entry.name}</span>
          <span className="font-mono font-semibold text-[#08271f]">
            {String(entry.dataKey).toLowerCase().includes('gallons') ? gallons(entry.value || 0) : currency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

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

function extractSavedLetter(note: WaterExecNote | undefined) {
  if (!note?.body.includes(GLORIETA_CITY_LETTER_MARKER)) return null;
  const html = note.body.split(GLORIETA_CITY_LETTER_MARKER)[1]?.trim();
  return html || null;
}

function savedLetterNote(notes: WaterExecNote[]) {
  return notes.find((note) => note.body.includes(GLORIETA_CITY_LETTER_MARKER));
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
  const [letterHtml, setLetterHtml] = useState(dispute.draftLetterHtml);
  const [reviewNote, setReviewNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastLoadedDraftId, setLastLoadedDraftId] = useState<string | null>(null);
  const confidential = mode === 'magic';
  const saveLetter = useWaterNotes(scope);

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
    saveLetter.mutate({
      body: `Glorieta City Letter Draft\nSaved from Water Intelligence on ${new Date().toLocaleString()}\n\n${GLORIETA_CITY_LETTER_MARKER}\n${letterHtml}`,
      authorName: mode === 'magic' ? 'Magic-link reviewer' : 'APAS Water Intelligence',
      authorEmail: undefined,
    });
  }

  const recentDispute = dispute.disputeMonthly.slice(-12);
  const extracted = dispute.summary.disputeCurrentCharges;
  const complexSpend = dispute.accounts.reduce((sum, account) => sum + account.spend, 0);
  const complexGallons = dispute.accounts.reduce((sum, account) => sum + account.gallons, 0);
  const vacancyComplexSpend = dispute.meterTimeline.reduce((sum, account) => sum + account.vacancySpend, 0);
  const disputeShare = complexSpend > 0 ? (extracted / complexSpend) * 100 : 0;
  const topContextMeter = dispute.meterTimeline.find((account) => !account.isDispute);
  const mailSubject = encodeURIComponent(`Glorieta Gardens billing dispute - Account ${dispute.summary.disputeAccount}`);
  const mailBody = encodeURIComponent(letterHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#dedbd1] bg-[#f7f3ea] shadow-sm" data-testid="glorieta-water-advocacy">
      <div className="border-b border-[#dedbd1] bg-[#061f1a] px-5 py-5 text-white md:px-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d5aa52]">
              <LockKeyhole className="h-3.5 w-3.5" /> Confidential for our use and analysis
            </div>
            <h2 className="mt-3 font-display text-3xl font-medium leading-tight md:text-4xl">
              Glorieta Gardens Water Intelligence dispute workspace
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#c5d2cd]">
              Powered by ProjOS for APAS Consulting. This workspace turns the WASD bills, Building 8 vacancy record, trend analytics, and draft city letter into one reviewable client link.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-[#d8e2de]">
            <div className="font-semibold text-white">Client-ready magic-link posture</div>
            <div>No login required when opened through the Water Intelligence secure token.</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 md:p-6">
        <CompactMetric label="Formal rebill cited" value={money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} detail="Retroactive back-bill amount cited in the July 23, 2026 dispute package." tone="rose" />
        <CompactMetric label="Unpaid balance cited" value={money(GLORIETA_FORMAL_UNPAID_BALANCE)} detail="Balance cited in the formal dispute package for Account 2745714336." tone="gold" />
        <CompactMetric label="Indexed bill subtotal" value={money(extracted)} detail="Current charges extracted from Building 8 records inside the dispute window." tone="blue" />
        <CompactMetric label="Indexed source files" value={String(dispute.summary.sourceFileCount)} detail={`${dispute.summary.canonicalBillCount} canonical records after duplicate control.`} tone="blue" />
      </div>

      <Tabs defaultValue="case" className="px-4 pb-5 md:px-6">
        <TabsList className="sticky top-2 z-10 h-auto w-full flex-wrap justify-start gap-1 rounded-[22px] border border-[#08271f]/10 bg-[#08271f] p-1.5 shadow-lg shadow-[#08271f]/10">
          <TabsTrigger value="case" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70 data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Case</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70 data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Analytics</TabsTrigger>
          <TabsTrigger value="regulatory" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70 data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Regulatory Basis</TabsTrigger>
          <TabsTrigger value="letter" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70 data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">City Letter</TabsTrigger>
          <TabsTrigger value="evidence" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70 data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Evidence</TabsTrigger>
          <TabsTrigger value="qa" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70 data-[state=active]:bg-[#d5aa52] data-[state=active]:text-[#08271f]">Q&amp;A</TabsTrigger>
        </TabsList>

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
                <ExplanationCard title="The dashboard stays bill-backed" body={`ProjOS shows the extracted Building 8 dispute-window subtotal as ${money(extracted)} in current charges and ${dispute.summary.disputeGallons.toLocaleString()} gallons. It does not add speculative numbers to the case.`} />
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
          <Tabs defaultValue="trend">
            <TabsList className="h-auto flex-wrap rounded-2xl bg-white p-1">
              <TabsTrigger value="trend" className="rounded-xl">Trend</TabsTrigger>
              <TabsTrigger value="accounts" className="rounded-xl">Meters</TabsTrigger>
              <TabsTrigger value="dispute" className="rounded-xl">Dispute window</TabsTrigger>
            </TabsList>
            <TabsContent value="trend" className="mt-4">
              <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
                <h3 className="font-display text-2xl text-[#08271f]">Spend and gallons over time</h3>
                <p className="mt-1 text-sm text-[#5c6863]">The blue line is gallons. The dark line is current charges. This lets the owner see whether charges are tracking real usage or diverging from the meter story.</p>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dispute.monthly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#efe9da" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="spend" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                      <YAxis yAxisId="gallons" orientation="right" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                      <Tooltip content={<TrendTip />} />
                      <Line yAxisId="spend" type="monotone" dataKey="spend" name="Current charges" stroke={FOREST} strokeWidth={2.25} dot={false} />
                      <Line yAxisId="gallons" type="monotone" dataKey="gallons" name="Gallons" stroke={BLUE} strokeWidth={2.25} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="accounts" className="mt-4">
              <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
                <h3 className="font-display text-2xl text-[#08271f]">Pre / vacancy / post-rehab meter comparison</h3>
                <p className="mt-1 text-sm text-[#5c6863]">Each row is a meter/account. Building 8 is highlighted because Account {dispute.summary.disputeAccount} is the disputed back-bill account.</p>
                <div className="mt-4 h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dispute.meterTimeline} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke="#efe9da" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                      <YAxis type="category" dataKey="label" width={145} tick={{ fontSize: 11, fill: '#08271f' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TrendTip />} />
                      <Bar dataKey="preVacancySpend" name="Pre-vacancy" stackId="period" fill="#94A3B8" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="vacancySpend" name="Vacancy/rehab" stackId="period" fill={ROSE} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="postRehabSpend" name="Post-rehab" stackId="period" fill={FOREST} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#5c6863]">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Pre-vacancy</span>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-900">Vacancy/rehab disputed period</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">Post-rehab</span>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="dispute" className="mt-4">
              <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
                <h3 className="font-display text-2xl text-[#08271f]">Building 8 dispute-window pulse</h3>
                <p className="mt-1 text-sm text-[#5c6863]">These are the latest extracted Building 8 monthly records inside the disputed vacancy/rehab window.</p>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={recentDispute as GlorietaMonthlyPoint[]} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#efe9da" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                      <Tooltip content={<TrendTip />} />
                      <Bar dataKey="disputeSpend" name="Disputed charges" fill={ROSE} radius={[8, 8, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </TabsContent>
          </Tabs>
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
                  disabled={saveLetter.isPending}
                  onClick={persistLetter}
                >
                  {saveLetter.isPending ? 'Saving...' : 'Save to portal'}
                </Button>
              </div>
              {savedDraft && (
                <p className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs leading-relaxed text-emerald-900">
                  Saved draft loaded from the Water Intelligence record. Last saved {new Date(savedDraft.created_at).toLocaleString()} by {savedDraft.author_name || 'reviewer'}.
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
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Add redline notes or client comments here. This stays in the browser until copied into a formal record."
                  className="mt-3 min-h-[150px] w-full rounded-2xl border border-[#dedbd1] bg-[#fcfbf7] p-3 text-sm outline-none focus:ring-2 focus:ring-[#C4A35A]"
                />
                <p className="mt-2 text-xs leading-relaxed text-[#6d746f]">
                  {confidential ? 'Magic-link edits are local review notes; they are not submitted unless copied into an instruction or note.' : 'Staff can move approved language into correspondence or the document studio after review.'}
                </p>
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
                answer={`The issue is a Building 8 back-bill. The formal dispute package cites a ${money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill, while ProjOS has indexed ${money(extracted)} in Building 8 current charges inside the dispute window. Those figures are close enough that the CFO should treat this as one bill-backed dispute workstream, not a broad unsupported damages number.`}
              />
              <CfoAnswerCard
                accent="gold"
                title="2. Is this one meter or the whole complex?"
                answer={`The challenged account is one meter: Building 8, Account ${dispute.summary.disputeAccount}, Meter ${dispute.summary.disputeMeter}. The whole complex data still matters because ProjOS compares this account against ${dispute.summary.accountCount} total service accounts to show whether the disputed period stands out from the rest of Glorieta.`}
              />
              <CfoAnswerCard
                accent="blue"
                title="3. How much water is tied to the disputed window?"
                answer={`The indexed Building 8 dispute window carries ${dispute.summary.disputeGallons.toLocaleString()} gallons. The formal dispute also references estimated usage of about 216,000 gallons per month, which should be reconciled against actual reads, not accepted as ordinary occupied-building consumption.`}
              />
              <CfoAnswerCard
                title="4. What does the entire complex data show?"
                answer={`ProjOS has indexed ${dispute.summary.sourceFileCount} WASD PDFs into ${dispute.summary.canonicalBillCount} canonical account-period records across ${dispute.summary.accountCount} service accounts. Across the indexed complex ledger, current charges total ${money(complexSpend)} and consumption totals ${complexGallons.toLocaleString()} gallons, so the CFO can see Building 8 in context instead of as an isolated PDF.`}
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
                answer={`Start with the pre/vacancy/post-rehab meter comparison. Building 8 is highlighted, and ${topContextMeter ? `${topContextMeter.label} is shown as complex context` : 'the other meters are shown as complex context'}, so leadership can see whether the charge pattern is isolated to the disputed account.`}
              />
            </div>

            <h3 className="mt-8 font-display text-2xl text-[#08271f]">Additional review questions</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ['Which account and meter are actually disputed?', `Building 8, Account ${dispute.summary.disputeAccount}, Meter ${dispute.summary.disputeMeter}. Keep the case focused there unless another statement shows the same problem.`],
                ['What period should be challenged?', 'The vacancy/rehab window is the central period: August 2023 through February 2025, with the indexed dispute ledger running April 2024 through January 2026.'],
                ['What dollar amount is supported by the formal dispute?', `The formal package cites a ${money(GLORIETA_FORMAL_RETROACTIVE_REBILL)} retroactive rebill and a ${money(GLORIETA_FORMAL_UNPAID_BALANCE)} unpaid balance.`],
                ['What does ProjOS extract from the bill archive?', `The indexed Building 8 dispute-window subtotal is ${money(extracted)} in current charges and ${dispute.summary.disputeGallons.toLocaleString()} gallons.`],
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
