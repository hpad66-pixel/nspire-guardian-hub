import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { templateFor, fieldVisible, type ChecklistField } from '@/lib/inspections/checklistTemplates';

// Renders the structured checklist for an asset type (cleanout / manhole / catch
// basin / by-pass). Answers are a flat Record<fieldId, string>; Y/N/N/A and
// selects store the option label verbatim so the report reads exactly like the
// paper form.
export function InspectionChecklistFields({
  assetType,
  value,
  onChange,
}: {
  assetType: string;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const fields = templateFor(assetType);
  if (fields.length === 0) return null;

  const set = (id: string, v: string) => onChange({ ...value, [id]: v });

  const OptionRow = ({ field, options }: { field: ChecklistField; options: string[] }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = value[field.id] === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => set(field.id, active ? '' : opt)}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-all',
              active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Inspection checklist</p>
      {fields.map(field => {
        if (!fieldVisible(field, value)) return null;
        return (
          <div key={field.id} className="space-y-1.5">
            <label className="block text-[13px] font-medium text-slate-700">{field.label}</label>
            {field.type === 'yesno' && <OptionRow field={field} options={['Yes', 'No']} />}
            {field.type === 'yesnona' && <OptionRow field={field} options={['Yes', 'No', 'N/A']} />}
            {field.type === 'select' && <OptionRow field={field} options={field.options ?? []} />}
            {field.type === 'text' && (
              <Input value={value[field.id] ?? ''} onChange={e => set(field.id, e.target.value)} placeholder="…" className="h-9 bg-white text-sm" />
            )}
            {field.type === 'date' && (
              <Input type="date" value={value[field.id] ?? ''} onChange={e => set(field.id, e.target.value)} className="h-9 bg-white text-sm" />
            )}
          </div>
        );
      })}
    </div>
  );
}
