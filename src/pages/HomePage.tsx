import { HomeNav } from '@/components/home/HomeNav';
import { HomeHero } from '@/components/home/HomeHero';
import { HomePainPoints } from '@/components/home/HomePainPoints';
import { HomePlatform } from '@/components/home/HomePlatform';
import { HomeFeatures } from '@/components/home/HomeFeatures';
import { HomeWorkflow } from '@/components/home/HomeWorkflow';
import { HomeComparison } from '@/components/home/HomeComparison';
import { HomeRoles } from '@/components/home/HomeRoles';
import { HomeMobile } from '@/components/home/HomeMobile';
import { HomeSocialProof } from '@/components/home/HomeSocialProof';
import { HomePricing } from '@/components/home/HomePricing';
import { HomeFAQ } from '@/components/home/HomeFAQ';
import { HomeCTA } from '@/components/home/HomeCTA';
import { HomeFooter } from '@/components/home/HomeFooter';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      <HomeNav />
      <main>
        {/* 1. Hook */}
        <HomeHero />

        {/* 2. Pain — why you're tired of the current setup */}
        <HomePainPoints />

        {/* 3. Solution — meet the platform */}
        <HomePlatform />

        {/* 4. Proof of depth — the flagship capabilities */}
        <HomeFeatures />

        {/* 5. How it works — three-step flow */}
        <HomeWorkflow />

        {/* 6. Contrast — vs the old way (new) */}
        <HomeComparison />

        {/* 7. Who it serves — role-by-role value */}
        <HomeRoles />

        {/* 8. Mobile-first proof */}
        <HomeMobile />

        {/* 9. Social proof */}
        <HomeSocialProof />

        {/* 10. Price */}
        <HomePricing />

        {/* 11. Objections, handled */}
        <HomeFAQ />

        {/* 12. Close */}
        <HomeCTA />
      </main>
      <HomeFooter />
    </div>
  );
}
