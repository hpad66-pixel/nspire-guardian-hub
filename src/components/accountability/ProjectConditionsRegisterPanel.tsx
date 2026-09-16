import type { ComponentType } from 'react';
import { BadgeCheck, Building2, Database, Eye, FileText, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FieldItem } from '@/hooks/useFieldAccountability';
import {
  buildProjectConditionsSummary,
  mapFieldItemsToProjectConditions,
  type ProjectConditionClassification,
  type ProjectConditionRecord,
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
}

const CLASS_LABELS: Record<ProjectConditionClassification, string> = {
  structural: 'Structural',
  non_structural: 'Non-structural',
  mixed: 'Mixed',
  needs_engineer_determination: 'Needs engineer',
};

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
}: ProjectConditionsRegisterPanelProps) {
  const usingLiveRecords = Boolean(liveRecords?.length);
  const records = usingLiveRecords ? liveRecords ?? [] : mapFieldItemsToProjectConditions(items, projectName);
  const summary = buildProjectConditionsSummary(records);
  const viewSource = source ?? (usingLiveRecords ? 'durable-register' : 'field-accountability-preview');

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
              <Button variant="outline" className="rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={onOpenReport}>Open client-safe report</Button>
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
                {records.map((record, index) => (
                  <RegisterRow
                    key={record.id}
                    record={record}
                    onOpen={record.fieldItemId ? () => onSelectItem(record.fieldItemId!) : items[index]?.id ? () => onSelectItem(items[index].id) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
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

function RegisterRow({ record, onOpen }: { record: ProjectConditionRecord; onOpen?: () => void }) {
  const engineerGate = record.classification === 'needs_engineer_determination';
  const clientVisible = record.clientPublishStatus !== 'internal_only';
  return (
    <tr className="align-top transition hover:bg-emerald-50/35">
      <td className="px-4 py-4 font-mono text-xs text-slate-500">{record.id}</td>
      <td className="max-w-[360px] px-4 py-4">
        <p className="font-semibold text-[#082b23]">{record.element}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{record.observedCondition}</p>
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><Building2 className="h-3.5 w-3.5" />{record.locationLabel || record.buildingOrArea}</p>
      </td>
      <td className="px-4 py-4">
        <Badge className={engineerGate ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}>
          {CLASS_LABELS[record.classification]}
        </Badge>
      </td>
      <td className="px-4 py-4 text-xs capitalize text-slate-600">{record.status.replace(/_/g, ' ')}</td>
      <td className="px-4 py-4 text-xs text-slate-600">
        <p>{record.permitStatus.replace(/_/g, ' ')}</p>
        <p className="mt-1">{record.ownerSignoffStatus.replace(/_/g, ' ')}</p>
      </td>
      <td className="px-4 py-4">
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase',
          clientVisible ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600',
        )}>
          {clientVisible ? <Eye className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
          {record.clientPublishStatus.replace(/_/g, ' ')}
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
