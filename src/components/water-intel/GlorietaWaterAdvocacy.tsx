import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FilePenLine,
  FileText,
  LockKeyhole,
  MessageSquareWarning,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { buildGlorietaDisputeCase, type GlorietaMonthlyPoint } from '@/lib/water-intel/glorietaDispute';
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

function InternalActionCard() {
  return (
    <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex items-start gap-3">
        <MessageSquareWarning className="mt-1 h-5 w-5 shrink-0" />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em]">Internal site-action note</div>
          <h3 className="mt-1 font-display text-2xl text-[#08271f]">Manhole fabric follow-up</h3>
          <p className="mt-2 text-sm leading-relaxed">
            Chris is following up on leftover fabric in the manholes. Internal draft response: "Please visit the site and get it out. Please let me know when you will get it done. Thank you."
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Follow-up context: the issue was shared with Chris yesterday and he acknowledged it. APAS plans to follow up again today. Payment may need to be held until the manhole fabric is removed because that may be the practical lever to get the field remediation completed.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide">Not sent. Keep separate from the billing dispute package.</p>
        </div>
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
  const claim = dispute.summary.claimedCreditTarget;
  const extracted = dispute.summary.disputeCurrentCharges;
  const gapToClaim = Math.max(0, claim - extracted);

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
        <CompactMetric label="Claim target" value={money(claim)} detail="Owner-requested full disputed exposure for reconciliation." tone="rose" />
        <CompactMetric label="Bill-backed subtotal" value={money(extracted)} detail="Extracted Building 8 current charges in the dispute window." tone="gold" />
        <CompactMetric label="Indexed source files" value={String(dispute.summary.sourceFileCount)} detail={`${dispute.summary.canonicalBillCount} canonical records after duplicate control.`} tone="blue" />
        <CompactMetric label="Review queue" value={String(dispute.summary.reviewQueueCount)} detail="Needs human confirmation before driving the final claim." />
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
          {mode === 'staff' && <InternalActionCard />}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Plain-English position
              </div>
              <h3 className="mt-2 font-display text-3xl text-[#08271f]">Why the credit argument is strong</h3>
              <div className="mt-4 grid gap-3">
                <ExplanationCard title="The building was not normally occupied" body="The dispute package says Building 8 was condemned, vacant, and under rehabilitation through the period when high estimated usage was billed. That makes ordinary apartment consumption an unreliable assumption." />
                <ExplanationCard title="The bill was driven by estimates and rebilling" body="The formal dispute identifies a retroactive rebill and estimated monthly usage. The request asks the City and WASD to reconcile those estimates to actual reads, meter-change records, and reasonable vacant-building usage." />
                <ExplanationCard title="The analytics separate proof from claim" body={`ProjOS shows the auditable bill subtotal (${money(extracted)}) separately from the requested ${money(claim)} exposure target. That helps the owner make the larger case without overstating what has already been extracted from statements.`} />
                <ExplanationCard title="Where the $1.1M number came from" body={`${money(claim)} is a working claim target entered into ProjOS from the owner-side request, not a WASD bill total. The source-backed figures currently visible are the ${money(extracted)} extracted Building 8 dispute-window subtotal, the $95,017.57 retroactive rebill, and the $113,874.41 unpaid balance cited in the formal dispute package. Keep the $1.1M labeled as under-reconciliation until counsel or the owner supplies the supporting schedule.`} />
              </div>
            </section>

            <section className="rounded-3xl border border-[#dedbd1] bg-white p-5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">
                <AlertTriangle className="h-4 w-4 text-rose-600" /> Reconciliation bridge
              </div>
              <h3 className="mt-2 font-display text-2xl text-[#08271f]">From extracted subtotal to full claim</h3>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8f6ef] px-4 py-3 text-sm">
                  <span>Owner claim target</span>
                  <strong className="font-mono text-[#08271f]">{money(claim)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8f6ef] px-4 py-3 text-sm">
                  <span>Statement subtotal currently indexed</span>
                  <strong className="font-mono text-[#08271f]">{money(extracted)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  <span>Needs reconciliation support</span>
                  <strong className="font-mono">{money(gapToClaim)}</strong>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#5c6863]">
                The next evidence step is to connect the remaining claim amount to late charges, total account balance history, rebill worksheets, service-risk consequences, and any owner damages or payments already made.
              </p>
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
                <h3 className="font-display text-2xl text-[#08271f]">Which account carries the cost</h3>
                <p className="mt-1 text-sm text-[#5c6863]">Sorted by extracted current charges across the canonical bill archive. Building 8 is isolated as the formal dispute account.</p>
                <div className="mt-4 h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dispute.accounts} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke="#efe9da" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#8a8478' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                      <YAxis type="category" dataKey="label" width={145} tick={{ fontSize: 11, fill: '#08271f' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<TrendTip />} />
                      <Bar dataKey="spend" name="Current charges" radius={[0, 8, 8, 0]}>
                        {dispute.accounts.map((row) => (
                          <Cell key={row.accountNumber} fill={row.accountNumber === dispute.summary.disputeAccount ? ROSE : FOREST} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
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
            <h3 className="mt-2 font-display text-3xl text-[#08271f]">Questions the financial reviewer will ask</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ExplanationCard title="Can we prove the $1.1M?" body="Not yet from bills alone. The dashboard intentionally separates the working claim target from source-backed bill totals so the final letter can be reconciled to statements, late charges, payments, service consequences, and owner damages." />
              <ExplanationCard title="Why is the water intensity low?" body="Because the measured ledger window includes vacancy/rehab conditions and uses connected units as the denominator. That is useful evidence for disputing occupied-building estimates, but it is not a standalone efficiency certification." />
              <ExplanationCard title="What should be requested from the City/WASD?" body="Ask for meter-change records, register reads, estimate worksheets, rebill worksheets, payment ledger, late-charge ledger, and the investigative notes behind the Building 8 rebill." />
              <ExplanationCard title="What should APAS save?" body="Keep the edited city letter, reviewer comments, source PDFs, extracted fact index, and any owner reconciliation schedule in the Water Intelligence record so the magic-link review and staff portal stay connected." />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </section>
  );
}
