import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft } from 'lucide-react';
import { FeatureHero } from '@/components/features/FeatureHero';
import { PainPointsGrid } from '@/components/features/PainPointsGrid';
import { PlatformOverview } from '@/components/features/PlatformOverview';
import { ModuleShowcase } from '@/components/features/ModuleShowcase';
import { RoleValueSection } from '@/components/features/RoleValueSection';
import { EnterpriseFeatures } from '@/components/features/EnterpriseFeatures';
import { FeaturesCTA } from '@/components/features/FeaturesCTA';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Glorieta Gardens</h1>
                <p className="text-xs text-muted-foreground">Property Management</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-16">
        <FeatureHero />
        <PainPointsGrid />
        <PlatformOverview />
        <ModuleShowcase />
        <RoleValueSection />
        <EnterpriseFeatures />
        <FeaturesCTA />
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Glorieta Gardens Apartments</p>
                <p className="text-sm text-muted-foreground">Property Operations Platform</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Glorieta Gardens. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
