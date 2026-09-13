import { CheckCheck, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export interface RequestItem { requirement_code: string; title: string; required: boolean; status?: string; portal_requested?: boolean; applies_to?: string }
export interface RequestSelection { codes: string[]; companyProfile: boolean; portfolio: boolean }

export function RequestChecklist({ items, value, onChange }: { items: RequestItem[]; value: RequestSelection; onChange: (value: RequestSelection) => void }) {
  const toggle = (code: string) => onChange({ ...value, codes: value.codes.includes(code) ? value.codes.filter(c => c !== code) : [...value.codes, code] });
  return <section className="rounded-2xl border bg-white p-4 text-slate-900 dark:bg-card dark:text-foreground">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">Only ask for what you need</p><p className="mt-1 text-xs text-muted-foreground">{value.codes.length} checklist items requested from this company.</p></div><ClipboardCheck className="h-5 w-5 text-emerald-700" /></div>
    <div className="my-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onChange({ codes: items.map(i => i.requirement_code), companyProfile: true, portfolio: true })}><CheckCheck className="mr-2 h-4 w-4" />Request everything</Button><Button type="button" size="sm" variant="ghost" onClick={() => onChange({ codes: items.filter(i => !['verified','not_applicable'].includes(i.status ?? '')).map(i => i.requirement_code), companyProfile: false, portfolio: false })}>Only outstanding items</Button><Button type="button" size="sm" variant="ghost" onClick={() => onChange({ codes: [], companyProfile: false, portfolio: false })}>Clear all</Button></div>
    <div className="grid gap-2 sm:grid-cols-2">{items.map(item => <label key={item.requirement_code} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${value.codes.includes(item.requirement_code) ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-transparent bg-muted/40'}`}><Checkbox checked={value.codes.includes(item.requirement_code)} onCheckedChange={() => toggle(item.requirement_code)} /><span className="text-sm"><span className="block font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.status === 'verified' ? 'Already approved' : value.codes.includes(item.requirement_code) ? item.required ? 'Required upload or response' : 'Optional for this company' : 'Handled by your review team'}</span></span></label>)}</div>
    <div className="mt-3 flex flex-wrap gap-4 border-t pt-3 text-sm"><label className="flex items-center gap-2"><Checkbox checked={value.companyProfile} onCheckedChange={checked => onChange({ ...value, companyProfile: checked === true })} />Company profile</label><label className="flex items-center gap-2"><Checkbox checked={value.portfolio} onCheckedChange={checked => onChange({ ...value, portfolio: checked === true })} />Experience and references</label></div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">Unchecked items stay off their portal. Keep existing approvals on file or finish internal review before issuing the Notice to Proceed.</p>
  </section>;
}
