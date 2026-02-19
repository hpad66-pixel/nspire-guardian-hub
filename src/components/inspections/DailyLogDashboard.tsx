import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WeatherSelector } from '@/components/inspections/WeatherSelector';
import { WEATHER_OPTIONS } from '@/hooks/useDailyInspections';
import { ManpowerSection } from './log-sections/ManpowerSection';
import { EquipmentSection } from './log-sections/EquipmentSection';
import { IncidentSection, IncidentQuickLog } from './log-sections/IncidentSection';
import { SafetyViolationSection } from './log-sections/SafetyViolationSection';
import { VisitorSection } from './log-sections/VisitorSection';
import { PhoneCallSection } from './log-sections/PhoneCallSection';
import { DeliverySection } from './log-sections/DeliverySection';
import { QuantitiesSection } from './log-sections/QuantitiesSection';
import { DumpsterSection } from './log-sections/DumpsterSection';
import { WasteSection } from './log-sections/WasteSection';
import { NotesSection } from './log-sections/NotesSection';
import {
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Save,
  Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionStatus = 'not_started' | 'has_items' | 'done';

interface SectionState {
  status: SectionStatus;
  itemCount: number;
  isUrgent?: boolean;
}

interface DailyLogState {
  weather: string;
  sections: Record<string, SectionState>;
}

interface SectionDef {
  key: string;
  emoji: string;
  name: string;
  subtitle: string;
  urgent?: boolean;
  urgentColor?: 'amber' | 'red';
}

const SECTIONS: SectionDef[] = [
  { key: 'asset_rounds',      emoji: '🔧', name: 'Daily Asset Rounds',       subtitle: 'Inspect all property assets' },
  { key: 'manpower',          emoji: '👷', name: 'Manpower',                  subtitle: 'Staff & crew on site today' },
  { key: 'equipment_log',     emoji: '🚜', name: 'Equipment Log',             subtitle: 'Heavy equipment usage' },
  { key: 'incidents',         emoji: '⚠️',  name: 'Incidents & Accidents',    subtitle: 'Any injuries or accidents', urgent: true, urgentColor: 'amber' },
  { key: 'safety_violations', emoji: '🚫', name: 'Safety Violations',         subtitle: 'OSHA or site safety issues', urgent: true, urgentColor: 'red' },
  { key: 'phone_calls',       emoji: '📞', name: 'Phone Calls',               subtitle: 'Calls made or received' },
  { key: 'visitors',          emoji: '🧍', name: 'Visitors',                  subtitle: 'Visitors on site today' },
  { key: 'deliveries',        emoji: '📦', name: 'Deliveries',                subtitle: 'Materials or equipment received' },
  { key: 'quantities',        emoji: '📊', name: 'Quantities',                subtitle: 'Material quantities placed' },
  { key: 'dumpster_log',      emoji: '🗑️', name: 'Dumpster Log',             subtitle: 'Dumpster pulls & status' },
  { key: 'waste_disposal',    emoji: '♻️',  name: 'Waste Disposal',           subtitle: 'Disposal records & receipts' },
  { key: 'notes_photos',      emoji: '📝', name: 'Notes & Photos',            subtitle: 'General narrative & site photos' },
];

function buildInitialState(): DailyLogState {
  const sections: Record<string, SectionState> = {};
  SECTIONS.forEach(s => {
    sections[s.key] = { status: 'not_started', itemCount: 0, isUrgent: s.urgent };
  });
  return { weather: '', sections };
}

// ─── Status Chip ──────────────────────────────────────────────────────────────

function StatusChip({ section, status }: { section: SectionDef; status: SectionState }) {
  if (status.status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="h-3 w-3" />DONE
      </span>
    );
  }
  if (status.status === 'has_items') {
    const isRed = section.urgentColor === 'red';
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
        isRed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
      )}>
        {status.itemCount} {status.itemCount === 1 ? 'item' : 'items'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-slate-500 border border-slate-200">
      NOT STARTED
    </span>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ section, state, onClick }: {
  section: SectionDef; state: SectionState; onClick: () => void;
}) {
  const hasAlert = state.status === 'has_items' && section.urgent;
  const borderColor = hasAlert
    ? section.urgentColor === 'red' ? 'border-l-red-400' : 'border-l-amber-400'
    : state.status === 'done' ? 'border-l-green-400' : 'border-l-slate-200';

  return (
    <button onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-slate-100 border-l-4 shadow-sm',
        'text-left transition-all active:scale-[0.99] hover:shadow-md', borderColor,
        state.status === 'done' && 'bg-green-50/40',
        hasAlert && section.urgentColor === 'amber' && 'bg-amber-50/40',
        hasAlert && section.urgentColor === 'red' && 'bg-red-50/40',
      )}>
      <span className="text-2xl flex-shrink-0 leading-none">{section.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm leading-tight">{section.name}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{section.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusChip section={section} status={state} />
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </button>
  );
}

// ─── Weather Card ─────────────────────────────────────────────────────────────

function WeatherCard({ value, onOpen }: { value: string; onOpen: () => void }) {
  const selected = WEATHER_OPTIONS.find(w => w.value === value);
  return (
    <button onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.99] bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-sm">
      {selected ? (
        <>
          <span className="text-3xl leading-none">{selected.icon}</span>
          <div className="flex-1">
            <p className="font-semibold text-blue-800 text-sm">{selected.label}</p>
            <p className="text-xs text-blue-500">Tap to change weather</p>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1 text-2xl leading-none"><span>☀️</span><span>⛅</span><span>🌧️</span></div>
          <div className="flex-1">
            <p className="font-semibold text-blue-700 text-sm">Tap to set today's weather</p>
            <p className="text-xs text-blue-400">Required before submitting</p>
          </div>
        </>
      )}
      <ChevronRight className="h-4 w-4 text-blue-300 flex-shrink-0" />
    </button>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 20 }, (_, i) => i);
  const colors = ['#059669','#10B981','#34D399','#FBBF24','#F59E0B','#3B82F6','#6366F1'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(i => (
        <div key={i} className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`, top: '-8px',
            backgroundColor: colors[i % colors.length],
            animation: `confetti-fall ${0.8 + Math.random() * 1.2}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DailyLogDashboardProps {
  propertyId: string;
  propertyName?: string;
  onNavigateToSection: (section: string) => void;
  onStartAssetRounds: () => void;
  assetRoundsCompleted?: boolean;
}

export function DailyLogDashboard({
  propertyId,
  propertyName = 'Property',
  onNavigateToSection,
  onStartAssetRounds,
  assetRoundsCompleted = false,
}: DailyLogDashboardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const draftKey = `daily_log_draft_${propertyId}_${today}`;

  const [logState, setLogState] = useState<DailyLogState>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return buildInitialState();
  });

  const [showWeatherSheet, setShowWeatherSheet] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  // Section open states
  const [openSection, setOpenSection] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef<Date | null>(null);

  useEffect(() => {
    if (assetRoundsCompleted) {
      setLogState(prev => ({
        ...prev,
        sections: { ...prev.sections, asset_rounds: { status: 'done', itemCount: 0 } },
      }));
    }
  }, [assetRoundsCompleted]);

  const persistDraft = useCallback((state: DailyLogState) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(state));
      lastSaveRef.current = new Date();
      setLastSaved(new Date());
    } catch {}
  }, [draftKey]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistDraft(logState), 30_000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [logState, persistDraft]);

  const totalSections = SECTIONS.length;
  const completedSections = SECTIONS.filter(s => logState.sections[s.key]?.status === 'done').length;
  const progressPct = Math.round((completedSections / totalSections) * 100);
  const hasUrgentItems = SECTIONS.some(s => s.urgent && logState.sections[s.key]?.status === 'has_items');
  const assetsDone = logState.sections['asset_rounds']?.status === 'done';
  const canSubmit = assetsDone && !!logState.weather;

  const lastSavedLabel = lastSaved
    ? (() => {
        const diff = Math.floor((Date.now() - lastSaved.getTime()) / 60000);
        if (diff < 1) return 'just now';
        if (diff === 1) return '1m ago';
        return `${diff}m ago`;
      })()
    : null;

  const updateSectionCount = (key: string, count: number) => {
    setLogState(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [key]: { status: count > 0 ? 'has_items' : 'not_started', itemCount: count },
      },
    }));
  };

  const handleSectionTap = (key: string) => {
    if (key === 'asset_rounds') { onStartAssetRounds(); return; }
    setOpenSection(key);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setShowConfetti(true);
    setSubmitted(true);
    setTimeout(() => setShowConfetti(false), 2500);
    localStorage.removeItem(draftKey);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: '#0F172A' }}>
        <ConfettiBurst active />
        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Report Submitted!</h2>
        <p className="text-slate-400 mb-8">Today's daily log is complete and sent for review.</p>
        <Button variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800"
          onClick={() => setSubmitted(false)}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <>
      <ConfettiBurst active={showConfetti} />

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30" style={{ background: '#0F172A' }}>
        <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg leading-tight truncate">
                {format(new Date(), 'EEEE, MMM d')}
              </h1>
              {hasUrgentItems && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse"
                  title="Items need supervisor review" />
              )}
            </div>
            <p className="text-slate-400 text-xs truncate">{propertyName}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => persistDraft(logState)}
            className="flex-shrink-0 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white gap-1.5">
            <Save className="h-3.5 w-3.5" />Save Draft
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {completedSections} of {totalSections} sections · {progressPct}%
            </span>
            {lastSavedLabel && (
              <span className="text-xs text-slate-500">Draft saved · {lastSavedLabel}</span>
            )}
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto pb-40" style={{ background: '#F8FAFC', minHeight: 'calc(100vh - 90px)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
          <WeatherCard value={logState.weather} onOpen={() => setShowWeatherSheet(true)} />

          {SECTIONS.map((section) => (
            <SectionCard key={section.key} section={section}
              state={logState.sections[section.key] ?? { status: 'not_started', itemCount: 0 }}
              onClick={() => handleSectionTap(section.key)} />
          ))}

          {/* Submit Button */}
          <div className="pt-4 pb-6">
            {canSubmit ? (
              <button onClick={handleSubmit}
                className="w-full h-[50px] rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all shadow-lg"
                style={{ animation: 'submit-glow 2s ease-in-out infinite' }}>
                <Send className="h-4 w-4" />Submit Report →
              </button>
            ) : (
              <button disabled
                className="w-full h-[50px] rounded-xl font-semibold text-slate-400 text-sm flex items-center justify-center gap-2 bg-slate-100 border border-slate-200 cursor-not-allowed">
                {!assetsDone ? 'Complete Daily Rounds to Submit' : 'Set weather to Submit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating Incident Button ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 max-w-2xl mx-auto">
        <button onClick={() => setQuickLogOpen(true)}
          className="w-full h-[50px] rounded-xl font-bold text-white flex items-center justify-center gap-2 text-sm shadow-lg active:scale-[0.98] transition-transform"
          style={{ background: '#DC2626' }}>
          <AlertTriangle className="h-4 w-4" />
          ⚠️ Report Incident or Safety Violation
        </button>
      </div>

      {/* ── Section Sheets ── */}
      <ManpowerSection open={openSection === 'manpower'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('manpower', n)} />

      <EquipmentSection open={openSection === 'equipment_log'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('equipment_log', n)} />

      <IncidentSection open={openSection === 'incidents'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('incidents', n)} />

      <SafetyViolationSection open={openSection === 'safety_violations'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('safety_violations', n)} />

      <PhoneCallSection open={openSection === 'phone_calls'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('phone_calls', n)} />

      <VisitorSection open={openSection === 'visitors'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('visitors', n)} />

      <DeliverySection open={openSection === 'deliveries'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('deliveries', n)} />

      <QuantitiesSection open={openSection === 'quantities'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('quantities', n)} />

      <DumpsterSection open={openSection === 'dumpster_log'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('dumpster_log', n)} />

      <WasteSection open={openSection === 'waste_disposal'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} onEntriesChange={(n) => updateSectionCount('waste_disposal', n)} />

      <NotesSection open={openSection === 'notes_photos'} onOpenChange={(o) => !o && setOpenSection(null)}
        propertyId={propertyId} />

      {/* ── Quick Incident Log (FAB) ── */}
      <IncidentQuickLog open={quickLogOpen} onOpenChange={setQuickLogOpen} propertyId={propertyId}
        onIncidentLogged={() => {
          const current = logState.sections['incidents']?.itemCount ?? 0;
          updateSectionCount('incidents', current + 1);
        }} />

      {/* ── Weather Sheet ── */}
      <Sheet open={showWeatherSheet} onOpenChange={setShowWeatherSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle>Today's Weather</SheetTitle>
          </SheetHeader>
          <WeatherSelector value={logState.weather} onChange={(val) => {
            setLogState(prev => ({ ...prev, weather: val }));
            setShowWeatherSheet(false);
          }} />
        </SheetContent>
      </Sheet>

      <style>{`
        @keyframes submit-glow {
          0%, 100% { box-shadow: 0 0 8px 0px rgba(5,150,105,0.5); }
          50% { box-shadow: 0 0 20px 6px rgba(5,150,105,0.35); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </>
  );
}
