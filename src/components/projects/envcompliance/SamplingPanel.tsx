import { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MapPin, FlaskConical, AlertTriangle, TrendingUp, Plus, Trash2, Loader2, Droplets } from 'lucide-react';
import { useSamplingLocations, useSamplingResults, computeExceedance } from '@/hooks/useSampling';
import { cn } from '@/lib/utils';

const PARAMS = ['pH', 'TSS', 'BOD', 'COD', 'Oil & Grease', 'Turbidity', 'Dissolved Oxygen', 'Total Nitrogen', 'Total Phosphorus', 'Ammonia', 'Nitrate', 'Fecal Coliform', 'E. coli', 'Flow', 'Temperature', 'Conductivity', 'Lead', 'Copper', 'Zinc'];
const UNITS = ['mg/L', 'µg/L', 'NTU', 'SU', 'MPN/100mL', 'CFU/100mL', '°C', 'µS/cm', 'MGD', 'GPM'];
const LIMIT_TYPES = [{ v: 'daily_max', l: 'Daily max' }, { v: 'monthly_avg', l: 'Monthly avg' }, { v: 'instantaneous', l: 'Instantaneous' }];
const LOC_TYPES = ['outfall', 'monitoring_well', 'surface_water', 'influent', 'effluent', 'groundwater', 'other'];
const fmtDate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
const num = (s: string): number | null => { const v = parseFloat(s); return Number.isFinite(v) ? v : null; };

export function SamplingPanel({ projectId }: { projectId: string }) {
  const locations = useSamplingLocations(projectId);
  const results = useSamplingResults(projectId);
  const locs = locations.data ?? [];
  const rows = results.data ?? [];

  const [locOpen, setLocOpen] = useState(false);
  const [loc, setLoc] = useState({ name: '', code: '', location_type: 'outfall', latitude: '', longitude: '' });

  // add-result form
  const [r, setR] = useState({ location_id: '', sample_date: new Date().toISOString().slice(0, 10), parameter: '', value: '', unit: 'mg/L', permit_limit: '', permit_limit_type: 'daily_max' });

  const params = useMemo(() => [...new Set(rows.map((x) => x.parameter))], [rows]);
  const [trendParam, setTrendParam] = useState<string>('');
  const activeParam = trendParam || params[0] || '';
  const [trendLoc, setTrendLoc] = useState<string>('all');

  const exceedances = rows.filter((x) => x.is_exceedance);

  const trend = useMemo(() => {
    const filtered = rows.filter((x) => x.parameter === activeParam && (trendLoc === 'all' || x.location_id === trendLoc) && x.value != null);
    const limit = filtered.map((x) => x.permit_limit).filter((v) => v != null).slice(-1)[0] ?? null;
    const data = [...filtered].sort((a, b) => (a.sample_date < b.sample_date ? -1 : 1)).map((x) => ({ date: fmtDate(x.sample_date), value: Number(x.value), exc: x.is_exceedance }));
    return { data, limit };
  }, [rows, activeParam, trendLoc]);

  const addLocation = () => {
    if (!loc.name.trim()) return;
    locations.create.mutate({ name: loc.name.trim(), code: loc.code.trim() || null, location_type: loc.location_type, latitude: num(loc.latitude), longitude: num(loc.longitude) } as any, {
      onSuccess: () => { setLoc({ name: '', code: '', location_type: 'outfall', latitude: '', longitude: '' }); setLocOpen(false); },
    });
  };

  const addResult = () => {
    if (!r.location_id || !r.parameter.trim() || !r.sample_date) return;
    results.create.mutate({
      location_id: r.location_id, sample_date: r.sample_date, parameter: r.parameter.trim(),
      value: num(r.value), unit: r.unit || null, permit_limit: num(r.permit_limit), permit_limit_type: r.permit_limit_type,
    } as any, { onSuccess: () => setR((p) => ({ ...p, parameter: '', value: '', permit_limit: '' })) });
  };

  const preview = computeExceedance(num(r.value), num(r.permit_limit));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MapPin} label="Locations" value={String(locs.length)} />
        <Stat icon={FlaskConical} label="Results" value={String(rows.length)} />
        <Stat icon={Droplets} label="Parameters" value={String(params.length)} />
        <Stat icon={AlertTriangle} label="Exceedances" value={String(exceedances.length)} tone={exceedances.length ? 'text-[var(--apas-rose)]' : undefined} />
      </div>

      {/* Locations */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><MapPin className="h-4 w-4 text-[var(--apas-sapphire)]" />Monitoring locations</div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setLocOpen(true)}><Plus className="h-4 w-4" />Add location</Button>
        </div>
        {locs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No locations yet. Add outfalls, monitoring wells, or sample points — with coordinates, so maps come free later.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locs.map((l) => (
              <div key={l.id} className="group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                <span className="font-medium">{l.code ? `${l.code} · ` : ''}{l.name}</span>
                {l.location_type && <Badge variant="secondary" className="text-[10px]">{l.location_type.replace('_', ' ')}</Badge>}
                {l.latitude != null && l.longitude != null && <span className="text-[10px] text-muted-foreground">{l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}</span>}
                <button className="text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => locations.remove.mutate(l.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add result */}
      {locs.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><FlaskConical className="h-4 w-4 text-[var(--apas-sapphire)]" />Record a result</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            <Select value={r.location_id} onValueChange={(v) => setR({ ...r, location_id: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>{locs.map((l) => <SelectItem key={l.id} value={l.id}>{l.code ? `${l.code} · ` : ''}{l.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" className="h-9" value={r.sample_date} onChange={(e) => setR({ ...r, sample_date: e.target.value })} />
            <Input className="h-9" list="param-list" placeholder="Parameter" value={r.parameter} onChange={(e) => setR({ ...r, parameter: e.target.value })} />
            <datalist id="param-list">{PARAMS.map((p) => <option key={p} value={p} />)}</datalist>
            <Input className="h-9" inputMode="decimal" placeholder="Value" value={r.value} onChange={(e) => setR({ ...r, value: e.target.value })} />
            <Select value={r.unit} onValueChange={(v) => setR({ ...r, unit: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Unit" /></SelectTrigger>
              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="h-9" inputMode="decimal" placeholder="Permit limit" value={r.permit_limit} onChange={(e) => setR({ ...r, permit_limit: e.target.value })} />
            <Select value={r.permit_limit_type} onValueChange={(v) => setR({ ...r, permit_limit_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{LIMIT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs">
              {num(r.value) != null && num(r.permit_limit) != null && (
                preview.is_exceedance
                  ? <span className="text-[var(--apas-rose)] font-medium">⚠ Exceedance — {preview.exceedance_percent}% over limit</span>
                  : <span className="text-[var(--apas-emerald)]">Within limit</span>
              )}
            </div>
            <Button size="sm" className="h-8 gap-1.5" onClick={addResult} disabled={results.create.isPending || !r.location_id || !r.parameter.trim()}>
              {results.create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add result
            </Button>
          </div>
        </div>
      )}

      {/* Trend chart */}
      {params.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-[var(--apas-sapphire)]" />Parameter trend</div>
            <div className="flex items-center gap-2">
              <Select value={activeParam} onValueChange={setTrendParam}><SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{params.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              <Select value={trendLoc} onValueChange={setTrendLoc}><SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{locs.map((l) => <SelectItem key={l.id} value={l.id}>{l.code || l.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          {trend.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend.data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} />
                <Tooltip />
                {trend.limit != null && <ReferenceLine y={trend.limit} stroke="#F43F5E" strokeDasharray="4 4" label={{ value: `Limit ${trend.limit}`, fontSize: 10, fill: '#F43F5E', position: 'insideTopRight' }} />}
                <Line type="monotone" dataKey="value" stroke="#1D6FE8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No numeric results for {activeParam} yet.</div>}
        </div>
      )}

      {/* Results table */}
      {rows.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b px-4 py-3 text-sm font-semibold">Results <span className="font-normal text-muted-foreground">· {rows.length}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                <th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Location</th><th className="px-4 py-2 font-medium">Parameter</th><th className="px-4 py-2 font-medium text-right">Result</th><th className="px-4 py-2 font-medium text-right">Limit</th><th className="px-4 py-2 font-medium"></th><th className="px-4 py-2"></th>
              </tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id} className={cn('border-b last:border-0 group', x.is_exceedance && 'bg-[var(--apas-rose)]/[0.04]')}>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(x.sample_date)}</td>
                    <td className="px-4 py-2">{x.location?.code || x.location?.name || '—'}</td>
                    <td className="px-4 py-2 font-medium">{x.parameter}</td>
                    <td className={cn('px-4 py-2 text-right tabular-nums font-semibold', x.is_exceedance && 'text-[var(--apas-rose)]')}>{x.value ?? '—'} {x.unit}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{x.permit_limit ?? '—'}{x.permit_limit_type ? ` (${x.permit_limit_type.replace('_', ' ')})` : ''}</td>
                    <td className="px-4 py-2">{x.is_exceedance && <Badge className="bg-[var(--apas-rose)]/10 text-[var(--apas-rose)] text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />+{x.exceedance_percent}%</Badge>}</td>
                    <td className="px-4 py-2 text-right"><button className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => results.remove.mutate(x.id)}><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add location dialog */}
      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Add monitoring location</DialogTitle><DialogDescription>Coordinates are optional now but unlock maps and contours later.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name *" value={loc.name} onChange={(e) => setLoc({ ...loc, name: e.target.value })} />
              <Input placeholder="Code (MW-3)" value={loc.code} onChange={(e) => setLoc({ ...loc, code: e.target.value })} />
            </div>
            <Select value={loc.location_type} onValueChange={(v) => setLoc({ ...loc, location_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input inputMode="decimal" placeholder="Latitude" value={loc.latitude} onChange={(e) => setLoc({ ...loc, latitude: e.target.value })} />
              <Input inputMode="decimal" placeholder="Longitude" value={loc.longitude} onChange={(e) => setLoc({ ...loc, longitude: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocOpen(false)}>Cancel</Button>
            <Button onClick={addLocation} disabled={!loc.name.trim() || locations.create.isPending}>{locations.create.isPending ? 'Adding…' : 'Add location'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium uppercase tracking-wide"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className={cn('mt-1 text-xl font-bold tracking-tight', tone)}>{value}</div>
    </div>
  );
}
