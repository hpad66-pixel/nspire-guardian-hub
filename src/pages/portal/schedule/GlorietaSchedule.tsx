import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Lock, Quote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPortalSession } from '@/hooks/usePortal';
import { DEFAULT_AREAS } from './milestoneData';
import { PortalQAPanel, type PortalQaMessage } from '@/components/portal/PortalQAPanel';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface GlorietaScheduleProps {
  portalId: string;
  portalName: string;
  accentColor?: string;
}

interface QuestionDef {
  question_key: string;
  label: string;
  input_type: string;
  options: string[] | null;
  placeholder: string | null;
  is_full_width: boolean;
  sort_order: number;
}

interface ScheduleContent {
  navBrand?: string;
  navBadge?: string;
  navPowered?: string;
  heroTitle?: string;
  heroBody?: string;
  heroTags?: string[];
  commitDate?: string;
  commitSub?: string;
  commitNote?: string;
  pullQuoteText?: string;
  pullQuoteSub?: string;
  footerBrand?: string;
  footerTag?: string;
  footerMeta?: string;
  areaCards?: Array<{
    letter: string;
    title: string;
    stat?: string;
    body?: string;
    units?: string;
  }>;
}

interface MilestoneRecord {
  area: string;
  milestone_id: string;
  name: string;
  owner: string;
  priority_label: string;
  priority_class: string;
  sort_order: number;
  is_locked: boolean;
  target_date: string | null;
}

const DEFAULT_QUESTIONS: QuestionDef[] = [
  { question_key: 'timeline', label: 'Are you comfortable with the current timeline?', input_type: 'radio', options: ['Yes', 'No', 'Need Discussion'], placeholder: null, is_full_width: false, sort_order: 1 },
  { question_key: 'budget', label: 'Any budget concerns?', input_type: 'radio', options: ['On Track', 'Needs Review', 'Over Budget'], placeholder: null, is_full_width: false, sort_order: 2 },
  { question_key: 'quality', label: 'Quality satisfaction so far?', input_type: 'radio', options: ['Excellent', 'Good', 'Needs Improvement'], placeholder: null, is_full_width: false, sort_order: 3 },
  { question_key: 'communication', label: 'How is communication?', input_type: 'radio', options: ['Great', 'Adequate', 'Needs Improvement'], placeholder: null, is_full_width: false, sort_order: 4 },
  { question_key: 'concerns', label: 'Any specific concerns or change requests?', input_type: 'textarea', options: null, placeholder: 'Type your concerns here...', is_full_width: true, sort_order: 5 },
  { question_key: 'comments', label: 'Additional comments for the team', input_type: 'textarea', options: null, placeholder: 'Any other feedback...', is_full_width: true, sort_order: 6 },
];

const DEFAULT_CONTENT: ScheduleContent = {
  navPowered: 'Build Space',
  heroTitle: 'Three areas. Eight steps. One readout.',
  heroBody: 'Track every area, milestone, certification step, and handover note from one interactive schedule.',
  heroTags: ['Construction', 'Client Portal', 'Interactive Schedule'],
  commitSub: 'Current Commitment',
  commitNote: 'Milestones, notes, and questions on this page stay visible to the project team and portal users.',
};

const AREA_LABELS = DEFAULT_AREAS.reduce<Record<string, string>>((acc, area) => {
  acc[area.key] = area.label;
  return acc;
}, {});

function fallbackMilestones(): MilestoneRecord[] {
  return DEFAULT_AREAS.flatMap((area) =>
    area.milestones.map((milestone, index) => ({
      area: area.key,
      milestone_id: milestone.id,
      name: milestone.name,
      owner: milestone.owner,
      priority_label: milestone.priorityLabel,
      priority_class: milestone.priorityClass,
      sort_order: index + 1,
      is_locked: false,
      target_date: milestone.targetDate ?? null,
    })),
  );
}

export function GlorietaSchedule({ portalId, portalName, accentColor = '#1E3A5F' }: GlorietaScheduleProps) {
  const session = getPortalSession();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingQa, setSendingQa] = useState(false);
  const [content, setContent] = useState<ScheduleContent>(DEFAULT_CONTENT);
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [milestoneChecks, setMilestoneChecks] = useState<Record<string, boolean>>({});
  const [questions, setQuestions] = useState<QuestionDef[]>(DEFAULT_QUESTIONS);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [qaMessages, setQaMessages] = useState<PortalQaMessage[]>([]);

  const loadQaMessages = useCallback(async () => {
    const { data } = await supabase
      .from('portal_qa_messages')
      .select('*')
      .eq('portal_id', portalId)
      .order('created_at', { ascending: true });

    setQaMessages(((data ?? []) as PortalQaMessage[]));
  }, [portalId]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const [
        contentResult,
        milestonesResult,
        stateResult,
        questionsResult,
        responsesResult,
        qaResult,
      ] = await Promise.all([
        supabase.from('portal_schedule_content').select('content').eq('portal_id', portalId).maybeSingle(),
        supabase.from('portal_schedule_milestones').select('*').eq('portal_id', portalId).order('area').order('sort_order'),
        supabase.from('portal_schedule_state').select('milestone_checks').eq('portal_id', portalId).maybeSingle(),
        supabase.from('portal_schedule_questions').select('*').eq('portal_id', portalId).order('sort_order'),
        session?.accessId
          ? supabase
              .from('portal_questionnaire_responses')
              .select('responses')
              .eq('portal_id', portalId)
              .eq('access_id', session.accessId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('portal_qa_messages').select('*').eq('portal_id', portalId).order('created_at', { ascending: true }),
      ]);

      if (!active) return;

      setContent((contentResult.data?.content as ScheduleContent) ?? DEFAULT_CONTENT);
      setMilestones(((milestonesResult.data ?? []) as MilestoneRecord[]));
      setMilestoneChecks((stateResult.data?.milestone_checks as Record<string, boolean>) ?? {});
      setQuestions(
        questionsResult.data && questionsResult.data.length > 0
          ? questionsResult.data.map((question) => ({
              ...question,
              options: question.options ? (question.options as string[]) : null,
            }))
          : DEFAULT_QUESTIONS,
      );
      setResponses((responsesResult as { data: { responses?: Json } | null }).data?.responses as Record<string, string> ?? {});
      setQaMessages(((qaResult.data ?? []) as PortalQaMessage[]));
      setLoading(false);
    }

    load();

    return () => {
      active = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [portalId, session?.accessId]);

  useEffect(() => {
    const channel = supabase
      .channel(`portal-qa-${portalId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portal_qa_messages', filter: `portal_id=eq.${portalId}` },
        () => {
          loadQaMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadQaMessages, portalId]);

  const saveResponses = useCallback(
    async (nextResponses: Record<string, string>) => {
      if (!session?.accessId) return;
      setSaving(true);
      await supabase.from('portal_questionnaire_responses').upsert(
        {
          portal_id: portalId,
          access_id: session.accessId,
          respondent_email: session.email,
          respondent_name: session.name,
          responses: nextResponses as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'portal_id,access_id' },
      );
      setSaving(false);
    },
    [portalId, session],
  );

  function handleResponseChange(key: string, value: string) {
    const nextResponses = { ...responses, [key]: value };
    setResponses(nextResponses);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveResponses(nextResponses), 1200);
  }

  async function handleSendQa(body: string) {
    if (!session?.accessId) return;
    setSendingQa(true);
    const { error } = await supabase.from('portal_qa_messages').insert({
      portal_id: portalId,
      access_id: session.accessId,
      sender_email: session.email,
      sender_name: session.name ?? session.email,
      sender_role: 'client',
      body,
    });
    setSendingQa(false);
    if (error) throw error;
    await loadQaMessages();
  }

  const groupedMilestones = useMemo(() => {
    const source = milestones.length > 0 ? milestones : fallbackMilestones();
    return ['A', 'B', 'C']
      .map((key) => ({
        key,
        label: AREA_LABELS[key] ?? `Area ${key}`,
        milestones: source.filter((milestone) => milestone.area === key).sort((a, b) => a.sort_order - b.sort_order),
      }))
      .filter((group) => group.milestones.length > 0);
  }, [milestones]);

  const totalMilestones = groupedMilestones.reduce((sum, group) => sum + group.milestones.length, 0);
  const completedMilestones = groupedMilestones.reduce(
    (sum, group) =>
      sum + group.milestones.filter((milestone) => milestone.is_locked || milestoneChecks[milestone.milestone_id]).length,
    0,
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {content.navPowered || 'Build Space'}
            </p>
            <h1 className="text-lg font-semibold tracking-tight">{content.navBrand || portalName}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {content.navBadge ? (
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
              >
                {content.navBadge}
              </span>
            ) : null}
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
              {completedMilestones}/{totalMilestones} milestones closed
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.15fr)_380px]">
          <div className="space-y-8">
            <section className="overflow-hidden rounded-[32px] border border-border bg-card">
              <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em]" style={{ color: accentColor }}>
                    Master Interactive Schedule
                  </p>
                  <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                    {content.heroTitle || DEFAULT_CONTENT.heroTitle}
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                    {content.heroBody || DEFAULT_CONTENT.heroBody}
                  </p>

                  {content.heroTags && content.heroTags.length > 0 ? (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {content.heroTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border px-3 py-1 text-xs font-medium"
                          style={{ borderColor: `${accentColor}35`, color: accentColor, backgroundColor: `${accentColor}10` }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-border bg-background/70 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {content.commitSub || 'Current Commitment'}
                  </p>
                  {content.commitDate ? (
                    <p className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: accentColor }}>
                      {content.commitDate}
                    </p>
                  ) : null}
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {content.commitNote || DEFAULT_CONTENT.commitNote}
                  </p>
                </div>
              </div>
            </section>

            {content.areaCards && content.areaCards.length > 0 ? (
              <section className="grid gap-4 md:grid-cols-3">
                {content.areaCards.map((card) => (
                  <article key={card.letter} className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold"
                        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                      >
                        {card.letter}
                      </span>
                      {card.stat ? (
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {card.stat}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{card.title}</h3>
                    {card.units ? <p className="mt-1 text-xs text-muted-foreground">{card.units}</p> : null}
                    {card.body ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.body}</p> : null}
                  </article>
                ))}
              </section>
            ) : null}

            {content.pullQuoteText ? (
              <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                  >
                    <Quote className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-medium leading-8 text-foreground">{content.pullQuoteText}</p>
                    {content.pullQuoteSub ? (
                      <p className="mt-3 text-sm text-muted-foreground">{content.pullQuoteSub}</p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm lg:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Area schedule</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">Interactive milestone board</h3>
                </div>
                <span
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
                >
                  {completedMilestones}/{totalMilestones} complete
                </span>
              </div>

              <div className="mt-6 space-y-6">
                {groupedMilestones.map((group) => (
                  <section key={group.key} className="overflow-hidden rounded-[24px] border border-border bg-background/70">
                    <div className="border-b border-border px-5 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-base font-semibold"
                            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                          >
                            {group.key}
                          </span>
                          <div>
                            <h4 className="text-base font-semibold text-foreground">{group.label}</h4>
                            <p className="text-xs text-muted-foreground">
                              {group.milestones.filter((milestone) => milestone.is_locked || milestoneChecks[milestone.milestone_id]).length}/{group.milestones.length} closed
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-border">
                      {group.milestones.map((milestone) => {
                        const isDone = milestone.is_locked || Boolean(milestoneChecks[milestone.milestone_id]);
                        return (
                          <div key={milestone.milestone_id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex min-w-0 gap-3">
                              <div className="mt-0.5 shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="h-5 w-5" style={{ color: accentColor }} />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border border-border" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={cn('text-sm font-medium text-foreground', isDone && 'opacity-70')}>
                                  {milestone.milestone_id} · {milestone.name}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{milestone.owner}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                              <span
                                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                                style={{ backgroundColor: `${accentColor}14`, color: accentColor }}
                              >
                                {milestone.priority_label}
                              </span>
                              {milestone.is_locked ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                                  <Lock className="h-3 w-3" /> Locked
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-border bg-card p-6 shadow-sm lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Client responses</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">Questionnaire</h3>
                </div>
                {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {questions.map((question) => (
                  <div key={question.question_key} className={cn(question.is_full_width && 'md:col-span-2')}>
                    <label className="block text-sm font-medium text-foreground">{question.label}</label>

                    {question.input_type === 'radio' && question.options ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.options.map((option) => {
                          const selected = responses[question.question_key] === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleResponseChange(question.question_key, option)}
                              className="rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                              style={{
                                borderColor: selected ? accentColor : undefined,
                                backgroundColor: selected ? `${accentColor}14` : undefined,
                                color: selected ? accentColor : undefined,
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {question.input_type === 'textarea' ? (
                      <textarea
                        value={responses[question.question_key] ?? ''}
                        onChange={(event) => handleResponseChange(question.question_key, event.target.value)}
                        placeholder={question.placeholder ?? ''}
                        rows={4}
                        className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {(content.footerTag || content.footerMeta) ? (
              <footer className="rounded-[28px] border border-border bg-card px-6 py-5 shadow-sm">
                {content.footerTag ? <p className="text-sm font-medium text-foreground">{content.footerTag}</p> : null}
                {content.footerMeta ? <p className="mt-2 whitespace-pre-line text-xs leading-6 text-muted-foreground">{content.footerMeta}</p> : null}
              </footer>
            ) : null}
          </div>

          <PortalQAPanel accentColor={accentColor} messages={qaMessages} onSend={handleSendQa} sending={sendingQa} />
        </div>
      </div>
    </div>
  );
}
