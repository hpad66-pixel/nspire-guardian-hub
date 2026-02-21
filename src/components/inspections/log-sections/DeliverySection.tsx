import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Barcode, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionSheet } from './shared/SectionSheet';
import { VoiceButton } from './shared/VoiceButton';
import { PhotoCapture } from './shared/PhotoCapture';
import { useSectionDraft } from './shared/useSectionDraft';
import { useCRMContacts } from '@/hooks/useCRMContacts';

interface DeliveryEntry {
  id: string;
  time: string;
  from: string;
  tracking_number: string;
  contents: string;
  photos: string[];
}

interface DeliverySectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const EMPTY_FORM = (): Omit<DeliveryEntry, 'id'> => ({
  time: format(new Date(), 'HH:mm'),
  from: '',
  tracking_number: '',
  contents: '',
  photos: [],
});

export function DeliverySection({ open, onOpenChange, propertyId, onEntriesChange }: DeliverySectionProps) {
  const { state, setState } = useSectionDraft<DeliveryEntry[]>('deliveries', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [vendorSearch, setVendorSearch] = useState('');

  const { data: contacts = [] } = useCRMContacts({ search: vendorSearch, contactType: 'vendor' });

  const handleAdd = () => {
    const entry: DeliveryEntry = { ...form, id: crypto.randomUUID() };
    const next = [...state, entry];
    setState(next);
    onEntriesChange?.(next.length);
    setForm(EMPTY_FORM());
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const next = state.filter(e => e.id !== id);
    setState(next);
    onEntriesChange?.(next.length);
  };

  const openForm = () => { setForm(EMPTY_FORM()); setShowForm(true); };

  return (
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Deliveries" emoji="📦"
      onAddEntry={openForm} addLabel="Log Delivery">
      <div className="p-4 space-y-3">

        {/* Entries */}
        {state.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {d.photos.length > 0 && (
                <img src={d.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-slate-200" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400">@ {d.time}</span>
                </div>
                <p className="font-semibold text-sm text-slate-800">{d.from || 'Unknown vendor'}</p>
                {d.contents && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{d.contents}</p>}
                {d.tracking_number && <p className="text-xs text-slate-400 mt-1">📦 #{d.tracking_number}</p>}
              </div>
              <button onClick={() => handleDelete(d.id)}
                className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-slate-800">Log Delivery</p>

            {/* Photo FIRST */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">📷 Delivery Photo</Label>
              <PhotoCapture photos={form.photos} onPhotosChange={(p) => setForm(f => ({ ...f, photos: p }))}
                folder="deliveries" maxPhotos={5} />
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Time</Label>
              <Input type="time" value={form.time}
                onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} className="h-10" />
            </div>

            <div className="relative">
              <Label className="text-xs text-slate-500 mb-1 block">Delivery From</Label>
              <Input value={form.from}
                onChange={(e) => { setForm(f => ({ ...f, from: e.target.value })); setVendorSearch(e.target.value); }}
                placeholder="Search vendors…" className="h-10" />
              {contacts.length > 0 && vendorSearch && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  {contacts.slice(0, 4).map(c => (
                    <button key={c.id} type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      onClick={() => { setForm(f => ({ ...f, from: c.company_name || c.first_name })); setVendorSearch(''); }}>
                      {c.company_name || c.first_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Tracking Number</Label>
              <div className="flex gap-2">
                <Input value={form.tracking_number}
                  onChange={(e) => setForm(f => ({ ...f, tracking_number: e.target.value }))}
                  placeholder="Optional tracking #" className="flex-1 h-10" />
                <button type="button"
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                  title="Scan barcode">
                  <Barcode className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Contents</Label>
              <div className="flex gap-2">
                <Textarea value={form.contents}
                  onChange={(e) => setForm(f => ({ ...f, contents: e.target.value }))}
                  placeholder="What was delivered?" rows={2} className="flex-1 text-sm resize-none" />
                <VoiceButton onTranscript={(t) => setForm(f => ({ ...f, contents: f.contents + ' ' + t }))} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">
                Log Delivery
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-2xl mb-2">📦</p>
            <p>No deliveries logged today</p>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}
