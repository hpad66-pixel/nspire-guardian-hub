import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useProperties } from '@/hooks/useProperties';
import { useCreateRisk, useUpdateRisk, getRiskScore, getRiskScoreLevel, type Risk } from '@/hooks/useRisks';
import { RiskScoreBadge } from './RiskStatusBadge';

const CATEGORIES = [
  'regulatory', 'financial', 'safety', 'schedule',
  'environmental', 'legal', 'operational', 'reputational',
];
const STATUSES = ['identified', 'open', 'mitigating', 'monitoring', 'closed', 'accepted'];
const P_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const I_LABELS = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk?: Risk | null;
}

export function RiskDialog({ open, onOpenChange, risk }: Props) {
  const isEdit = !!risk;
  const { data: properties = [] } = useProperties();
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();

  const [form, setForm] = useState({
    title: '', category: 'operational', property_id: '', description: '',
    probability: 3, impact: 3, risk_owner: '', review_date: '',
    status: 'open', mitigation_strategy: '',
  });

  useEffect(() => {
    if (risk) {
      setForm({
        title: risk.title || '', category: risk.category || 'operational',
        property_id: risk.property_id || '', description: risk.description || '',
        probability: risk.probability ?? 3, impact: risk.impact ?? 3,
        risk_owner: risk.risk_owner || '', review_date: risk.review_date || '',
        status: risk.status || 'open', mitigation_strategy: risk.mitigation_strategy || '',
      });
    } else {
      setForm({ title: '', category: 'operational', property_id: '', description: '',
        probability: 3, impact: 3, risk_owner: '', review_date: '', status: 'open', mitigation_strategy: '' });
    }
  }, [risk, open]);

  const score = form.probability * form.impact;

  const handleSave = () => {
    if (!form.title) return;
    const payload = {
      title: form.title, category: form.category,
      property_id: form.property_id || null, description: form.description || null,
      probability: form.probability, impact: form.impact,
      status: form.status, review_date: form.review_date || null,
      mitigation_strategy: form.mitigation_strategy || null,
    };
    if (isEdit) {
      updateRisk.mutate({ id: risk!.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createRisk.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Risk' : 'Log New Risk'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Property</Label>
              <Select value={form.property_id || 'none'} onValueChange={v => setForm(f => ({ ...f, property_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <Label>Probability: {form.probability} — {P_LABELS[form.probability - 1]}</Label>
              <Slider value={[form.probability]} onValueChange={v => setForm(f => ({ ...f, probability: v[0] }))} min={1} max={5} step={1} className="mt-2" />
            </div>
            <div>
              <Label>Impact: {form.impact} — {I_LABELS[form.impact - 1]}</Label>
              <Slider value={[form.impact]} onValueChange={v => setForm(f => ({ ...f, impact: v[0] }))} min={1} max={5} step={1} className="mt-2" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">Risk Score:</span>
              <span className="text-2xl font-bold">{score}</span>
              <RiskScoreBadge probability={form.probability} impact={form.impact} />
            </div>
            <div>
              <Label>Review Date</Label>
              <Input type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Full width */}
          <div className="col-span-2">
            <Label>Mitigation Strategy</Label>
            <Textarea value={form.mitigation_strategy} onChange={e => setForm(f => ({ ...f, mitigation_strategy: e.target.value }))} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title}>{isEdit ? 'Save Changes' : 'Log Risk'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
