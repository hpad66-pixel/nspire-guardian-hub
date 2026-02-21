import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, AlertTriangle, Save, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCreateDailyReport, useUpdateDailyReport } from '@/hooks/useDailyReports';
import { useMyProfile } from '@/hooks/useMyProfile';
import { ProjectReportActionsPanel } from './ProjectReportActionsPanel';

// Sections
import { WeatherSection, type WeatherData } from './report-sections/WeatherSection';
import { ManpowerSection, type CrewEntry } from './report-sections/ManpowerSection';
import { EquipmentSection, type EquipmentEntry } from './report-sections/EquipmentSection';
import { WorkPerformedSection } from './report-sections/WorkPerformedSection';
import { QuantitiesSection, type QuantityEntry } from './report-sections/QuantitiesSection';
import { MaterialsSection, type MaterialDelivery } from './report-sections/MaterialsSection';
import { SubcontractorsSection, type SubEntry } from './report-sections/SubcontractorsSection';
import { IncidentSection, type IncidentEntry } from './report-sections/IncidentSection';
import { SafetySection, type SafetyData } from './report-sections/SafetySection';
import { DelaysSection, type DelayEntry } from './report-sections/DelaysSection';
import { VisitorsSection, type VisitorEntry } from './report-sections/VisitorsSection';
import { NotesSection } from './report-sections/NotesSection';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

export interface ProjectDailyReportPageProps {
  projectId: string;
  projectName: string;
  projectType?: string;
  propertyName?: string;
  propertyAddress?: string;
  propertyId?: string;
  existingReportId?: string;
  onBack: () => void;
  onSubmitComplete: (reportId: string) => void;
}

interface ReportState {
  weather: WeatherData;
  crew: CrewEntry[];
  equipment: EquipmentEntry[];
  workPerformedHtml: string;
  workPerformedText: string;
  quantities: QuantityEntry[];
  materials: MaterialDelivery[];
  subcontractors: SubEntry[];
  incidents: IncidentEntry[];
  safety: SafetyData;
  delays: DelayEntry[];
  visitors: VisitorEntry[];
  notesHtml: string;
  notesText: string;
}

const defaultSafety: SafetyData = {
  toolboxTalkTopic: '', attendees: 0, ppeCompliance: '', violationDescription: '',
  safetyObservations: '', jsaCompleted: false, emergencyEquipmentVerified: false,
  fireExtinguisherCommunicated: false, photoUrls: [],
};

const defaultWeather: WeatherData = { condition: '', temperature: 72, windSpeed: 0, siteConditions: '' };

const defaultState: ReportState = {
  weather: defaultWeather, crew: [], equipment: [], workPerformedHtml: '', workPerformedText: '',
  quantities: [], materials: [], subcontractors: [], incidents: [], safety: defaultSafety,
  delays: [], visitors: [], notesHtml: '', notesText: '',
};

type SectionKey = 'weather' | 'crew' | 'equipment' | 'workPerformed' | 'quantities' | 'materials' | 'subcontractors' | 'incidents' | 'safety' | 'delays' | 'visitors' | 'notes' | 'safetyFAB';

interface SectionConfig {
  key: SectionKey;
  emoji: string;
  name: string;
  subtitle: string;
  isComplete: (s: ReportState) => boolean;
  hasItems: (s: ReportState) => boolean;
}

const SECTIONS: SectionConfig[] = [
  { key: 'weather', emoji: '🌤️', name: 'Weather & Site Conditions', subtitle: 'Conditions, temperature, visibility', isComplete: s => !!s.weather.condition, hasItems: s => !!s.weather.condition },
  { key: 'crew', emoji: '👷', name: 'Manpower & Crew', subtitle: 'Headcount, companies, hours', isComplete: s => s.crew.length > 0, hasItems: s => s.crew.length > 0 },
  { key: 'equipment', emoji: '🔧', name: 'Equipment on Site', subtitle: 'Active equipment, hours, idle time', isComplete: s => s.equipment.length > 0, hasItems: s => s.equipment.length > 0 },
  { key: 'workPerformed', emoji: '📋', name: 'Work Performed Today', subtitle: 'Scope of work completed — primary section', isComplete: s => s.workPerformedText.trim().length > 10, hasItems: s => s.workPerformedText.trim().length > 0 },
  { key: 'quantities', emoji: '📐', name: 'Quantities Installed', subtitle: 'Units of work put in place', isComplete: s => s.quantities.length > 0, hasItems: s => s.quantities.length > 0 },
  { key: 'materials', emoji: '🚚', name: 'Materials & Deliveries', subtitle: 'Received materials, tracking numbers', isComplete: s => s.materials.length > 0, hasItems: s => s.materials.length > 0 },
  { key: 'subcontractors', emoji: '🏗️', name: 'Subcontractors on Site', subtitle: 'Sub companies, crew counts, scope', isComplete: s => s.subcontractors.length > 0, hasItems: s => s.subcontractors.length > 0 },
  { key: 'incidents', emoji: '⚠️', name: 'Incidents & Near Misses', subtitle: 'Safety events — always visible, urgent', isComplete: s => s.incidents.length > 0, hasItems: s => s.incidents.length > 0 },
  { key: 'safety', emoji: '🦺', name: 'Safety Observations', subtitle: 'Toolbox talks, PPE compliance, violations', isComplete: s => !!s.safety.toolboxTalkTopic || !!s.safety.ppeCompliance, hasItems: s => !!s.safety.toolboxTalkTopic || !!s.safety.ppeCompliance },
  { key: 'delays', emoji: '⏱️', name: 'Delays & Impacts', subtitle: 'Weather, material, RFI, design delays', isComplete: s => s.delays.length > 0, hasItems: s => s.delays.length > 0 },
  { key: 'visitors', emoji: '👤', name: 'Visitors & Inspections', subtitle: 'Owner reps, inspectors, officials on site', isComplete: s => s.visitors.length > 0, hasItems: s => s.visitors.length > 0 },
  { key: 'notes', emoji: '📝', name: 'Notes & Open Items', subtitle: 'General notes, action items, follow-ups', isComplete: s => s.notesText.trim().length > 0, hasItems: s => s.notesText.trim().length > 0 },
];

function getStatusChip(section: SectionConfig, state: ReportState) {
  if (section.isComplete(state)) return { label: '✓ Done', cls: 'bg-green-100 text-green-700 border-green-200' };
  const countMap: Record<string, number> = {
    crew: state.crew.length, equipment: state.equipment.length, quantities: state.quantities.length,
    materials: state.materials.length, subcontractors: state.subcontractors.length, incidents: state.incidents.length,
    delays: state.delays.length, visitors: state.visitors.length,
  };
  const count = countMap[section.key];
  if (count && count > 0) return { label: `${count} Item${count > 1 ? 's' : ''}`, cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Not Started', cls: 'bg-muted text-muted-foreground border-border' };
}

function cardBg(section: SectionConfig, state: ReportState) {
  if (section.isComplete(state)) return 'bg-green-50 border-green-200';
  if (section.hasItems(state)) return 'bg-amber-50 border-amber-200';
  return 'bg-card border-border';
}

export function ProjectDailyReportPage({
  projectId, projectName, projectType, propertyName, propertyAddress, propertyId,
  existingReportId, onBack, onSubmitComplete,
}: ProjectDailyReportPageProps) {
  const reportDate = format(new Date(), 'yyyy-MM-dd');
  const draftKey = `project_daily_report_draft_${projectId}_${reportDate}`;

  const [state, setState] = useState<ReportState>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      return saved ? JSON.parse(saved) : defaultState;
    } catch { return defaultState; }
  });

  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<DailyReportRow | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: profile } = useMyProfile();
  const createReport = useCreateDailyReport();
  const updateReport = useUpdateDailyReport();

  const inspectorName = profile?.full_name || undefined;

  // Auto-save to localStorage
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(state));
      setLastSaved(new Date());
    }, 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [state, draftKey]);

  const completedCount = SECTIONS.filter(s => s.isComplete(state)).length;
  const canSubmit = state.workPerformedText.trim().length > 0;

  const handleSaveDraft = useCallback(() => {
    localStorage.setItem(draftKey, JSON.stringify(state));
    setLastSaved(new Date());
    toast.success('Draft saved');
  }, [state, draftKey]);

  const buildPayload = useCallback(() => {
    const totalWorkers = state.crew.reduce((s, c) => s + c.workers, 0) || state.subcontractors.reduce((s, c) => s + c.workers, 0);
    const weatherStr = state.weather.condition ? `${state.weather.condition}, ${state.weather.temperature}°F, Wind ${state.weather.windSpeed}mph` : '';
    const equipmentUsed = state.equipment.map(e => e.name);
    const safetyNotes = [
      state.safety.toolboxTalkTopic && `Toolbox Talk: ${state.safety.toolboxTalkTopic}`,
      state.safety.ppeCompliance && `PPE: ${state.safety.ppeCompliance}`,
      state.safety.safetyObservations,
    ].filter(Boolean).join('\n');
    const delaysStr = state.delays.map(d => `${d.type}: ${d.description}`).join('\n');
    const issuesStr = state.incidents.map(i => `${i.type} at ${i.time}: ${i.description}`).join('\n');
    const materialsStr = state.materials.map(m => `${m.description} (${m.quantity} ${m.unit}) from ${m.vendor}`).join('\n');
    const allPhotos = [
      ...state.materials.flatMap(m => m.photoUrls),
      ...state.incidents.flatMap(i => i.photoUrls),
      ...state.safety.photoUrls,
    ];

    return {
      project_id: projectId,
      report_date: reportDate,
      weather: weatherStr || null,
      workers_count: totalWorkers,
      work_performed: state.workPerformedText || '',
      work_performed_html: state.workPerformedHtml || null,
      safety_notes: safetyNotes || null,
      equipment_used: equipmentUsed.length > 0 ? equipmentUsed : null,
      materials_received: materialsStr || null,
      delays: delaysStr || null,
      issues_encountered: issuesStr || null,
      photos: allPhotos.length > 0 ? allPhotos : null,
      subcontractors: state.subcontractors.length > 0 ? (state.subcontractors as any) : null,
      visitor_log: state.visitors.length > 0 ? (state.visitors as any) : null,
    } as any;
  }, [state, projectId, reportDate]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      let report: DailyReportRow;
      if (existingReportId) {
        report = await updateReport.mutateAsync({ id: existingReportId, ...payload });
      } else {
        report = await createReport.mutateAsync(payload);
      }
      localStorage.removeItem(draftKey);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setSubmittedReport(report);
      onSubmitComplete(report.id);
    } catch (err: any) {
      toast.error(`Failed to submit: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, buildPayload, existingReportId, createReport, updateReport, draftKey, onSubmitComplete]);

  const upd = useCallback(<K extends keyof ReportState>(key: K, val: ReportState[K]) => {
    setState(prev => ({ ...prev, [key]: val }));
  }, []);

  const lastSavedLabel = lastSaved
    ? (() => {
        const mins = Math.floor((Date.now() - lastSaved.getTime()) / 60000);
        return mins < 1 ? 'just now' : `${mins}m ago`;
      })()
    : null;

  // If submitted, show actions panel
  if (submittedReport) {
    return (
      <div className="flex flex-col h-full bg-background">
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="text-8xl animate-bounce">🎉</div>
          </div>
        )}
        <ProjectReportActionsPanel
          report={submittedReport}
          projectName={projectName}
          propertyName={propertyName}
          propertyAddress={propertyAddress}
          projectType={projectType}
          inspectorName={inspectorName}
          onBack={onBack}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b bg-card px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-bold text-base leading-tight">Daily Field Report</h1>
              <p className="text-xs text-muted-foreground">{projectName} · {format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={(completedCount / SECTIONS.length) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground font-mono">
            {completedCount} of {SECTIONS.length} sections
            {lastSavedLabel && ` · Auto-saved ${lastSavedLabel}`}
          </p>
        </div>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40">
        {SECTIONS.map(section => {
          const { label, cls } = getStatusChip(section, state);
          const bg = cardBg(section, state);
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={cn('w-full p-4 rounded-2xl border-2 flex items-center gap-4 text-left transition-all hover:shadow-md active:scale-[0.99]', bg)}
            >
              <div className="text-3xl">{section.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{section.name}</p>
                <p className="text-xs text-muted-foreground">{section.subtitle}</p>
              </div>
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0', cls)}>{label}</span>
            </button>
          );
        })}

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              'w-full py-4 rounded-2xl font-bold text-base transition-all',
              canSubmit && !isSubmitting
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg animate-pulse'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</span>
            ) : canSubmit ? (
              <span className="flex items-center justify-center gap-2"><Check className="h-5 w-5" /> Submit Field Report →</span>
            ) : (
              'Complete Work Performed section to submit'
            )}
          </button>
        </div>
      </div>

      {/* Floating Safety FAB */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 pointer-events-none">
        <button
          type="button"
          onClick={() => setActiveSection('safetyFAB')}
          className="pointer-events-auto w-full h-14 rounded-2xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-red-700 active:scale-[0.98] transition-all"
          style={{ maxWidth: 600, margin: '0 auto', display: 'flex' }}
        >
          <AlertTriangle className="h-5 w-5" />
          ⚠️ Log Safety Incident or Near Miss
        </button>
      </div>

      {/* Section Sheets */}
      <WeatherSection open={activeSection === 'weather'} onClose={() => setActiveSection(null)} data={state.weather} onChange={v => upd('weather', v)} />
      <ManpowerSection open={activeSection === 'crew'} onClose={() => setActiveSection(null)} data={state.crew} onChange={v => upd('crew', v)} />
      <EquipmentSection open={activeSection === 'equipment'} onClose={() => setActiveSection(null)} data={state.equipment} onChange={v => upd('equipment', v)} />
      <WorkPerformedSection
        open={activeSection === 'workPerformed'}
        onClose={() => setActiveSection(null)}
        html={state.workPerformedHtml}
        plainText={state.workPerformedText}
        projectType={projectType}
        onChange={(html, plain) => setState(prev => ({ ...prev, workPerformedHtml: html, workPerformedText: plain }))}
      />
      <QuantitiesSection open={activeSection === 'quantities'} onClose={() => setActiveSection(null)} data={state.quantities} onChange={v => upd('quantities', v)} />
      <MaterialsSection open={activeSection === 'materials'} onClose={() => setActiveSection(null)} data={state.materials} onChange={v => upd('materials', v)} projectId={projectId} />
      <SubcontractorsSection open={activeSection === 'subcontractors'} onClose={() => setActiveSection(null)} data={state.subcontractors} onChange={v => upd('subcontractors', v)} />
      <IncidentSection
        open={activeSection === 'incidents' || activeSection === 'safetyFAB'}
        onClose={() => setActiveSection(null)}
        data={state.incidents}
        onChange={v => upd('incidents', v)}
        projectId={projectId}
        propertyId={propertyId}
        isQuickSheet={activeSection === 'safetyFAB'}
      />
      <SafetySection open={activeSection === 'safety'} onClose={() => setActiveSection(null)} data={state.safety} onChange={v => upd('safety', v)} projectId={projectId} />
      <DelaysSection open={activeSection === 'delays'} onClose={() => setActiveSection(null)} data={state.delays} onChange={v => upd('delays', v)} />
      <VisitorsSection open={activeSection === 'visitors'} onClose={() => setActiveSection(null)} data={state.visitors} onChange={v => upd('visitors', v)} />
      <NotesSection
        open={activeSection === 'notes'}
        onClose={() => setActiveSection(null)}
        notesHtml={state.notesHtml}
        notesPlain={state.notesText}
        allPhotos={[...state.materials.flatMap(m => m.photoUrls), ...state.incidents.flatMap(i => i.photoUrls)]}
        onChange={(html, plain) => setState(prev => ({ ...prev, notesHtml: html, notesText: plain }))}
        projectId={projectId}
      />
    </div>
  );
}
