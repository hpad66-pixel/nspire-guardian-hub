import { useState } from 'react';
import { Cloud, FileText, Image, LockKeyhole, Sparkles, Upload, X } from 'lucide-react';
import type { ConsultingReportSource } from '@/hooks/useConsultingReports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { removeLongDashes } from '@/lib/reports/consultingReport';

export type EvidenceMode = 'supporting' | 'mandatory';

interface Props {
  sources: ConsultingReportSource[];
  busy: boolean;
  loading: boolean;
  photoLimit: number;
  onPhotoLimit: (value: number) => void;
  onUpload: (mode: EvidenceMode) => void;
  onDrive: (mode: EvidenceMode) => void;
  onAnalyze: () => void;
  onUpdate: (id: string, patch: Partial<ConsultingReportSource>) => void;
  onRemove: (source: ConsultingReportSource) => void;
}

export function ReportEvidencePanel(props: Props) {
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-white p-5">
      <div><h2 className="font-display text-3xl text-[#082b23]">Build the evidence for your report</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">AI reviews the supporting collection and recommends clear, relevant photographs. Essential photos and receipts stay in the report.</p></div>
      <div className="flex flex-wrap items-end gap-3"><label className="text-xs font-medium">Maximum AI-selected photos<Input type="number" min={0} max={24} value={props.photoLimit} onChange={e => props.onPhotoLimit(Math.min(24, Math.max(0, Number(e.target.value) || 0)))} className="mt-1 w-28" /></label><Button variant="outline" disabled={props.busy || props.loading} onClick={props.onAnalyze}><Sparkles className="mr-2 h-4 w-4" />Review photographs</Button></div>
    </div>
    {(['supporting', 'mandatory'] as const).map(mode => {
      const mandatory = mode === 'mandatory';
      const rows = props.sources.filter(s => (s.placement_mode === 'mandatory') === mandatory);
      return <section key={mode} className={'overflow-hidden rounded-2xl border bg-white ' + (mandatory ? 'border-amber-300' : 'border-emerald-200')}>
        <div className={'flex flex-wrap items-start justify-between gap-4 border-b p-5 ' + (mandatory ? 'bg-amber-50' : 'bg-emerald-50')}>
          <div className="max-w-2xl"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-800">{mandatory ? <LockKeyhole className="h-4 w-4" /> : <Image className="h-4 w-4" />}Area {mandatory ? '2' : '1'}</div><h3 className="mt-2 text-xl font-semibold text-[#082b23]">{mandatory ? 'Mandatory photos and receipts' : 'Supporting documents and photos'}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mandatory ? 'Every item here appears in the report. Add essential photos, receipt images, or receipt PDFs. All PDF pages are preserved. These do not count toward the AI photo limit.' : 'Upload your reports, manifests, and entire photo collection, or select files from Google Drive. Documents inform the narrative. AI chooses representative photographs across the issues it finds.'}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={props.busy} onClick={() => props.onDrive(mode)}><Cloud className="mr-2 h-4 w-4" />Google Drive</Button><Button disabled={props.busy} onClick={() => props.onUpload(mode)}><Upload className="mr-2 h-4 w-4" />{mandatory ? 'Add required evidence' : 'Upload collection'}</Button></div>
        </div>
        {props.loading ? <p className="p-6 text-sm">Loading sources...</p> : !rows.length ? <button className="m-4 block w-[calc(100%-2rem)] rounded-xl border-2 border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-slate-50" disabled={props.busy} onClick={() => props.onUpload(mode)}>{mandatory ? 'Add the photos and receipts the client must see' : 'Add files here, then describe what the report should explain'}</button> : <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(source => <EvidenceCard key={source.id} source={source} busy={props.busy} onUpdate={patch => props.onUpdate(source.id, patch)} onRemove={() => props.onRemove(source)} />)}</div>}
      </section>;
    })}
  </div>;
}

function EvidenceCard({ source, busy, onUpdate, onRemove }: { source: ConsultingReportSource; busy: boolean; onUpdate: (patch: Partial<ConsultingReportSource>) => void; onRemove: () => void }) {
  const [caption, setCaption] = useState(source.caption || '');
  const mandatory = source.placement_mode === 'mandatory';
  const image = source.mime_type?.startsWith('image/');
  const canRequire = image || source.mime_type === 'application/pdf';
  const mode = mandatory ? 'mandatory' : source.included ? 'supporting' : 'excluded';
  return <article className="overflow-hidden rounded-xl border bg-white">
    <div className="relative flex h-44 items-center justify-center bg-slate-100">
      {source.preview_url ? <img src={source.preview_url} alt={source.caption || source.source_name} className="h-full w-full object-contain" /> : <FileText className="h-10 w-10 text-slate-400" />}
      <Button variant="secondary" size="icon" className="absolute right-2 top-2 h-8 w-8" disabled={busy} aria-label={'Remove ' + source.source_name} onClick={onRemove}><X className="h-4 w-4" /></Button>
      <Badge className="absolute bottom-2 left-2 bg-[#082b23]">{mandatory ? 'Always included' : !source.included ? 'Excluded' : image ? (source.selected_for_report ? 'Selected for PDF' : 'Available to AI') : 'Narrative source'}</Badge>
    </div>
    <div className="space-y-3 p-4">
      <p className="break-words text-sm font-semibold">{source.source_name}</p>
      <label className="block text-xs font-medium">Use in report<select className="mt-1 w-full rounded-md border bg-white p-2 text-sm" value={mode} disabled={busy} onChange={e => { const next = e.target.value; onUpdate({ placement_mode: next === 'mandatory' ? 'mandatory' : 'supporting', included: next !== 'excluded', selected_for_report: next === 'mandatory' }); }}><option value="supporting">{image ? 'Let AI choose' : 'Supporting reference'}</option>{canRequire && <option value="mandatory">Always include</option>}<option value="excluded">Leave out</option></select></label>
      <label className="block text-xs font-medium">Your caption or instructions<Textarea value={caption} disabled={busy} onChange={e => setCaption(removeLongDashes(e.target.value))} onBlur={() => { if (caption !== (source.caption || '')) onUpdate({ caption }); }} rows={2} className="mt-1" placeholder="Explain what the client should notice..." /></label>
      {source.visual_analysis?.summary && <div className="rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed"><p className="font-semibold text-emerald-900">AI observation, review before sending</p><p className="mt-1">{source.visual_analysis.summary}</p><p className="mt-2 text-muted-foreground">{source.visual_analysis.reason}</p><Button variant="link" size="sm" className="h-auto px-0 pt-2" disabled={busy} onClick={() => { const text = source.visual_analysis?.summary || ''; setCaption(text); onUpdate({ caption: text }); }}>Use as caption</Button></div>}
    </div>
  </article>;
}
