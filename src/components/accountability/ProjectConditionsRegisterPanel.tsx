import { useMemo, useState, type ComponentType } from 'react';
import {
  BadgeCheck, Building2, Database, Download, Eye, FileText, Filter, Loader2, LockKeyhole,
  Mail, MessageSquareText, NotebookTabs, Search, Send, ShieldCheck, Sparkles, UploadCloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FieldItem } from '@/hooks/useFieldAccountability';
import {
  buildClientProjectConditionsReportHtml,
  buildLocationLabel,
  buildProjectConditionsExportPayload,
  buildProjectConditionsSummary,
  buildProjectConditionsResendEmailPayload,
  formatProjectConditionClassification,
  formatProjectConditionPublishStatus,
  formatProjectConditionSeverity,
  formatProjectConditionStatus,
  isClientVisibleCondition,
  mapFieldItemsToProjectConditions,
  type ProjectConditionRecord,
  type ProjectConditionStatus,
} from '@/lib/accountability/projectConditionsRegister';
import { cn } from '@/lib/utils';

interface ProjectConditionsRegisterPanelProps {
  projectName: string;
  items: FieldItem[];
  records?: ProjectConditionRecord[];
  source?: 'durable-register' | 'field-accountability-preview';
  isPromoting?: boolean;
  onSelectItem: (itemId: string) => void;
  onStartWalk: () => void;
  onOpenReport: () => void;
  onPromoteFieldItems?: () => void;
  onUpdateRecord?: (conditionId: string, patch: Partial<Pick<ProjectConditionRecord,
    'status' | 'permitStatus' | 'ownerSignoffStatus' | 'clientPublishStatus' | 'clientSummary'
  >>) => void;
}

const BUILDING_FILTERS = ['All', 'Building 3', 'Building 4', 'Building 5', 'Building 6', 'Site/Common Area'];

const QUEUE_FILTERS: { label: string; value: 'all' | ProjectConditionStatus }[] = [
  { label: 'All Records', value: 'all' },
  { label: 'Engineer Review', value: 'needs_engineer_review' },
  { label: 'Owner Signoff', value: 'ready_for_owner' },
  { label: 'Permit Hold', value: 'held_pending_permit' },
  { label: 'Pricing Release', value: 'released_for_contractor_pricing' },
];

export function ProjectConditionsRegisterPanel({
  projectName,
  items,
  records: liveRecords,
  source,
  isPromoting = false,
  onSelectItem,
  onStartWalk,
  onOpenReport,
  onPromoteFieldItems,
  onUpdateRecord,
}: ProjectConditionsRegisterPanelProps) {
  const [buildingFilter, setBuildingFilter] = useState('All');
  const [queueFilter, setQueueFilter] = useState<'all' | ProjectConditionStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const usingLiveRecords = Boolean(liveRecords?.length);
  const records = useMemo(
    () => (usingLiveRecords ? liveRecords ?? [] : mapFieldItemsToProjectConditions(items, projectName)),
    [items, liveRecords, projectName, usingLiveRecords],
  );
  const summary = buildProjectConditionsSummary(records);
  const viewSource = source ?? (usingLiveRecords ? 'durable-register' : 'field-accountability-preview');
  const filteredRecords = useMemo(() => records.filter((record) => {
    const buildingMatches = buildingFilter === 'All' || record.buildingOrArea === buildingFilter;
    const queueMatches = queueFilter === 'all' || record.status === queueFilter;
    const text = [
      record.id,
      record.buildingOrArea,
      record.locationLabel,
      record.element,
      record.observedCondition,
      record.conditionCategory,
      record.clientSummary,
    ].join(' ').toLowerCase();
    return buildingMatches && queueMatches && (!search.trim() || text.includes(search.trim().toLowerCase()));
  }), [buildingFilter, queueFilter, records, search]);
  const selectedRecord = filteredRecords.find((record) => record.id === selectedRecordId)
    ?? records.find((record) => record.id === selectedRecordId)
    ?? filteredRecords[0]
    ?? records[0]
    ?? null;
  const clientVisibleRecords = records.filter(isClientVisibleCondition).length;

  if (!items.length && !records.length) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-dashed bg-white p-10 text-center sm:p-16" data-testid="project-conditions-register-panel">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><FileText className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-3xl text-[#082b23]">Start the Project Conditions Register</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Capture the first site walk and Proj OS will turn the field evidence into accountable, auditable project-condition records.
        </p>
        <Button className="mt-5 rounded-xl bg-[#0d6b57] hover:bg-[#095746]" onClick={onStartWalk}>Start site walk</Button>
      </section>
    );
  }

  return (
    <section className="space-y-5" data-testid="project-conditions-register-panel">
      <div className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-[0_24px_70px_rgba(8,43,35,.10)]">
        <div className="grid lg:grid-cols-[1.05fr_1.35fr]">
          <div className="bg-[#082b23] p-6 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">APAS Consulting LLC / APAS.ai</p>
            <h2 className="mt-3 font-display text-4xl leading-tight">Project Conditions Register</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/75">
              Native Proj OS view for observed conditions, structural review gates, owner-safe publication, reporting, and audit.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button className="rounded-xl bg-amber-300 text-amber-950 hover:bg-amber-200" onClick={onStartWalk}>Add field evidence</Button>
              <Button variant="outline" className="rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => downloadClientReport(projectName, records)}>Client report</Button>
              <Button variant="outline" className="rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => exportRegister(projectName, records)}>Export JSON</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-4">
            <Metric label="Records" value={summary.total} />
            <Metric label="Client-visible" value={summary.clientVisible} tone="emerald" />
            <Metric label="Engineer gate" value={summary.needsEngineer} tone="amber" />
            <Metric label="Hidden notes" value={summary.hiddenInternalNotes} tone="slate" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Register schedule</p>
              <h3 className="mt-1 font-display text-2xl text-[#082b23]">{projectName}</h3>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-800">
              {viewSource === 'durable-register' ? 'Proj OS durable records' : 'Field evidence preview'}
            </Badge>
          </div>
          {viewSource === 'field-accountability-preview' && onPromoteFieldItems && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-950"><Database className="h-4 w-4" />Activate the durable register</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-900/75">
                    These rows are currently previewed from Field Accountability. Promote them to create auditable PCR records with client/internal boundaries.
                  </p>
                </div>
                <Button
                  className="w-full rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300 sm:w-auto"
                  onClick={onPromoteFieldItems}
                  disabled={isPromoting}
                >
                  {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                  Activate register
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-4 border-b bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search records, locations, summaries"
                  className="h-11 rounded-xl bg-white pl-9"
                />
              </div>
              <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={onOpenReport}>
                <FileText className="mr-2 h-4 w-4" />Photo scope report
              </Button>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.1fr_.9fr]">
              <FilterGroup
                label="Building"
                options={BUILDING_FILTERS.map((building) => ({
                  label: building === 'All' ? 'All Buildings' : building.replace('Building ', 'Bldg '),
                  value: building,
                  count: building === 'All' ? records.length : records.filter((record) => record.buildingOrArea === building).length,
                }))}
                value={buildingFilter}
                onChange={setBuildingFilter}
              />
              <FilterGroup
                label="Queues"
                options={QUEUE_FILTERS.map((queue) => ({
                  label: queue.label,
                  value: queue.value,
                  count: queue.value === 'all' ? records.length : records.filter((record) => record.status === queue.value).length,
                }))}
                value={queueFilter}
                onChange={(value) => setQueueFilter(value as 'all' | ProjectConditionStatus)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Permit / owner</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.map((record) => (
                  <RegisterRow
                    key={record.id}
                    record={record}
                    active={selectedRecord?.id === record.id}
                    onSelect={() => setSelectedRecordId(record.id)}
                    onOpen={record.fieldItemId ? () => onSelectItem(record.fieldItemId!) : undefined}
                  />
                ))}
              </tbody>
            </table>
            {!filteredRecords.length && (
              <div className="p-8 text-center text-sm text-slate-500">No records match the current filters.</div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Client package</p>
            <p className="mt-2 text-3xl font-bold text-[#082b23]">{clientVisibleRecords}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Client-visible records available for branded report and Resend package.</p>
            <div className="mt-4 grid gap-2">
              <Button className="justify-start rounded-xl bg-[#0d6b57] hover:bg-[#095746]" onClick={() => downloadClientReport(projectName, records)}>
                <Download className="mr-2 h-4 w-4" />Download client report
              </Button>
              <Button variant="outline" className="justify-start rounded-xl" onClick={() => exportEmailPackage(projectName, records)}>
                <Mail className="mr-2 h-4 w-4" />Email package
              </Button>
              <Button variant="outline" className="justify-start rounded-xl" onClick={() => exportRegister(projectName, records)}>
                <UploadCloud className="mr-2 h-4 w-4" />Proj OS JSON
              </Button>
            </div>
          </div>

          {selectedRecord && (
            <RecordDetail
              record={selectedRecord}
              onOpenSource={selectedRecord.fieldItemId ? () => onSelectItem(selectedRecord.fieldItemId!) : undefined}
              onSendToOwner={onUpdateRecord && selectedRecord.databaseId ? () => onUpdateRecord(selectedRecord.databaseId!, {
                status: 'ready_for_owner',
                ownerSignoffStatus: 'ready_for_owner',
                clientPublishStatus: 'ready_to_publish',
                clientSummary: selectedRecord.clientSummary?.trim() || selectedRecord.observedCondition,
              }) : undefined}
              onHoldPermit={onUpdateRecord && selectedRecord.databaseId ? () => onUpdateRecord(selectedRecord.databaseId!, {
                status: 'held_pending_permit',
                permitStatus: 'held_pending_permit',
              }) : undefined}
              onPublishSummary={onUpdateRecord && selectedRecord.databaseId ? () => onUpdateRecord(selectedRecord.databaseId!, {
                clientPublishStatus: 'published_to_client',
                clientSummary: selectedRecord.clientSummary?.trim() || selectedRecord.observedCondition,
              }) : undefined}
            />
          )}

          <BoundaryCard
            icon={LockKeyhole}
            title="Internal by default"
            body="AI review notes, APAS comments, and unresolved engineering questions stay inside the staff layer until APAS publishes a clean client summary."
          />
          <BoundaryCard
            icon={ShieldCheck}
            title="Engineer governs classification"
            body="Concrete, slab, balcony, rebar, stair, and structural keywords are treated as engineer-review gates rather than automatic client conclusions."
          />
          <BoundaryCard
            icon={BadgeCheck}
            title="Owner-safe reporting"
            body="The report view uses only owner-visible records and client-visible comments, preserving the Proj OS audit trail beneath it."
          />
        </aside>
      </div>
    </section>
  );
}

function downloadText(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'project';
}

function downloadClientReport(projectName: string, records: ProjectConditionRecord[]) {
  const html = buildClientProjectConditionsReportHtml({ projectName, records });
  downloadText(`${slugify(projectName)}-project-conditions-report.html`, html, 'text/html');
}

function exportRegister(projectName: string, records: ProjectConditionRecord[]) {
  const payload = buildProjectConditionsExportPayload({
    projectName,
    records,
    actor: {
      role: 'APAS Proj OS user',
      identityProvider: 'Supabase Auth',
    },
  });
  downloadText(`${slugify(projectName)}-project-conditions-export.json`, JSON.stringify(payload, null, 2));
}

function exportEmailPackage(projectName: string, records: ProjectConditionRecord[]) {
  const payload = buildProjectConditionsResendEmailPayload({
    projectName,
    records,
    to: 'owner@example.com',
  });
  downloadText(`${slugify(projectName)}-resend-report-package.json`, JSON.stringify(payload, null, 2));
}

function Metric({ label, value, tone = 'white' }: { label: string; value: number; tone?: 'white' | 'emerald' | 'amber' | 'slate' }) {
  const colors = {
    white: 'bg-white text-slate-900',
    emerald: 'bg-emerald-50 text-emerald-900',
    amber: 'bg-amber-50 text-amber-900',
    slate: 'bg-slate-50 text-slate-800',
  };
  return (
    <div className={cn('min-h-32 p-5', colors[tone])}>
      <p className="text-[10px] font-black uppercase tracking-[.16em] opacity-60">{label}</p>
      <p className="mt-3 text-4xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function FilterGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { label: string; value: T; count: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[.14em] text-slate-500"><Filter className="h-3.5 w-3.5" />{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={option.value === value ? 'default' : 'outline'}
            size="sm"
            className={cn('h-9 rounded-xl', option.value === value && 'bg-[#0d6b57] hover:bg-[#095746]')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            <span className={cn('ml-2 rounded-full px-1.5 py-0.5 text-[10px]', option.value === value ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>
              {option.count}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function RegisterRow({ record, active, onSelect, onOpen }: { record: ProjectConditionRecord; active: boolean; onSelect: () => void; onOpen?: () => void }) {
  const engineerGate = record.classification === 'needs_engineer_determination';
  const clientVisible = record.clientPublishStatus !== 'internal_only';
  return (
    <tr className={cn('align-top transition hover:bg-emerald-50/35', active && 'bg-amber-50/70')}>
      <td className="px-4 py-4 font-mono text-xs text-slate-500">
        <button type="button" className="font-mono underline-offset-4 hover:underline" onClick={onSelect}>{record.id}</button>
      </td>
      <td className="max-w-[360px] px-4 py-4">
        <button type="button" className="block text-left" onClick={onSelect}>
          <p className="font-semibold text-[#082b23]">{record.element}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{record.observedCondition}</p>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><Building2 className="h-3.5 w-3.5" />{record.locationLabel || record.buildingOrArea}</p>
        </button>
      </td>
      <td className="px-4 py-4">
        <Badge className={engineerGate ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}>
          {formatProjectConditionClassification(record.classification)}
        </Badge>
      </td>
      <td className="px-4 py-4 text-xs text-slate-600">{formatProjectConditionStatus(record.status)}</td>
      <td className="px-4 py-4 text-xs text-slate-600">
        <p>{formatProjectConditionStatus(record.permitStatus)}</p>
        <p className="mt-1">{formatProjectConditionStatus(record.ownerSignoffStatus)}</p>
      </td>
      <td className="px-4 py-4">
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase',
          clientVisible ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600',
        )}>
          {clientVisible ? <Eye className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
          {formatProjectConditionPublishStatus(record.clientPublishStatus)}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <Button variant="outline" size="sm" className="rounded-xl" onClick={onOpen} disabled={!onOpen}>
          {onOpen ? 'Open source' : 'Record'}
        </Button>
      </td>
    </tr>
  );
}

function RecordDetail({
  record,
  onOpenSource,
  onSendToOwner,
  onHoldPermit,
  onPublishSummary,
}: {
  record: ProjectConditionRecord;
  onOpenSource?: () => void;
  onSendToOwner?: () => void;
  onHoldPermit?: () => void;
  onPublishSummary?: () => void;
}) {
  const workflow: { status: ProjectConditionStatus; label: string; body: string }[] = [
    { status: 'draft', label: 'Draft', body: 'Field capture' },
    { status: 'needs_engineer_review', label: 'Engineer', body: 'Classification' },
    { status: 'ready_for_owner', label: 'Owner', body: 'Owner review' },
    { status: 'held_pending_permit', label: 'Permit', body: 'Permit status' },
    { status: 'released_for_contractor_pricing', label: 'Pricing', body: 'Bid package' },
  ];
  const currentIndex = Math.max(0, workflow.findIndex((step) => step.status === record.status));
  const visibleComments = record.comments.slice(0, 4);
  const visibleNotations = record.notations.slice(0, 4);

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold text-slate-500">{record.id}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-[#082b23]">{record.element}</h3>
          <p className="mt-1 text-xs text-slate-500">{buildLocationLabel(record)}</p>
        </div>
        <Badge className={isClientVisibleCondition(record) ? 'bg-sky-100 text-sky-800 hover:bg-sky-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
          {formatProjectConditionPublishStatus(record.clientPublishStatus)}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <DetailField label="Class" value={formatProjectConditionClassification(record.classification)} />
        <DetailField label="Severity" value={formatProjectConditionSeverity(record.severity)} />
        <DetailField label="Status" value={formatProjectConditionStatus(record.status)} />
        <DetailField label="Quantity" value={record.quantity ? `${record.quantity} ${record.quantityUnit ?? ''}` : 'TBD'} />
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {workflow.map((step, index) => (
          <div
            key={step.status}
            className={cn(
              'min-h-20 rounded-xl border p-2',
              index < currentIndex && 'border-emerald-200 bg-emerald-50',
              index === currentIndex && 'border-amber-300 bg-amber-50',
              index > currentIndex && 'bg-slate-50',
            )}
          >
            <p className="text-[10px] font-bold text-slate-800">{step.label}</p>
            <p className="mt-1 text-[10px] leading-tight text-slate-500">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border-l-4 border-sky-500 bg-sky-50 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-950"><Sparkles className="h-4 w-4" />Internal AI review</p>
        <p className="mt-1 text-xs leading-relaxed text-sky-900/75">{record.aiSuggestion || 'No AI review note has been recorded yet.'}</p>
        {typeof record.aiConfidence === 'number' && <p className="mt-2 text-[11px] font-semibold text-sky-800">Confidence {Math.round(record.aiConfidence * 100)}%</p>}
      </div>

      <div className="mt-4 rounded-2xl border-l-4 border-emerald-600 bg-emerald-50 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-950"><NotebookTabs className="h-4 w-4" />Client summary</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-900/75">{record.clientSummary || 'No owner-facing summary has been published for this condition.'}</p>
      </div>

      <div className="mt-4 grid gap-2">
        <Button className="justify-start rounded-xl bg-[#0d6b57] hover:bg-[#095746]" onClick={onSendToOwner} disabled={!onSendToOwner}>
          <Send className="mr-2 h-4 w-4" />Send to owner queue
        </Button>
        <Button variant="outline" className="justify-start rounded-xl" onClick={onHoldPermit} disabled={!onHoldPermit}>
          <ShieldCheck className="mr-2 h-4 w-4" />Hold pending permit
        </Button>
        <Button variant="outline" className="justify-start rounded-xl" onClick={onPublishSummary} disabled={!onPublishSummary}>
          <Eye className="mr-2 h-4 w-4" />Publish client summary
        </Button>
        {onOpenSource && <Button variant="ghost" className="justify-start rounded-xl" onClick={onOpenSource}>Open source item</Button>}
      </div>

      <div className="mt-5 space-y-3">
        <DetailList icon={MessageSquareText} title="Comments" items={visibleComments.map((comment) => ({
          id: comment.id,
          meta: `${comment.createdBy} / ${comment.role ?? 'Team'} / ${comment.audience.replace(/_/g, ' ')}`,
          body: comment.body,
        }))} />
        <DetailList icon={NotebookTabs} title="Notations" items={visibleNotations.map((notation) => ({
          id: notation.id,
          meta: `${notation.type} / ${notation.createdBy} / ${notation.audience.replace(/_/g, ' ')}`,
          body: notation.body,
        }))} />
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function DetailList({ icon: Icon, title, items }: { icon: ComponentType<{ className?: string }>; title: string; items: { id: string; meta: string; body: string }[] }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.12em] text-slate-500"><Icon className="h-3.5 w-3.5" />{title}</p>
      <div className="mt-2 space-y-2">
        {items.length ? items.map((item) => (
          <div key={item.id} className="rounded-xl border p-3">
            <p className="text-[10px] font-bold uppercase text-slate-400">{item.meta}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
          </div>
        )) : <p className="rounded-xl border border-dashed p-3 text-xs text-slate-400">No entries yet.</p>}
      </div>
    </div>
  );
}

function BoundaryCard({ icon: Icon, title, body }: { icon: ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>
        <div>
          <h3 className="font-semibold text-[#082b23]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
        </div>
      </div>
    </div>
  );
}
