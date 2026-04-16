import { HomeNav } from '@/components/home/HomeNav';
import { HomeHero } from '@/components/home/HomeHero';
import { HomePainPoints } from '@/components/home/HomePainPoints';
import { HomePlatform } from '@/components/home/HomePlatform';
import { HomeFeatures } from '@/components/home/HomeFeatures';
import { HomeWorkflow } from '@/components/home/HomeWorkflow';
import { HomeRoles } from '@/components/home/HomeRoles';
import { HomeMobile } from '@/components/home/HomeMobile';
import { HomeSocialProof } from '@/components/home/HomeSocialProof';
import { HomePricing } from '@/components/home/HomePricing';
import { HomeCTA } from '@/components/home/HomeCTA';
import { HomeFooter } from '@/components/home/HomeFooter';

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      <HomeNav />
      <main>
        <HomeHero />
        <HomePainPoints />
        <HomePlatform />
        <HomeFeatures />
        <HomeWorkflow />
        <HomeRoles />
        <HomeMobile />
        <HomeSocialProof />
        <HomePricing />
        <HomeCTA />
      </main>
      <HomeFooter />
    </div>
  );
}
