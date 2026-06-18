/**
 * Daily Field Inspection Report — redesigned two-panel layout.
 * Left: report history list. Right: editable form (draft) or read-only view (submitted).
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toDateOnly } from "@/lib/date";
import { useDailyReportList, useDailyManpower } from "@/hooks/useDailyLog";
import { generateInspectionReportPdf } from "@/lib/pdf/inspectionReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Plus, FileText, CloudSun, Sun, Cloud, CloudRain, Send, Download,
  Pencil, Loader2, Trash2, Upload, X, Users, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubcontractorEntry { company: string; trade: string; workers: number }
interface VisitorEntry { name: string; company: string; purpose: string }

interface ReportDetail {
  id: string;
  project_id: string;
  report_date: string;
  weather: string | null;
  workers_count: number | null;
  work_performed: string | null;
  materials_received: string | null;
  equipment_used: string[] | null;
  subcontractors: SubcontractorEntry[] | null;
  safety_notes: string | null;
  delays: string | null;
  visitor_log: VisitorEntry[] | null;
  photos: string[] | null;
  submitted_at: string | null;
  submitted_by: string | null;
  superintendent_id: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weatherIcon(weather: string | null) {
  const w = (weather ?? "").toLowerCase();
  if (w.includes("rain") || w.includes("storm")) return <CloudRain className="h-4 w-4 text-blue-400" />;
  if (w.includes("cloud") || w.includes("overcast")) return <CloudSun className="h-4 w-4 text-gray-400" />;
  if (w.includes("clear") || w.includes("sunny")) return <Sun className="h-4 w-4 text-amber-400" />;
  return <Cloud className="h-4 w-4 text-gray-300" />;
}

function formatDate(d: string) {
  const dt = new Date(d + "T12:00:00");
  return {
    short: dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    dow: dt.toLocaleDateString("en-US", { weekday: "long" }),
    iso: d,
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ─── Autosave hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Manpower Table ───────────────────────────────────────────────────────────

function ManpowerTable({ reportId }: { reportId: string }) {
  const { data: rows = [], create, update, remove } = useDailyManpower(reportId);
  const [draft, setDraft] = useState({ trade: "", workers: "", hours: "", notes: "" });

  async function handleAdd() {
    if (!draft.trade) return;
    try {
      await create.mutateAsync({
        trade: draft.trade,
        workers: Number(draft.workers) || 0,
        hours: Number(draft.hours) || 0,
        notes: draft.notes,
      });
      setDraft({ trade: "", workers: "", hours: "", notes: "" });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Trade</th>
              <th className="text-center px-3 py-2 font-medium w-20">Workers</th>
              <th className="text-center px-3 py-2 font-medium w-20">Hours</th>
              <th className="text-left px-3 py-2 font-medium">Notes</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{r.trade}</td>
                <td className="px-3 py-2 text-center font-mono text-xs">{r.workers}</td>
                <td className="px-3 py-2 text-center font-mono text-xs">{r.hours}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.notes}</td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => remove.mutate(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground text-xs">No manpower entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Input placeholder="Trade / crew" value={draft.trade} onChange={(e) => setDraft(p => ({ ...p, trade: e.target.value }))} className="min-h-[44px]" />
        <Input placeholder="Workers" type="number" min={0} value={draft.workers} onChange={(e) => setDraft(p => ({ ...p, workers: e.target.value }))} className="min-h-[44px]" />
        <Input placeholder="Hours" type="number" min={0} step={0.5} value={draft.hours} onChange={(e) => setDraft(p => ({ ...p, hours: e.target.value }))} className="min-h-[44px]" />
        <div className="flex gap-2">
          <Input placeholder="Notes" value={draft.notes} onChange={(e) => setDraft(p => ({ ...p, notes: e.target.value }))} className="min-h-[44px]" />
          <Button size="icon" onClick={handleAdd} disabled={create.isPending} className="min-h-[44px] min-w-[44px] shrink-0">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline JSONB Table ───────────────────────────────────────────────────────

type JsonbTableProps<T> = {
  rows: T[];
  onChange: (rows: T[]) => void;
  columns: { key: keyof T; label: string; placeholder: string; type?: string }[];
  emptyLabel: string;
};

function JsonbTable<T extends Record<string, any>>({ rows, onChange, columns, emptyLabel }: JsonbTableProps<T>) {
  const empty = Object.fromEntries(columns.map(c => [c.key, ""])) as T;
  const [draft, setDraft] = useState<T>({ ...empty });

  function addRow() {
    const hasValue = columns.some(c => String(draft[c.key] ?? "").trim());
    if (!hasValue) return;
    onChange([...rows, { ...draft }]);
    setDraft({ ...empty });
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map(c => (
                <th key={String(c.key)} className="text-left px-3 py-2 font-medium">{c.label}</th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map(c => (
                  <td key={String(c.key)} className="px-3 py-2 text-xs">{String(r[c.key] ?? "")}</td>
                ))}
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-4 text-center text-muted-foreground text-xs">{emptyLabel}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 flex-wrap">
        {columns.map(c => (
          <Input
            key={String(c.key)}
            placeholder={c.placeholder}
            type={c.type ?? "text"}
            value={String(draft[c.key] ?? "")}
            onChange={(e) => setDraft(p => ({ ...p, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value }))}
            className="min-h-[44px] flex-1 min-w-[100px]"
          />
        ))}
        <Button size="icon" onClick={addRow} className="min-h-[44px] min-w-[44px] shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Photo Upload ─────────────────────────────────────────────────────────────

function PhotoUpload({
  projectId, reportDate, photos, onPhotosChange,
}: {
  projectId: string; reportDate: string;
  photos: string[]; onPhotosChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `daily-reports/${projectId}/${reportDate}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("project-photos").upload(path, file, { upsert: true });
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data: { publicUrl } } = supabase.storage.from("project-photos").getPublicUrl(path);
      newUrls.push(publicUrl);
    }
    onPhotosChange([...photos, ...newUrls]);
    setUploading(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drag & drop photos here, or</p>
        <Button variant="outline" size="sm" className="mt-2" disabled={uploading} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : "Browse Files"}
        </Button>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden aspect-square bg-muted">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onPhotosChange(photos.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity min-w-[24px] min-h-[24px] flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Editable Form ────────────────────────────────────────────────────────────

function EditableForm({
  report, projectId, onSubmitted,
}: {
  report: ReportDetail; projectId: string; onSubmitted: () => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [weather, setWeather] = useState(report.weather ?? "");
  const [workersCount, setWorkersCount] = useState(String(report.workers_count ?? ""));
  const [workPerformed, setWorkPerformed] = useState(report.work_performed ?? "");
  const [materialsReceived, setMaterialsReceived] = useState(report.materials_received ?? "");
  const [equipmentUsed, setEquipmentUsed] = useState((report.equipment_used ?? []).join(", "));
  const [subcontractors, setSubcontractors] = useState<SubcontractorEntry[]>(report.subcontractors ?? []);
  const [safetyNotes, setSafetyNotes] = useState(report.safety_notes ?? "");
  const [delays, setDelays] = useState(report.delays ?? "");
  const [visitorLog, setVisitorLog] = useState<VisitorEntry[]>(report.visitor_log ?? []);
  const [photos, setPhotos] = useState<string[]>(report.photos ?? []);

  const debouncedWeather = useDebounce(weather, 1500);
  const debouncedWork = useDebounce(workPerformed, 1500);
  const debouncedMaterials = useDebounce(materialsReceived, 1500);
  const debouncedEquipment = useDebounce(equipmentUsed, 1500);
  const debouncedSafety = useDebounce(safetyNotes, 1500);
  const debouncedDelays = useDebounce(delays, 1500);
  const debouncedWorkers = useDebounce(workersCount, 1500);
  const debouncedSubs = useDebounce(subcontractors, 1500);
  const debouncedVisitors = useDebounce(visitorLog, 1500);
  const debouncedPhotos = useDebounce(photos, 1500);

  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const saveRef = useRef<() => Promise<void>>();

  const save = useCallback(async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("daily_reports" as any)
        .update(patch as any)
        .eq("id", report.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["daily-report-list", projectId] });
    } catch (e: any) {
      toast.error(`Auto-save failed: ${e.message}`);
    } finally {
      if (isMounted.current) setSaving(false);
    }
  }, [report.id, projectId, qc]);

  saveRef.current = async () => {
    await save({
      weather: weather || null,
      workers_count: workersCount ? Number(workersCount) : null,
      work_performed: workPerformed || null,
      materials_received: materialsReceived || null,
      equipment_used: equipmentUsed ? equipmentUsed.split(",").map(s => s.trim()).filter(Boolean) : [],
      subcontractors,
      safety_notes: safetyNotes || null,
      delays: delays || null,
      visitor_log: visitorLog,
      photos,
    });
  };

  // Auto-save triggers
  useEffect(() => { save({ weather: debouncedWeather || null }); }, [debouncedWeather]);
  useEffect(() => { save({ workers_count: debouncedWorkers ? Number(debouncedWorkers) : null }); }, [debouncedWorkers]);
  useEffect(() => { save({ work_performed: debouncedWork || null }); }, [debouncedWork]);
  useEffect(() => { save({ materials_received: debouncedMaterials || null }); }, [debouncedMaterials]);
  useEffect(() => { save({ equipment_used: debouncedEquipment ? debouncedEquipment.split(",").map(s => s.trim()).filter(Boolean) : [] }); }, [debouncedEquipment]);
  useEffect(() => { save({ subcontractors: debouncedSubs }); }, [JSON.stringify(debouncedSubs)]);
  useEffect(() => { save({ safety_notes: debouncedSafety || null }); }, [debouncedSafety]);
  useEffect(() => { save({ delays: debouncedDelays || null }); }, [debouncedDelays]);
  useEffect(() => { save({ visitor_log: debouncedVisitors }); }, [JSON.stringify(debouncedVisitors)]);
  useEffect(() => { save({ photos: debouncedPhotos }); }, [JSON.stringify(debouncedPhotos)]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Final save then submit
      await saveRef.current?.();
      const { error } = await supabase
        .from("daily_reports" as any)
        .update({ submitted_at: new Date().toISOString() } as any)
        .eq("id", report.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["daily-report-list", projectId] });
      toast.success("Report submitted successfully");
      onSubmitted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const { data: manpowerRows = [] } = useDailyManpower(report.id);

  async function handleExportPdf() {
    generateInspectionReportPdf(
      {
        ...report,
        weather,
        workers_count: workersCount ? Number(workersCount) : null,
        work_performed: workPerformed,
        materials_received: materialsReceived,
        equipment_used: equipmentUsed ? equipmentUsed.split(",").map(s => s.trim()) : [],
        subcontractors,
        safety_notes: safetyNotes,
        delays,
        visitor_log: visitorLog,
        photos,
      },
      manpowerRows,
      "Project Report",
    );
  }

  const dateInfo = formatDate(report.report_date);

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{dateInfo.short}</h2>
          <p className="text-sm text-muted-foreground">{dateInfo.dow}</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </span>
          )}
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">Draft</Badge>
        </div>
      </div>

      {/* Section 1: Report Header */}
      <div className="space-y-4">
        <SectionLabel>Report Header</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="weather">Weather Conditions</Label>
            <Input
              id="weather"
              placeholder="e.g. Clear, 72°F"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workers">Total Workers on Site</Label>
            <Input
              id="workers"
              type="number"
              min={0}
              placeholder="0"
              value={workersCount}
              onChange={(e) => setWorkersCount(e.target.value)}
              className="min-h-[44px] font-mono"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section 2: Work Performed */}
      <div className="space-y-4">
        <SectionLabel>Work Performed Today</SectionLabel>
        <Textarea
          placeholder="Describe all work activities completed today by location and trade..."
          value={workPerformed}
          onChange={(e) => setWorkPerformed(e.target.value)}
          rows={5}
          className="min-h-[120px] resize-y"
        />
      </div>

      <Separator />

      {/* Section 3: Manpower */}
      <div className="space-y-4">
        <SectionLabel>Manpower on Site</SectionLabel>
        <ManpowerTable reportId={report.id} />
      </div>

      <Separator />

      {/* Section 4: Materials */}
      <div className="space-y-4">
        <SectionLabel>Materials Received</SectionLabel>
        <Textarea
          placeholder="List any materials delivered to site today..."
          value={materialsReceived}
          onChange={(e) => setMaterialsReceived(e.target.value)}
          rows={3}
          className="resize-y"
        />
      </div>

      <Separator />

      {/* Section 5: Equipment */}
      <div className="space-y-4">
        <SectionLabel>Equipment on Site</SectionLabel>
        <Textarea
          placeholder="List equipment present (comma-separated or one per line)..."
          value={equipmentUsed}
          onChange={(e) => setEquipmentUsed(e.target.value)}
          rows={3}
          className="resize-y"
        />
      </div>

      <Separator />

      {/* Section 6: Subcontractors */}
      <div className="space-y-4">
        <SectionLabel>Subcontractors on Site</SectionLabel>
        <JsonbTable<SubcontractorEntry>
          rows={subcontractors}
          onChange={setSubcontractors}
          emptyLabel="No subcontractors listed"
          columns={[
            { key: "company", label: "Company", placeholder: "Company name" },
            { key: "trade", label: "Trade", placeholder: "Trade / scope" },
            { key: "workers", label: "Workers", placeholder: "Count", type: "number" },
          ]}
        />
      </div>

      <Separator />

      {/* Section 7: Safety */}
      <div className="space-y-4">
        <SectionLabel>Safety Observations</SectionLabel>
        <Textarea
          placeholder="Note any safety concerns, toolbox talks held, PPE compliance..."
          value={safetyNotes}
          onChange={(e) => setSafetyNotes(e.target.value)}
          rows={3}
          className="resize-y"
        />
      </div>

      <Separator />

      {/* Section 8: Issues & Delays */}
      <div className="space-y-4">
        <SectionLabel>Issues &amp; Delays</SectionLabel>
        <Textarea
          placeholder="Document any delays, RFIs outstanding, or issues requiring attention..."
          value={delays}
          onChange={(e) => setDelays(e.target.value)}
          rows={3}
          className="resize-y"
        />
      </div>

      <Separator />

      {/* Section 9: Visitors */}
      <div className="space-y-4">
        <SectionLabel>Visitors to Site</SectionLabel>
        <JsonbTable<VisitorEntry>
          rows={visitorLog}
          onChange={setVisitorLog}
          emptyLabel="No visitors logged"
          columns={[
            { key: "name", label: "Name", placeholder: "Full name" },
            { key: "company", label: "Company", placeholder: "Company / org" },
            { key: "purpose", label: "Purpose", placeholder: "Reason for visit" },
          ]}
        />
      </div>

      <Separator />

      {/* Section 10: Photos */}
      <div className="space-y-4">
        <SectionLabel>Photos</SectionLabel>
        <PhotoUpload
          projectId={projectId}
          reportDate={report.report_date}
          photos={photos}
          onPhotosChange={(urls) => setPhotos(urls)}
        />
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 z-20">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => saveRef.current?.()} disabled={saving} className="min-h-[44px]">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Draft
          </Button>
          <Button variant="outline" onClick={handleExportPdf} className="min-h-[44px]">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="min-h-[44px] bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Read-Only View ───────────────────────────────────────────────────────────

function ReadOnlyView({
  report, projectId, onReopen,
}: {
  report: ReportDetail; projectId: string; onReopen: () => void;
}) {
  const { data: manpowerRows = [] } = useDailyManpower(report.id);
  const dateInfo = formatDate(report.report_date);

  function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="space-y-2">
        <SectionLabel>{label}</SectionLabel>
        {children}
        <Separator />
      </div>
    );
  }

  function TextValue({ value }: { value: string | null | undefined }) {
    if (!value) return <p className="text-sm text-muted-foreground italic">None recorded.</p>;
    return <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>;
  }

  function handleExportPdf() {
    generateInspectionReportPdf(report, manpowerRows, "Project Report");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  }

  const subcontractors = report.subcontractors ?? [];
  const visitors = report.visitor_log ?? [];
  const equipment = report.equipment_used ?? [];
  const photos = report.photos ?? [];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{dateInfo.short}</h2>
            <p className="text-sm text-muted-foreground">{dateInfo.dow}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
              {report.weather && (
                <span className="flex items-center gap-1.5 text-foreground">
                  {weatherIcon(report.weather)}
                  {report.weather}
                </span>
              )}
              {report.workers_count != null && (
                <span className="flex items-center gap-1.5 text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {report.workers_count} workers
                </span>
              )}
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0">Submitted</Badge>
        </div>
        {report.submitted_at && (
          <p className="text-xs text-muted-foreground mt-3">
            Submitted {new Date(report.submitted_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Work Performed */}
      <Section label="Work Performed Today">
        <TextValue value={report.work_performed} />
      </Section>

      {/* Manpower */}
      <Section label="Manpower on Site">
        {manpowerRows.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Trade</th>
                  <th className="text-center px-3 py-2 font-medium">Workers</th>
                  <th className="text-center px-3 py-2 font-medium">Hours</th>
                  <th className="text-left px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {manpowerRows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{r.trade}</td>
                    <td className="px-3 py-2 text-center font-mono">{r.workers}</td>
                    <td className="px-3 py-2 text-center font-mono">{r.hours}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground italic">None recorded.</p>}
      </Section>

      {/* Materials */}
      <Section label="Materials Received">
        <TextValue value={report.materials_received} />
      </Section>

      {/* Equipment */}
      <Section label="Equipment on Site">
        {equipment.length > 0
          ? <p className="text-sm text-foreground">{equipment.join(", ")}</p>
          : <p className="text-sm text-muted-foreground italic">None recorded.</p>}
      </Section>

      {/* Subcontractors */}
      <Section label="Subcontractors on Site">
        {subcontractors.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Company</th>
                  <th className="text-left px-3 py-2 font-medium">Trade</th>
                  <th className="text-center px-3 py-2 font-medium">Workers</th>
                </tr>
              </thead>
              <tbody>
                {subcontractors.map((s, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{s.company}</td>
                    <td className="px-3 py-2">{s.trade}</td>
                    <td className="px-3 py-2 text-center font-mono">{s.workers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground italic">None recorded.</p>}
      </Section>

      {/* Safety */}
      <Section label="Safety Observations">
        <TextValue value={report.safety_notes} />
      </Section>

      {/* Issues & Delays */}
      <Section label="Issues &amp; Delays">
        <TextValue value={report.delays} />
      </Section>

      {/* Visitors */}
      <Section label="Visitors to Site">
        {visitors.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Company</th>
                  <th className="text-left px-3 py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{v.name}</td>
                    <td className="px-3 py-2">{v.company}</td>
                    <td className="px-3 py-2">{v.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground italic">None recorded.</p>}
      </Section>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <SectionLabel>Photos</SectionLabel>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="rounded-lg overflow-hidden aspect-square bg-muted">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-4">
        <Button onClick={handleExportPdf} variant="outline" className="min-h-[44px]">
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
        <Button onClick={onReopen} variant="outline" className="min-h-[44px]">
          <Pencil className="h-4 w-4 mr-2" /> Re-open for Editing
        </Button>
        <Button onClick={copyLink} variant="ghost" className="min-h-[44px]">
          <ClipboardList className="h-4 w-4 mr-2" /> Copy Link
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailyLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const { data: reportList = [], isLoading: listLoading } = useDailyReportList(projectId ?? null);

  async function loadReport(id: string) {
    setLoadingDetail(true);
    setSelectedId(id);
    try {
      const { data, error } = await supabase
        .from("daily_reports" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setSelectedReport(data as ReportDetail);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleNewReport() {
    if (!projectId) return;
    const today = toDateOnly(new Date());
    try {
      // Check if today's report exists
      const { data: existing } = await supabase
        .from("daily_reports" as any)
        .select("id")
        .eq("project_id", projectId)
        .eq("report_date", today)
        .maybeSingle();
      let id: string;
      if (existing) {
        id = (existing as any).id;
      } else {
        const { data, error } = await supabase
          .from("daily_reports" as any)
          .insert({ project_id: projectId, report_date: today } as any)
          .select("id").single();
        if (error) throw error;
        id = (data as any).id;
        qc.invalidateQueries({ queryKey: ["daily-report-list", projectId] });
      }
      await loadReport(id);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleReopen() {
    if (!selectedReport) return;
    try {
      const { error } = await supabase
        .from("daily_reports" as any)
        .update({ submitted_at: null } as any)
        .eq("id", selectedReport.id);
      if (error) throw error;
      setSelectedReport(prev => prev ? { ...prev, submitted_at: null } : prev);
      qc.invalidateQueries({ queryKey: ["daily-report-list", projectId ?? null] });
      toast.success("Report re-opened for editing");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function handleSubmitted() {
    if (!selectedId) return;
    loadReport(selectedId);
  }

  const isSubmitted = Boolean(selectedReport?.submitted_at);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left Panel: History ── */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-lg font-bold font-[Playfair_Display]">Daily Reports</h1>
          <Button size="sm" onClick={handleNewReport} className="min-h-[36px] bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90">
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : reportList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
              <FileText className="h-8 w-8 opacity-40" />
              <p>No reports yet</p>
              <Button variant="outline" size="sm" onClick={handleNewReport}>Create today's report</Button>
            </div>
          ) : (
            <ul>
              {reportList.map((r) => {
                const d = formatDate(r.report_date);
                const isActive = selectedId === r.id;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => loadReport(r.id)}
                      className={`w-full text-left px-4 py-3 border-b border-border transition-colors flex items-start gap-3 min-h-[72px] ${
                        isActive ? "bg-[var(--apas-sapphire)]/10 border-l-2 border-l-[var(--apas-sapphire)]" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="mt-0.5">{weatherIcon(r.weather)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-foreground">{d.short}</span>
                          {r.submitted_at
                            ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">Submitted</span>
                            : <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">Draft</span>
                          }
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{d.dow}</p>
                        {r.workers_count != null && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3" /> {r.workers_count} workers
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right Panel: Detail ── */}
      <div className="flex-1 overflow-y-auto">
        {loadingDetail ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading report…
          </div>
        ) : selectedReport ? (
          <div className="p-6 max-w-3xl mx-auto">
            {isSubmitted ? (
              <ReadOnlyView
                report={selectedReport}
                projectId={projectId ?? ""}
                onReopen={handleReopen}
              />
            ) : (
              <EditableForm
                report={selectedReport}
                projectId={projectId ?? ""}
                onSubmitted={handleSubmitted}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <ClipboardList className="h-12 w-12 opacity-30" />
            <p className="text-base font-medium">Select a date or create today's report</p>
            <Button variant="outline" onClick={handleNewReport} className="mt-2 min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" /> Create today's report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
