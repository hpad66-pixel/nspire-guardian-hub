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
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F8FAFC', minHeight: '100vh' }}>
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
