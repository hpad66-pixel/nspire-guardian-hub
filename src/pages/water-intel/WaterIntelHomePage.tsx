import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { WaterIntelDashboard } from '@/components/water-intel/WaterIntelDashboard';
import { useWaterIntelAdmin } from '@/hooks/useWaterIntelligence';

export default function WaterIntelHomePage() {
  const { data = [], isLoading } = useWaterIntelAdmin();
  const enabled = useMemo(
    () => [...data].filter((p: any) => p.water_intel_enabled),
    [data],
  );
  const defaultId = useMemo(() => {
    const glorieta = enabled.find((p: any) => String(p.name || '').toLowerCase().includes('glorieta'));
    return (glorieta ?? enabled[0])?.id as string | undefined;
  }, [enabled]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const propertyId = selectedId ?? defaultId ?? null;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 pb-16" data-testid="water-intel-home">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">Standalone module</div>
          <h1 className="font-display text-4xl text-[#08271f]">Water Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5c6863]">
            Executive water/sewer ledger for the whole property — trends, every ingested bill, and a live QA check.
          </p>
        </div>
        <Link to="/admin/water-intelligence" className="text-sm font-semibold text-[#1D6FE8] underline">
          Admin / magic links
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : enabled.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#dedbd1] p-10 text-center text-sm text-[#8a8478]">
          No properties have Water Intelligence enabled yet.{' '}
          <Link to="/admin/water-intelligence" className="text-[#1D6FE8] underline">Enable it for a client</Link>.
        </div>
      ) : (
        <>
          {enabled.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {enabled.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                    propertyId === p.id
                      ? 'border-[#08271f] bg-[#08271f] text-white'
                      : 'border-[#dedbd1] bg-white text-[#08271f]'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {propertyId && <WaterIntelDashboard scope={{ propertyId }} mode="staff" />}
        </>
      )}
    </div>
  );
}
