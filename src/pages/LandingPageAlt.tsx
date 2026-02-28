import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { AltNav } from '@/components/alt/AltNav';
import { AltHero } from '@/components/alt/AltHero';
import { AltPainPoints } from '@/components/alt/AltPainPoints';
import { AltSolution } from '@/components/alt/AltSolution';
import { AltFeatures } from '@/components/alt/AltFeatures';
import { AltRoles } from '@/components/alt/AltRoles';
import { AltPricing } from '@/components/alt/AltPricing';
import { AltSocialProof } from '@/components/alt/AltSocialProof';
import { AltPWA } from '@/components/alt/AltPWA';
import { AltFinalCTA } from '@/components/alt/AltFinalCTA';
import { AltFooter } from '@/components/alt/AltFooter';

export default function LandingPageAlt() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--apas-cream, #FDFAF4)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'var(--apas-cream, #FDFAF4)', minHeight: '100vh' }}>
      <AltNav />
      <main>
        <AltHero />
        <AltPainPoints />
        <AltSolution />
        <AltFeatures />
        <AltRoles />
        <AltPricing />
        <AltSocialProof />
        <AltPWA />
        <AltFinalCTA />
      </main>
      <AltFooter />
    </div>
  );
}
