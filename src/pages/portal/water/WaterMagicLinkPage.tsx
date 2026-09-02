import { useParams } from 'react-router-dom';
import { WaterIntelDashboard } from '@/components/water-intel/WaterIntelDashboard';

export default function WaterMagicLinkPage() {
  const { token } = useParams<{ token: string }>();
  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#08271f]" data-testid="water-magic-page">
      <div className="border-b border-[#dedbd1] bg-[#fffdf8]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a8478]">projOS · APAS</div>
            <div className="font-display text-xl">Water Intelligence</div>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#C4A35A]">Executive briefing</div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20">
        <WaterIntelDashboard scope={{ token }} mode="magic" />
      </main>
    </div>
  );
}
