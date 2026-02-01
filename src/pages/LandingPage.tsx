import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  ClipboardCheck, 
  Shield, 
  Users, 
  ArrowRight,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

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

  const features = [
    {
      icon: ClipboardCheck,
      title: 'Daily Inspections',
      description: 'Streamline property inspections with digital checklists and photo documentation.'
    },
    {
      icon: Shield,
      title: 'Compliance Tracking',
      description: 'Stay ahead of NSPIRE requirements with automated compliance monitoring.'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Coordinate staff, assign tasks, and track work orders efficiently.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>

        {/* Navigation */}
        <nav className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Glorieta Gardens</h1>
                <p className="text-xs text-muted-foreground">Property Management</p>
              </div>
            </div>
            <Link to="/auth">
              <Button>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="container mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <CheckCircle className="h-4 w-4" />
                Property Management Platform
              </span>
              
              <h2 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Welcome to{' '}
                <span className="text-primary">Glorieta Gardens</span>{' '}
                Apartments
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                A comprehensive property inspection and management platform designed to streamline 
                operations, ensure compliance, and maintain excellence in property care.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth">
                  <Button size="lg" className="text-lg px-8 py-6">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to manage inspections, track compliance, and coordinate your team.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h4>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center bg-primary/5 rounded-3xl p-12 border border-primary/10"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to get started?
            </h3>
            <p className="text-muted-foreground mb-8">
              Sign in to access your property management dashboard and start streamlining your operations.
            </p>
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Sign In Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                © 2026 Glorieta Gardens Apartments. All rights reserved.
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Property Management System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
