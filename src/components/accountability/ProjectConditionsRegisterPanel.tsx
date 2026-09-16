import { useMemo, useState, type ComponentType } from 'react';
import {
  Building2, Camera, Database, Download, Eye, FileText, Filter, Loader2, LockKeyhole,
  Mail, MapPinned, MessageSquareText, NotebookTabs, Search, Send, ShieldCheck, Sparkles, UploadCloud,
  UserRound,
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
  const engineerReviewRate = summary.total ? Math.round((summary.needsEngineer / summary.total) * 100) : 0;
  const clientVisibilityRate = summary.total ? Math.round((summary.clientVisible / summary.total) * 100) : 0;

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
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-[#f7f5ef] shadow-[0_16px_40px_rgba(24,31,38,.12)]" data-testid="project-conditions-register-panel">
      <div className="grid min-h-[720px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-5 bg-[#17212b] p-5 text-slate-50">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded bg-[#d6a21b] font-black text-[#111827]">AW</span>
            <div>
              <h2 className="text-lg font-black leading-tight">Project Conditions</h2>
              <p className="text-xs text-slate-300">APAS Consulting LLC</p>
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[.06] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-8 min-w-14 place-items-center rounded bg-slate-50 text-xs font-black tracking-wider text-[#111827]">APAS</span>
              <span className="text-sm font-black text-slate-100">APAS.ai</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">Native Proj OS register with APAS/AW branding, internal/client boundaries, and owner-ready publication.</p>
          </div>

          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[.06] p-3">
            <p className="text-[11px] font-black uppercase text-slate-400">Signed in</p>
            <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#d6a21b] font-black text-[#111827]"><UserRound className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">APAS project team</p>
                <p className="truncate text-xs text-slate-300">Google, Microsoft, or magic-link auth</p>
              </div>
            </div>
          </div>

          <RailFilter
            label="Buildings"
            options={BUILDING_FILTERS.map((building) => ({
              label: building === 'All' ? 'All Buildings' : building.replace('Building ', 'Bldg '),
              value: building,
              count: building === 'All' ? records.length : records.filter((record) => record.buildingOrArea === building).length,
            }))}
            value={buildingFilter}
            onChange={setBuildingFilter}
          />

          <RailFilter
            label="Queues"
            options={QUEUE_FILTERS.map((queue) => ({
              label: queue.label,
              value: queue.value,
              count: queue.value === 'all' ? records.length : records.filter((record) => record.status === queue.value).length,
            }))}
            value={queueFilter}
            onChange={(value) => setQueueFilter(value as 'all' | ProjectConditionStatus)}
          />

          <div className="mt-auto grid gap-3">
            <BoundaryCard
              icon={LockKeyhole}
              title="Internal by default"
              body="AI review notes and APAS working comments stay inside the staff layer until published."
              dark
            />
            <BoundaryCard
              icon={ShieldCheck}
              title="Engineer governs"
              body="Structural classifications remain review-gated before owner-facing release."
              dark
            />
          </div>
        </aside>

        <div className="grid min-w-0 grid-rows-[auto_auto_auto_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#1c2024]">Project Conditions Register</h2>
              <p className="mt-1 text-sm text-slate-500">{projectName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-[#b88700]/30 bg-[#fff8df] text-[#9a6700]">
                {viewSource === 'durable-register' ? 'Proj OS durable records' : 'Field evidence preview'}
              </Badge>
              <Button variant="outline" className="rounded-md bg-white" onClick={onOpenReport}><FileText className="mr-2 h-4 w-4" />Photo scope</Button>
              <Button variant="outline" className="rounded-md bg-white" onClick={() => exportEmailPackage(projectName, records)}><Mail className="mr-2 h-4 w-4" />Email package</Button>
              <Button variant="outline" className="rounded-md bg-white" onClick={() => exportRegister(projectName, records)}><UploadCloud className="mr-2 h-4 w-4" />Proj OS JSON</Button>
              <Button className="rounded-md bg-[#234e70] hover:bg-[#1c405d]" onClick={() => downloadClientReport(projectName, records)}><Download className="mr-2 h-4 w-4" />Client report</Button>
              <Button className="rounded-md bg-[#d6a21b] font-black text-[#111827] hover:bg-[#c89517]" onClick={onStartWalk}>New record</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-4">
            <Metric label="Records" value={summary.total} />
            <Metric label="Client-visible" value={summary.clientVisible} tone="emerald" />
            <Metric label="Engineer gate" value={summary.needsEngineer} tone="amber" />
            <Metric label="Hidden notes" value={summary.hiddenInternalNotes} tone="slate" />
          </div>

          <div className="grid gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-3">
            <ConfidenceItem title="AI review boundary" body={`${summary.hiddenInternalNotes} internal notes withheld from client output`} />
            <ConfidenceItem title="Engineer review load" body={`${engineerReviewRate}% of records held for classification review`} />
            <ConfidenceItem title="Publication posture" body={`${clientVisibilityRate}% staged for owner/client visibility`} />
          </div>

          <div className="grid min-h-0 gap-4 p-4 xl:grid-cols-[minmax(360px,.92fr)_minmax(0,1.25fr)]">
            <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex min-h-14 flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-base font-black text-[#1c2024]">Site register</h3>
                  <p className="text-xs text-slate-500">{filteredRecords.length} visible records after filters</p>
                </div>
                <div className="relative w-full md:w-56">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search records"
                    className="h-10 rounded-md bg-white pl-9"
                  />
                </div>
              </div>
              <SitePlan
                records={records}
                activeBuilding={buildingFilter}
                onSelectBuilding={setBuildingFilter}
              />
              {viewSource === 'field-accountability-preview' && onPromoteFieldItems && (
                <div className="border-b border-[#d6a21b]/30 bg-[#fff8df] px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-[#9a6700]"><Database className="h-4 w-4" />Activate durable register</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#9a6700]/80">Preview rows can be promoted into auditable PCR records.</p>
                    </div>
                    <Button
                      className="rounded-md bg-[#d6a21b] font-black text-[#111827] hover:bg-[#c89517]"
                      onClick={onPromoteFieldItems}
                      disabled={isPromoting}
                    >
                      {isPromoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                      Activate
                    </Button>
                  </div>
                </div>
              )}
              <div className="max-h-[620px] overflow-auto">
                {filteredRecords.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    active={selectedRecord?.id === record.id}
                    onSelect={() => setSelectedRecordId(record.id)}
                    onOpen={record.fieldItemId ? () => onSelectItem(record.fieldItemId!) : undefined}
                  />
                ))}
                {!filteredRecords.length && (
                  <div className="p-8 text-center text-sm text-slate-500">No records match the current filters.</div>
                )}
              </div>
            </div>

            <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div>
                  <h3 className="text-base font-black text-[#1c2024]">Observed condition</h3>
                  <p className="text-xs text-slate-500">Internal review, owner-safe summary, and audit context</p>
                </div>
                <Badge className="bg-[#eef2f7] text-[#344054] hover:bg-[#eef2f7]">APAS controlled</Badge>
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
            </div>
          </div>
        </div>
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

function RailFilter<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { label: string; value: T; count: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-400"><Filter className="h-3.5 w-3.5" />{label}</p>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'flex min-h-10 w-full items-center justify-between rounded-md border px-3 text-left text-sm transition',
              option.value === value
                ? 'border-slate-50 bg-slate-50 font-bold text-[#101820]'
                : 'border-white/10 bg-white/[.07] text-slate-200 hover:border-white/20 hover:bg-white/[.10]',
            )}
            onClick={() => onChange(option.value)}
          >
            <span>{option.label}</span>
            <span className="text-xs opacity-70">{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfidenceItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white px-5 py-3">
      <p className="text-sm font-black text-[#1c2024]">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </div>
  );
}

function SitePlan({
  records,
  activeBuilding,
  onSelectBuilding,
}: {
  records: ProjectConditionRecord[];
  activeBuilding: string;
  onSelectBuilding: (building: string) => void;
}) {
  const buildings = BUILDING_FILTERS.filter((building) => building !== 'All');
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-[#e9edf0] p-3 sm:grid-cols-5">
      {buildings.map((building) => {
        const count = records.filter((record) => record.buildingOrArea === building).length;
        return (
          <button
            key={building}
            type="button"
            className={cn(
              'min-h-20 rounded-md border bg-[#fffdf6] p-2 text-center transition hover:border-[#b88700]',
              activeBuilding === building && 'border-[#b88700] shadow-[inset_0_0_0_2px_#b88700]',
            )}
            onClick={() => onSelectBuilding(building)}
          >
            <MapPinned className="mx-auto h-4 w-4 text-[#234e70]" />
            <strong className="mt-1 block text-sm text-[#1c2024]">{building.replace('Building ', 'Bldg ')}</strong>
            <span className="text-xs text-slate-500">{count} records</span>
          </button>
        );
      })}
    </div>
  );
}

function RecordCard({ record, active, onSelect, onOpen }: { record: ProjectConditionRecord; active: boolean; onSelect: () => void; onOpen?: () => void }) {
  const engineerGate = record.classification === 'needs_engineer_determination';
  const clientVisible = record.clientPublishStatus !== 'internal_only';
  return (
    <div className={cn('grid grid-cols-[78px_minmax(0,1fr)] gap-3 border-b border-slate-200 p-4 transition hover:bg-[#fff9e8]', active && 'bg-[#fff9e8]')}>
      <button
        type="button"
        className="relative aspect-square w-[78px] overflow-hidden rounded-md border border-slate-300 bg-[repeating-linear-gradient(45deg,#d9dde2_0_8px,#c3cbd3_8px_16px)]"
        onClick={onSelect}
        aria-label={`Select ${record.id}`}
      >
        <span className="absolute inset-x-3 bottom-5 block h-1.5 rotate-[-13deg] bg-[#9d2f2f]/75" />
        <Camera className="absolute bottom-2 right-2 h-4 w-4 rounded bg-white/80 p-0.5 text-slate-600" />
      </button>
      <div className="min-w-0">
        <button type="button" className="block w-full text-left" onClick={onSelect}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold text-slate-500">{record.id}</p>
              <h4 className="mt-1 truncate text-sm font-black text-[#1c2024]">{record.element}</h4>
            </div>
            <span className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-black', clientVisible ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600')}>
              {clientVisible ? 'Client' : 'Internal'}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{record.observedCondition}</p>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><Building2 className="h-3.5 w-3.5" />{record.locationLabel || record.buildingOrArea}</p>
        </button>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge className={engineerGate ? 'bg-[#fff2cc] text-[#9a6700] hover:bg-[#fff2cc]' : 'bg-[#e5f6ed] text-[#2d6a4f] hover:bg-[#e5f6ed]'}>
            {formatProjectConditionClassification(record.classification)}
          </Badge>
          <Badge variant="outline" className="bg-white text-slate-600">{formatProjectConditionStatus(record.status)}</Badge>
          {onOpen && <Button variant="outline" size="sm" className="h-7 rounded-md bg-white px-2 text-xs" onClick={onOpen}>Open source</Button>}
        </div>
      </div>
    </div>
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
    <div className="max-h-[760px] overflow-auto p-4">
      <div className="grid gap-4 2xl:grid-cols-[minmax(240px,.85fr)_minmax(0,1fr)]">
        <div
          className="relative min-h-64 overflow-hidden rounded-lg border border-slate-200 bg-[repeating-linear-gradient(135deg,#dce2e8_0_12px,#c5ced8_12px_24px)]"
          aria-label="Photo evidence placeholder"
        >
          <span className="absolute left-[28%] top-[20%] h-[54%] w-[42%] rotate-[10deg] border-b-8 border-l-[12px] border-[#9d2f2f]/75" />
          <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2.5 py-2 text-xs font-black text-slate-700">{record.id} / Photo Evidence</span>
        </div>

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-bold text-slate-500">{record.id}</p>
              <h3 className="mt-1 text-2xl font-black leading-tight text-[#1c2024]">{record.element}</h3>
              <p className="mt-2 text-sm text-slate-500">{buildLocationLabel(record)}</p>
            </div>
            <Badge className={isClientVisibleCondition(record) ? 'bg-sky-100 text-sky-800 hover:bg-sky-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
              {formatProjectConditionPublishStatus(record.clientPublishStatus)}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <DetailField label="Class" value={formatProjectConditionClassification(record.classification)} />
            <DetailField label="Severity" value={formatProjectConditionSeverity(record.severity)} />
            <DetailField label="Status" value={formatProjectConditionStatus(record.status)} />
            <DetailField label="Quantity" value={record.quantity ? `${record.quantity} ${record.quantityUnit ?? ''}` : 'TBD'} />
            <DetailField label="Permit" value={formatProjectConditionStatus(record.permitStatus)} />
            <DetailField label="Owner" value={formatProjectConditionStatus(record.ownerSignoffStatus)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {workflow.map((step, index) => (
          <div
            key={step.status}
            className={cn(
              'min-h-20 rounded-lg border p-2',
              index < currentIndex && 'border-[#2d6a4f]/30 bg-[#f0faf4]',
              index === currentIndex && 'border-[#b88700]/50 bg-[#fff8df]',
              index > currentIndex && 'bg-[#fbfbf8]',
            )}
          >
            <p className="text-[10px] font-bold text-slate-800">{step.label}</p>
            <p className="mt-1 text-[10px] leading-tight text-slate-500">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-r-lg border-l-4 border-[#186879] bg-[#eff9fb] p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-950"><Sparkles className="h-4 w-4" />Internal AI review</p>
        <p className="mt-1 text-xs leading-relaxed text-sky-900/75">{record.aiSuggestion || 'No AI review note has been recorded yet.'}</p>
        {typeof record.aiConfidence === 'number' && <p className="mt-2 text-[11px] font-semibold text-sky-800">Confidence {Math.round(record.aiConfidence * 100)}%</p>}
      </div>

      <div className="mt-4 rounded-r-lg border-l-4 border-[#2d6a4f] bg-[#e5f6ed] p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-950"><NotebookTabs className="h-4 w-4" />Client summary</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-900/75">{record.clientSummary || 'No owner-facing summary has been published for this condition.'}</p>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Button className="justify-start rounded-md bg-[#234e70] hover:bg-[#1c405d]" onClick={onSendToOwner} disabled={!onSendToOwner}>
          <Send className="mr-2 h-4 w-4" />Send to owner queue
        </Button>
        <Button variant="outline" className="justify-start rounded-md" onClick={onHoldPermit} disabled={!onHoldPermit}>
          <ShieldCheck className="mr-2 h-4 w-4" />Hold pending permit
        </Button>
        <Button variant="outline" className="justify-start rounded-md" onClick={onPublishSummary} disabled={!onPublishSummary}>
          <Eye className="mr-2 h-4 w-4" />Publish client summary
        </Button>
        {onOpenSource && <Button variant="ghost" className="justify-start rounded-md" onClick={onOpenSource}>Open source item</Button>}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
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

function BoundaryCard({ icon: Icon, title, body, dark = false }: { icon: ComponentType<{ className?: string }>; title: string; body: string; dark?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-4 shadow-sm', dark ? 'border-white/10 bg-white/[.06]' : 'bg-white')}>
      <div className="flex items-start gap-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded', dark ? 'bg-white/10 text-[#d6a21b]' : 'bg-emerald-50 text-emerald-700')}><Icon className="h-5 w-5" /></span>
        <div>
          <h3 className={cn('font-semibold', dark ? 'text-slate-50' : 'text-[#082b23]')}>{title}</h3>
          <p className={cn('mt-1 text-xs leading-relaxed', dark ? 'text-slate-300' : 'text-slate-500')}>{body}</p>
        </div>
      </div>
    </div>
  );
}
