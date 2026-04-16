import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sun, Moon, ChevronDown, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPortalSession } from '@/hooks/usePortal';
import { DEFAULT_AREAS, type Area } from './milestoneData';
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

const DEFAULT_QUESTIONS: QuestionDef[] = [
  { question_key: 'timeline', label: 'Are you comfortable with the current timeline?', input_type: 'radio', options: ['Yes', 'No', 'Need Discussion'], placeholder: null, is_full_width: false, sort_order: 1 },
  { question_key: 'budget', label: 'Any budget concerns?', input_type: 'radio', options: ['On Track', 'Needs Review', 'Over Budget'], placeholder: null, is_full_width: false, sort_order: 2 },
  { question_key: 'quality', label: 'Quality satisfaction so far?', input_type: 'radio', options: ['Excellent', 'Good', 'Needs Improvement'], placeholder: null, is_full_width: false, sort_order: 3 },
  { question_key: 'communication', label: 'How is communication?', input_type: 'radio', options: ['Great', 'Adequate', 'Needs Improvement'], placeholder: null, is_full_width: false, sort_order: 4 },
  { question_key: 'concerns', label: 'Any specific concerns or change requests?', input_type: 'textarea', options: null, placeholder: 'Type your concerns here...', is_full_width: true, sort_order: 5 },
  { question_key: 'comments', label: 'Additional comments for the team', input_type: 'textarea', options: null, placeholder: 'Any other feedback...', is_full_width: true, sort_order: 6 },
];

export function GlorietaSchedule({ portalId, portalName, accentColor = '#D4A017' }: GlorietaScheduleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [milestoneChecks, setMilestoneChecks] = useState<Record<string, boolean>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [areas] = useState<Area[]>(DEFAULT_AREAS);
  const [questions, setQuestions] = useState<QuestionDef[]>(DEFAULT_QUESTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedArea, setExpandedArea] = useState<string | null>('A');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const session = getPortalSession();

  // Load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      // Load milestone state
      const { data: state } = await supabase
        .from('portal_schedule_state')
        .select('milestone_checks')
        .eq('portal_id', portalId)
        .maybeSingle();
      if (state?.milestone_checks) {
        setMilestoneChecks(state.milestone_checks as Record<string, boolean>);
      }

      // Load questions
      const { data: qs } = await supabase
        .from('portal_schedule_questions')
        .select('*')
        .eq('portal_id', portalId)
        .order('sort_order');
      if (qs && qs.length > 0) {
        setQuestions(qs.map(q => ({
          ...q,
          options: q.options ? (q.options as string[]) : null,
        })));
      }

      // Load existing responses
      const { data: resp } = await supabase
        .from('portal_questionnaire_responses')
        .select('responses')
        .eq('portal_id', portalId)
        .eq('access_id', session?.accessId ?? '')
        .maybeSingle();
      if (resp?.responses) {
        setResponses(resp.responses as Record<string, string>);
      }

      setLoading(false);
    }
    load();
  }, [portalId, session?.accessId]);

  // Auto-save responses with debounce
  const saveResponses = useCallback(async (newResponses: Record<string, string>) => {
    if (!session?.accessId) return;
    setSaving(true);
    await supabase
      .from('portal_questionnaire_responses')
      .upsert({
        portal_id: portalId,
        access_id: session.accessId,
        respondent_email: session.email,
        respondent_name: session.name,
        responses: newResponses as unknown as Json,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'portal_id,access_id' });
    setSaving(false);
  }, [portalId, session]);

  function handleResponseChange(key: string, value: string) {
    const updated = { ...responses, [key]: value };
    setResponses(updated);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveResponses(updated), 1500);
  }

  // Calculate progress
  const totalMilestones = areas.reduce((sum, a) => sum + a.milestones.length, 0);
  const completedMilestones = Object.values(milestoneChecks).filter(Boolean).length;
  const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const isDark = theme === 'dark';

  const priorityColors: Record<string, string> = {
    critical: '#FF5252',
    high: '#FFAB40',
    medium: '#448AFF',
    low: '#69F0AE',
    milestone: accentColor,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? '#030303' : '#FFFFFF' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: isDark ? '#030303' : '#FFFFFF',
      color: isDark ? '#FFFFFF' : '#050505',
      fontFamily: "'Inter', 'Barlow', sans-serif",
    }}>
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-6 md:px-12 backdrop-blur-xl border-b"
        style={{
          background: isDark ? 'rgba(3,3,3,0.96)' : 'rgba(255,255,255,0.96)',
          borderColor: isDark ? `${accentColor}45` : `${accentColor}35`,
        }}>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold" style={{ color: accentColor, fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic' }}>
            {portalName}
          </span>
          <span className="hidden md:inline text-xs tracking-[2px] uppercase opacity-50" style={{ fontFamily: "'Space Mono', monospace" }}>
            Interactive Schedule
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold tracking-[1.5px] uppercase px-3 py-1.5" style={{
            background: accentColor,
            color: isDark ? '#030303' : '#FFFFFF',
            fontFamily: "'Space Mono', monospace",
          }}>
            {progressPercent}% Complete
          </span>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-[2px] uppercase cursor-pointer transition-all"
            style={{
              background: isDark ? accentColor : '#030303',
              color: isDark ? '#030303' : accentColor,
              fontFamily: "'Space Mono', monospace",
              boxShadow: `3px 3px 0 ${accentColor}45`,
            }}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-[60px] min-h-[60vh] flex items-center" style={{
        background: isDark
          ? `linear-gradient(160deg, #030303 0%, ${accentColor}08 50%, #030303 100%)`
          : `linear-gradient(160deg, #FFFFFF 0%, ${accentColor}08 50%, #FFFFFF 100%)`,
      }}>
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold tracking-[3px] uppercase mb-6"
            style={{ color: accentColor, fontFamily: "'Space Mono', monospace" }}
          >
            Master Interactive Schedule
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold leading-tight mb-6"
            style={{ fontFamily: "'Libre Baskerville', serif" }}
          >
            Project Milestones
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg max-w-xl opacity-60"
          >
            Track every phase of construction — from pre-design to handover. Your milestones are updated in real-time by the project team.
          </motion.p>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-10 max-w-md"
          >
            <div className="flex items-center justify-between text-xs mb-2 opacity-60">
              <span>{completedMilestones} of {totalMilestones} milestones</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#1C1C1C' : '#E0E0E0' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}CC)` }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MILESTONES ── */}
      <section className="py-20" style={{ background: isDark ? '#0A0A0A' : '#F7F4EC' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <h2 className="text-2xl font-bold mb-12" style={{ fontFamily: "'Libre Baskerville', serif" }}>
            Milestone Tracker
          </h2>

          <div className="space-y-4">
            {areas.map((area, areaIdx) => {
              const areaCompleted = area.milestones.filter(m => milestoneChecks[m.id]).length;
              const areaTotal = area.milestones.length;
              const isExpanded = expandedArea === area.key;

              return (
                <motion.div
                  key={area.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: areaIdx * 0.1 }}
                  className="rounded-lg overflow-hidden border"
                  style={{
                    background: isDark ? '#111111' : '#FFFFFF',
                    borderColor: isDark ? '#2A2A2A' : '#E0DCCC',
                  }}
                >
                  {/* Area header */}
                  <button
                    onClick={() => setExpandedArea(isExpanded ? null : area.key)}
                    className="w-full flex items-center justify-between p-5 text-left transition-colors"
                    style={{ background: isExpanded ? (isDark ? '#1C1C1C' : '#FAF5E5') : 'transparent' }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold" style={{ color: accentColor, fontFamily: "'Space Mono', monospace" }}>
                        {area.key}
                      </span>
                      <div>
                        <p className="font-semibold text-sm">{area.label}</p>
                        <p className="text-xs opacity-50 mt-0.5">{areaCompleted}/{areaTotal} completed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#2A2A2A' : '#E0E0E0' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${areaTotal > 0 ? (areaCompleted / areaTotal) * 100 : 0}%`,
                          background: accentColor,
                        }} />
                      </div>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} style={{ color: accentColor }} />
                    </div>
                  </button>

                  {/* Milestones */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-1">
                          {area.milestones.map((ms) => {
                            const isChecked = milestoneChecks[ms.id] ?? false;
                            return (
                              <div
                                key={ms.id}
                                className={cn(
                                  'flex items-center gap-4 px-4 py-3 rounded-lg transition-all',
                                  isChecked ? 'opacity-60' : '',
                                )}
                                style={{ background: isDark ? '#0A0A0A' : '#F7F4EC' }}
                              >
                                {/* Check indicator (read-only) */}
                                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all" style={{
                                  borderColor: isChecked ? '#00E676' : (isDark ? '#2A2A2A' : '#CCC'),
                                  background: isChecked ? '#00E67618' : 'transparent',
                                }}>
                                  {isChecked && <Check className="h-3.5 w-3.5" style={{ color: '#00E676' }} />}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-sm font-medium', isChecked && 'line-through')}>{ms.id} — {ms.name}</p>
                                  <p className="text-xs opacity-40 mt-0.5">{ms.owner}</p>
                                </div>

                                {/* Priority */}
                                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded shrink-0" style={{
                                  color: priorityColors[ms.priorityClass] ?? accentColor,
                                  background: `${priorityColors[ms.priorityClass] ?? accentColor}15`,
                                }}>
                                  {ms.priorityLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── QUESTIONNAIRE ── */}
      <section className="py-20" style={{ background: isDark ? '#030303' : '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "'Libre Baskerville', serif" }}>
                Owner Questionnaire
              </h2>
              <p className="text-sm opacity-50 mt-1">Your responses auto-save and are visible to the project team.</p>
            </div>
            {saving && (
              <span className="flex items-center gap-2 text-xs" style={{ color: accentColor }}>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {questions.map((q) => (
              <div key={q.question_key} className={cn(q.is_full_width && 'md:col-span-2')}>
                <label className="block text-sm font-medium mb-3">{q.label}</label>

                {q.input_type === 'radio' && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const selected = responses[q.question_key] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => handleResponseChange(q.question_key, opt)}
                          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                          style={{
                            borderColor: selected ? accentColor : (isDark ? '#2A2A2A' : '#DDD'),
                            background: selected ? `${accentColor}20` : 'transparent',
                            color: selected ? accentColor : (isDark ? '#BBB' : '#555'),
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.input_type === 'textarea' && (
                  <textarea
                    value={responses[q.question_key] ?? ''}
                    onChange={(e) => handleResponseChange(q.question_key, e.target.value)}
                    placeholder={q.placeholder ?? ''}
                    rows={4}
                    className="w-full rounded-lg border px-4 py-3 text-sm resize-none outline-none transition-colors"
                    style={{
                      background: isDark ? '#0A0A0A' : '#F7F4EC',
                      borderColor: isDark ? '#2A2A2A' : '#E0DCCC',
                      color: isDark ? '#E8E8E8' : '#1A1A1A',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 border-t text-center" style={{
        borderColor: isDark ? '#1C1C1C' : '#E0DCCC',
        background: isDark ? '#030303' : '#FFFFFF',
      }}>
        <p className="text-xs opacity-30" style={{ fontFamily: "'Space Mono', monospace" }}>
          Powered by APAS · Construction Intelligence Platform
        </p>
      </footer>
    </div>
  );
}
