import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { ValueProposition } from '@/components/landing/ValueProposition';
import { PlatformOverview } from '@/components/features/PlatformOverview';
import { ModuleShowcase } from '@/components/features/ModuleShowcase';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { RoleValueSection } from '@/components/features/RoleValueSection';
import { MobilePWASection } from '@/components/landing/MobilePWASection';
import { EnterpriseFeatures } from '@/components/features/EnterpriseFeatures';
import { PricingSection } from '@/components/landing/PricingSection';
import { RoadmapSection } from '@/components/landing/RoadmapSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--apas-midnight)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--apas-sapphire)' }} />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--apas-midnight)', minHeight: '100vh' }}>
      <LandingNav />
      <main>
        <LandingHero />
        <ValueProposition />
        <PlatformOverview />
        <ModuleShowcase />
        <FeatureGrid />
        <RoleValueSection />
        <MobilePWASection />
        <EnterpriseFeatures />
        <PricingSection />
        <RoadmapSection />
      </main>
      <LandingFooter />
    </div>
  );
}
