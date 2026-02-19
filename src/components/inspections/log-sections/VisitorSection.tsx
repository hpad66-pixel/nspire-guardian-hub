import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, LogOut, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionSheet } from './shared/SectionSheet';
import { PhotoCapture } from './shared/PhotoCapture';
import { useSectionDraft } from './shared/useSectionDraft';

interface VisitorEntry {
  id: string;
  name: string;
  purpose: string;
  arrival: string;
  departure: string;
  signed_out: boolean;
  photos: string[];
}

interface VisitorSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const EMPTY_FORM = (): Omit<VisitorEntry, 'id'> => ({
  name: '',
  purpose: '',
  arrival: format(new Date(), 'HH:mm'),
  departure: '',
  signed_out: false,
  photos: [],
});

export function VisitorSection({ open, onOpenChange, propertyId, onEntriesChange }: VisitorSectionProps) {
  const { state, setState } = useSectionDraft<VisitorEntry[]>('visitors', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());

  const now = new Date();
  const isPast4pm = now.getHours() >= 16;
  const unsignedOut = state.filter(v => !v.signed_out);

  const handleAdd = () => {
    if (!form.name) return;
    const entry: VisitorEntry = { ...form, id: crypto.randomUUID() };
    const next = [...state, entry];
    setState(next);
    onEntriesChange?.(next.length);
    setForm(EMPTY_FORM());
    setShowForm(false);
  };

  const handleSignOut = (id: string) => {
    const next = state.map(v =>
      v.id === id ? { ...v, signed_out: true, departure: format(new Date(), 'HH:mm') } : v
    );
    setState(next);
  };

  const handleDelete = (id: string) => {
    const next = state.filter(e => e.id !== id);
    setState(next);
    onEntriesChange?.(next.length);
  };

  return (
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Visitors" emoji="🧍"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Add Visitor">
      <div className="p-4 space-y-3">

        {/* 4pm warning */}
        {isPast4pm && unsignedOut.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl">
            <span className="text-amber-600 text-lg">⚠️</span>
            <p className="text-xs text-amber-700 font-medium">
              {unsignedOut.length} visitor{unsignedOut.length > 1 ? 's' : ''} still on site — please sign out
            </p>
          </div>
        )}

        {/* Visitor timeline */}
        {state.map((visitor) => (
          <div key={visitor.id}
            className={`bg-white rounded-xl border p-4 shadow-sm ${visitor.signed_out ? 'border-slate-200 opacity-75' : 'border-blue-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">{visitor.name}</p>
                {visitor.purpose && <p className="text-xs text-slate-400">{visitor.purpose}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-slate-600">
                    Arrived {visitor.arrival}
                  </span>
                  {visitor.signed_out && visitor.departure && (
                    <>
                      <span className="text-slate-300">→</span>
                      <span className="text-xs text-slate-600">{visitor.departure}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check className="h-3 w-3" />Signed Out
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!visitor.signed_out && (
                  <button onClick={() => handleSignOut(visitor.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500">
                    <LogOut className="h-3 w-3" />Sign Out
                  </button>
                )}
                <button onClick={() => handleDelete(visitor.id)}
                  className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-slate-800">Add Visitor</p>

            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Visitor Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name" className="h-11 font-medium" autoFocus />
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Purpose / Company</Label>
              <Input value={form.purpose} onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Why are they visiting?" className="h-10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Arrival Time</Label>
                <Input type="time" value={form.arrival}
                  onChange={(e) => setForm(f => ({ ...f, arrival: e.target.value }))} className="h-10" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Departure (optional)</Label>
                <Input type="time" value={form.departure}
                  onChange={(e) => setForm(f => ({ ...f, departure: e.target.value }))} className="h-10" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Visitor Photo (optional)</Label>
              <PhotoCapture photos={form.photos} onPhotosChange={(p) => setForm(f => ({ ...f, photos: p }))}
                folder="visitors" maxPhotos={1} compact />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd} disabled={!form.name}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                Add Visitor
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-2xl mb-2">🚶</p>
            <p>No visitors logged today</p>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}
