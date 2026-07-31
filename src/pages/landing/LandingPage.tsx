/**
 * Landing v3 — projos.ai marketing homepage.
 * Dark hero → light body → dark signature sections, alternating for rhythm.
 * Entirely self-contained (see ./shared.tsx); replaces LandingPageAlt via RootRedirect.
 */
import { C } from './shared';
import { LandingNav } from './sections/LandingNav';
import { LandingHero } from './sections/LandingHero';
import { ProblemSection } from './sections/ProblemSection';
import { PlatformTour } from './sections/PlatformTour';
import { CascadeSection } from './sections/CascadeSection';
import { AISection } from './sections/AISection';
import { HumanInLoop } from './sections/HumanInLoop';
import { VoiceSection } from './sections/VoiceSection';
import { CompareSection } from './sections/CompareSection';
import { ModularSection } from './sections/ModularSection';
import { EnterpriseStrip } from './sections/EnterpriseStrip';
import { FinalCTA, LandingFooter } from './sections/FinalCTA';

export default function LandingPage() {
  return (
    <div style={{ background: C.obsidian, minHeight: '100vh', scrollBehavior: 'smooth' }}>
      <LandingNav />
      <main>
        <LandingHero />
        <ProblemSection />
        <PlatformTour />
        <CascadeSection />
        <AISection />
        <HumanInLoop />
        <VoiceSection />
        <CompareSection />
        <ModularSection />
        <EnterpriseStrip />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
