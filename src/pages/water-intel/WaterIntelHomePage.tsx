import { Link } from 'react-router-dom';
import { Droplets, Loader2 } from 'lucide-react';
import { useWaterIntelAdmin } from '@/hooks/useWaterIntelligence';

export default function WaterIntelHomePage() {
  const { data = [], isLoading } = useWaterIntelAdmin();
  const enabled = data.filter((p: any) => p.water_intel_enabled);

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8" data-testid="water-intel-home">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">Standalone module</div>
        <h1 className="font-display text-4xl text-[#08271f]">Water Intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#5c6863]">
          Executive water/sewer brief for any client. Open a live property or turn the module on from Admin.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : enabled.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#dedbd1] p-10 text-center text-sm text-[#8a8478]">
          No properties have Water Intelligence enabled yet.{' '}
          <Link to="/admin/water-intelligence" className="text-[#1D6FE8] underline">Enable it for a client</Link>.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {enabled.map((p: any) => (
            <Link
              key={p.id}
              to={`/water-intel/${p.id}`}
              className="rounded-3xl border border-[#dedbd1] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C4A35A]/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08271f] text-[#d5aa52]">
                <Droplets className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold text-[#08271f]">{p.name}</div>
              <div className="text-sm text-[#8a8478]">{[p.city, p.state].filter(Boolean).join(', ') || 'Managed property'}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
