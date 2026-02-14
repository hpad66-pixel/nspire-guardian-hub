import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { ValueProposition } from '@/components/landing/ValueProposition';
import { PlatformOverview } from '@/components/features/PlatformOverview';
import { VoiceAgentShowcase } from '@/components/landing/VoiceAgentShowcase';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { RoleValueSection } from '@/components/features/RoleValueSection';
import { EnterpriseFeatures } from '@/components/features/EnterpriseFeatures';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <LandingHero />
        <ValueProposition />
        <PlatformOverview />
        <VoiceAgentShowcase />
        <FeatureGrid />
        <RoleValueSection />
        <section id="security">
          <EnterpriseFeatures />
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
