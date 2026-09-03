import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Pencil, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { gallons, money } from '@/lib/water-intel';
import type { MeterWaterPerformance, WaterServiceAccount } from '@/lib/water-intel';
import { useUpdateWaterMeterProfile } from '@/hooks/useWaterIntelligence';

function shortMetric(value: number | null, suffix: string) {
  return value == null ? '—' : `${value.toFixed(1)} ${suffix}`;
}

function signedMoney(value: number | null) {
  if (value == null) return '—';
  return `${value < 0 ? '−' : '+'}${money(Math.abs(value))}`;
}

function sourceLabel(source: string) {
  if (source === 'verified') return 'Verified mapping';
  if (source === 'unit_roster') return 'Unit roster';
  if (source === 'inferred') return 'Inferred';
  return 'Needs mapping';
}

function sourceTone(source: string) {
  if (source === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (source === 'unit_roster') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (source === 'inferred') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-rose-200 bg-rose-50 text-rose-800';
}

export function WaterMeterPerformance({
  propertyId,
  accounts,
  meters,
  canManage,
}: {
  propertyId: string | null;
  accounts: WaterServiceAccount[];
  meters: MeterWaterPerformance[];
  canManage: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const editing = editingId ? accountById.get(editingId) ?? null : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-[#dedbd1] bg-white shadow-sm" data-testid="water-meter-performance">
      <div className="flex flex-col justify-between gap-3 border-b border-[#dedbd1] px-5 py-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a8478]">Meter normalization</div>
          <h3 className="font-display text-2xl text-[#08271f]">Usage and dollars per meter</h3>
          <p className="mt-1 text-sm text-[#5c6863]">Every meter is tied to its connected units, occupied units, and verified or modeled population.</p>
        </div>
        {canManage && (
          <div className="rounded-2xl bg-[#F7F4EC] px-3 py-2 text-xs text-[#5c6863]">
            Use <Pencil className="mx-1 inline h-3.5 w-3.5" /> to verify each meter population.
          </div>
        )}
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {meters.map((meter) => (
          <article key={meter.accountId} className="rounded-2xl border border-[#e8e3d8] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-[#08271f]">{meter.buildingLabel}</div>
                <div className="mt-0.5 font-mono text-xs text-[#8a8478]">Meter {meter.meterNumber || 'not recorded'} · Acct {meter.accountNumber}</div>
              </div>
              {canManage && (
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => setEditingId(meter.accountId)} aria-label={`Edit ${meter.buildingLabel} meter population`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sourceTone(meter.allocationSource)}`}>{sourceLabel(meter.allocationSource)}</span>
              <span className="rounded-full border border-[#dedbd1] bg-[#F7F4EC] px-2.5 py-1 text-[11px] text-[#5c6863]">{meter.meterScope}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <MobileMetric label="Units / occupied" value={meter.connectedUnits == null ? '—' : `${meter.connectedUnits} / ${meter.occupiedUnits ?? '—'}`} />
              <MobileMetric label="Population" value={meter.residentCount == null ? '—' : `${Math.round(meter.residentCount)}${meter.residentCountIsModeled ? ' modeled' : ''}`} />
              <MobileMetric label="Unit intensity" value={shortMetric(meter.gallonsPerUnitDay, 'gal/unit/day')} />
              <MobileMetric label="Per capita" value={shortMetric(meter.gallonsPerCapitaDay, 'GPCD')} />
              <MobileMetric label="Cost intensity" value={meter.annualizedCostPerUnit == null ? '—' : `${money(meter.annualizedCostPerUnit)}/unit/yr`} />
              <MobileMetric label="Avoided cost" value={signedMoney(meter.avoidedCost)} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[#F7F4EC] text-[10px] uppercase tracking-wide text-[#7f7a70]">
            <tr>
              <th className="px-5 py-3 font-semibold">Meter / service</th>
              <th className="px-3 py-3 font-semibold">Population basis</th>
              <th className="px-3 py-3 text-right font-semibold">Units</th>
              <th className="px-3 py-3 text-right font-semibold">Occupied</th>
              <th className="px-3 py-3 text-right font-semibold">Population</th>
              <th className="px-3 py-3 text-right font-semibold">T12 gallons</th>
              <th className="px-3 py-3 text-right font-semibold">Gal/unit/day</th>
              <th className="px-3 py-3 text-right font-semibold">GPCD</th>
              <th className="px-3 py-3 text-right font-semibold">$/1k gal</th>
              <th className="px-3 py-3 text-right font-semibold">$/unit/year</th>
              <th className="px-3 py-3 text-right font-semibold">Avoided $</th>
              {canManage && <th className="w-14 px-3 py-3" />}
            </tr>
          </thead>
          <tbody>
            {meters.map((meter) => (
              <tr key={meter.accountId} className="border-t border-[#efe9da] align-top hover:bg-[#fcfbf7]">
                <td className="px-5 py-3">
                  <div className="font-semibold text-[#08271f]">{meter.buildingLabel}</div>
                  <div className="mt-0.5 text-xs text-[#8a8478]">{meter.serviceAddress}</div>
                  <div className="mt-1 font-mono text-[10px] text-[#8a8478]">Meter {meter.meterNumber || '—'} · Acct {meter.accountNumber}</div>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${sourceTone(meter.allocationSource)}`}>{sourceLabel(meter.allocationSource)}</span>
                  <div className="mt-1.5 text-[10px] capitalize text-[#8a8478]">{meter.meterScope} use</div>
                </td>
                <td className="px-3 py-3 text-right font-mono">{meter.connectedUnits ?? '—'}</td>
                <td className="px-3 py-3 text-right font-mono">{meter.occupiedUnits ?? '—'}</td>
                <td className="px-3 py-3 text-right font-mono">
                  {meter.residentCount == null ? '—' : Math.round(meter.residentCount)}
                  {meter.residentCountIsModeled && <div className="text-[9px] uppercase text-amber-700">modeled</div>}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs">{gallons(meter.actualGallons)}</td>
                <td className={`px-3 py-3 text-right font-mono ${meter.performanceBand === 'above_reference' ? 'text-rose-700' : 'text-[#08271f]'}`}>{shortMetric(meter.gallonsPerUnitDay, '')}</td>
                <td className="px-3 py-3 text-right font-mono">{shortMetric(meter.gallonsPerCapitaDay, '')}</td>
                <td className="px-3 py-3 text-right font-mono">{meter.costPerThousandGallons == null ? '—' : money(meter.costPerThousandGallons, 2)}</td>
                <td className="px-3 py-3 text-right font-mono">{meter.annualizedCostPerUnit == null ? '—' : money(meter.annualizedCostPerUnit)}</td>
                <td className={`px-3 py-3 text-right font-mono font-semibold ${(meter.avoidedCost ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{signedMoney(meter.avoidedCost)}</td>
                {canManage && (
                  <td className="px-3 py-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setEditingId(meter.accountId)} aria-label={`Edit ${meter.buildingLabel} meter population`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#dedbd1] bg-[#fffdf8] px-5 py-3 text-xs text-[#6d746f]">
        <MapPin className="mr-1 inline h-3.5 w-3.5" /> Unmapped meters keep their raw gallons and dollars, but per-unit and per-capita metrics remain blank until the served-unit count is verified.
      </div>

      <MeterProfileDialog
        propertyId={propertyId}
        account={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => { if (!open) setEditingId(null); }}
      />
    </section>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F7F4EC] px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#8a8478]">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-[#08271f]">{value}</div>
    </div>
  );
}

function MeterProfileDialog({
  propertyId,
  account,
  open,
  onOpenChange,
}: {
  propertyId: string | null;
  account: WaterServiceAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateWaterMeterProfile(propertyId);
  const [connected, setConnected] = useState('');
  const [occupied, setOccupied] = useState('');
  const [residents, setResidents] = useState('');
  const [asOf, setAsOf] = useState('');
  const [scope, setScope] = useState<'indoor' | 'mixed' | 'outdoor' | 'common'>('mixed');
  const [source, setSource] = useState<'verified' | 'unit_roster' | 'inferred' | 'unmapped'>('unmapped');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!account) return;
    setConnected(account.connected_units == null ? '' : String(account.connected_units));
    setOccupied(account.occupied_units == null ? '' : String(account.occupied_units));
    setResidents(account.resident_count == null ? '' : String(account.resident_count));
    setAsOf(account.occupancy_as_of ?? new Date().toISOString().slice(0, 10));
    setScope((account.meter_scope || 'mixed') as typeof scope);
    setSource((account.allocation_source || 'unmapped') as typeof source);
    setNotes(account.allocation_notes ?? '');
  }, [account]);

  const parseCount = (value: string) => value.trim() === '' ? null : Math.round(Number(value));

  async function save() {
    if (!account) return;
    await update.mutateAsync({
      accountId: account.id,
      connectedUnits: parseCount(connected),
      occupiedUnits: parseCount(occupied),
      residentCount: parseCount(residents),
      occupancyAsOf: asOf || null,
      meterScope: scope,
      allocationSource: source,
      allocationNotes: notes.trim() || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-[#08271f]">Verify meter population</DialogTitle>
        </DialogHeader>
        {account && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#F7F4EC] p-4">
              <div className="font-semibold text-[#08271f]">{account.building_label || account.service_address}</div>
              <div className="mt-1 font-mono text-xs text-[#6d746f]">Meter {account.meter_number || 'not recorded'} · Account {account.account_number}</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="meter-connected">Connected units</Label>
                <Input id="meter-connected" type="number" min="0" step="1" value={connected} onChange={(event) => setConnected(event.target.value)} placeholder="e.g. 48" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meter-occupied">Occupied units</Label>
                <Input id="meter-occupied" type="number" min="0" step="1" value={occupied} onChange={(event) => setOccupied(event.target.value)} placeholder="e.g. 42" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meter-residents">Residents</Label>
                <Input id="meter-residents" type="number" min="0" step="1" value={residents} onChange={(event) => setResidents(event.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
              <Users className="mr-1 inline h-3.5 w-3.5" /> If residents are blank, GPCD is clearly labeled as modeled at 2.0 residents per occupied unit. Enter the verified resident count whenever available.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Meter use</Label>
                <Select value={scope} onValueChange={(value) => setScope(value as typeof scope)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor only</SelectItem>
                    <SelectItem value="mixed">Mixed indoor / outdoor</SelectItem>
                    <SelectItem value="outdoor">Outdoor / irrigation</SelectItem>
                    <SelectItem value="common">Common area / non-unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mapping confidence</Label>
                <Select value={source} onValueChange={(value) => setSource(value as typeof source)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified against plans / roster</SelectItem>
                    <SelectItem value="unit_roster">Derived from unit roster</SelectItem>
                    <SelectItem value="inferred">Inferred — needs confirmation</SelectItem>
                    <SelectItem value="unmapped">Not mapped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meter-as-of">Occupancy as of</Label>
              <Input id="meter-as-of" type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meter-notes">Verification note</Label>
              <Textarea id="meter-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Identify the buildings, unit range, roster, drawing, or field verification used." />
            </div>

            <Button className="w-full bg-[#08271f] text-white hover:bg-[#123c31]" disabled={update.isPending} onClick={save}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> {update.isPending ? 'Recalculating…' : 'Save and recalculate analytics'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
