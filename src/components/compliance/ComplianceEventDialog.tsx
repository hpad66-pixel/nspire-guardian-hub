import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProperties } from '@/hooks/useProperties';
import { useCreateComplianceEvent, useUpdateComplianceEvent, type ComplianceEvent } from '@/hooks/useComplianceEvents';

const CATEGORIES = [
  'permit_renewal', 'license_expiry', 'inspection_due', 'training_due',
  'certification_expiry', 'regulatory_deadline', 'reporting_deadline', 'insurance_renewal', 'other',
];

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['upcoming', 'acknowledged', 'in_progress', 'completed', 'overdue', 'waived'];
const AGENCIES = ['DERM', 'HUD', 'FDEP', 'City of Opa-locka', 'OSHA', 'State Fire Marshal', 'Miami-Dade County', 'EPA', 'Other'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ComplianceEvent | null;
}

export function ComplianceEventDialog({ open, onOpenChange, event }: Props) {
  const isEdit = !!event;
  const { data: properties = [] } = useProperties();
  const createEvent = useCreateComplianceEvent();
  const updateEvent = useUpdateComplianceEvent();

  const [form, setForm] = useState({
    title: '',
    category: 'other',
    agency: '',
    property_id: '',
    due_date: '',
    priority: 'medium',
    status: 'upcoming',
    description: '',
    notes: '',
    completion_notes: '',
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title || '',
        category: event.category || 'other',
        agency: event.agency || '',
        property_id: event.property_id || '',
        due_date: event.due_date || '',
        priority: event.priority || 'medium',
        status: event.status || 'upcoming',
        description: event.description || '',
        notes: event.notes || '',
        completion_notes: event.completion_notes || '',
      });
    } else {
      setForm({
        title: '', category: 'other', agency: '', property_id: '',
        due_date: '', priority: 'medium', status: 'upcoming',
        description: '', notes: '', completion_notes: '',
      });
    }
  }, [event, open]);

  const handleSave = () => {
    if (!form.title || !form.due_date) return;
    const payload = {
      title: form.title,
      category: form.category,
      agency: form.agency || null,
      property_id: form.property_id || null,
      due_date: form.due_date,
      priority: form.priority,
      status: form.status,
      description: form.description || null,
      notes: form.notes || null,
      completion_notes: form.status === 'completed' ? form.completion_notes || null : null,
      completed_at: form.status === 'completed' ? new Date().toISOString() : null,
    };

    if (isEdit) {
      updateEvent.mutate({ id: event!.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createEvent.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Compliance Event' : 'Add Compliance Event'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Agency</Label>
            <Select value={form.agency || 'none'} onValueChange={v => setForm(f => ({ ...f, agency: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {AGENCIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Property</Label>
            <Select value={form.property_id || 'none'} onValueChange={v => setForm(f => ({ ...f, property_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Due Date *</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>

          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>

          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          {form.status === 'completed' && (
            <div className="col-span-2">
              <Label>Completion Notes</Label>
              <Textarea value={form.completion_notes} onChange={e => setForm(f => ({ ...f, completion_notes: e.target.value }))} rows={2} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title || !form.due_date}>
            {isEdit ? 'Save Changes' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
