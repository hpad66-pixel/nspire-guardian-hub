import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable';
import { Loader2, ShieldCheck, ClipboardList, Wrench, HardHat, BarChart3, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion } from 'framer-motion';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const features = [
  { icon: ShieldCheck,  color: 'hsl(var(--success))',            label: 'NSPIRE Compliance',          desc: 'Real-time scoring, defect tracking & audit-ready reports' },
  { icon: HardHat,      color: 'hsl(var(--accent))',             label: 'Construction Projects',       desc: 'RFIs, submittals, daily reports & client portals in one place' },
  { icon: ClipboardList,color: 'hsl(var(--module-projects))',    label: 'Daily Inspections',           desc: 'Grounds walkthroughs with photo evidence and voice notes' },
  { icon: Wrench,       color: 'hsl(var(--warning))',            label: 'Maintenance & Work Orders',   desc: 'Issue tracking from request to resolution, fully traced' },
  { icon: BarChart3,    color: 'hsl(var(--severity-severe))',    label: 'Operations Intelligence',     desc: 'Cross-module dashboards for every role in your org' },
  { icon: Building2,    color: 'hsl(var(--module-inspections))', label: 'Multi-Property Management',   desc: 'Manage your entire portfolio from a single command center' },
];

export default function AuthPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !loading) navigate('/dashboard');
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message.includes('Invalid login credentials') ? 'Invalid email or password. Please try again.' : error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (error) toast.error('Failed to sign in with Google. Please try again.');
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── LEFT: Brand panel ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-primary">

        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--accent)/0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)/0.15) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent)/0.18) 0%, transparent 70%)', filter: 'blur(56px)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(var(--module-projects)/0.14) 0%, transparent 70%)', filter: 'blur(48px)' }} />

        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          {/* APAS OS wordmark */}
          <div className="flex items-end gap-0 mb-8 select-none">
            <span
              className="font-black leading-none tracking-tight text-primary-foreground"
              style={{ fontSize: 'clamp(3rem, 4.5vw, 4rem)', letterSpacing: '-0.04em' }}
            >
              APAS
            </span>
            <span
              className="font-black leading-none tracking-tight ml-2"
              style={{
                fontSize: 'clamp(3rem, 4.5vw, 4rem)',
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--module-inspections)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              OS
            </span>
          </div>

          {/* OS descriptor badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-7"
            style={{
              background: 'hsl(var(--accent)/0.18)',
              border: '1px solid hsl(var(--accent)/0.30)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase text-accent">
              Operating System for Property &amp; Construction
            </span>
          </div>

          {/* Tagline */}
          <h2 className="font-bold text-primary-foreground mb-4 leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.6rem)', letterSpacing: '-0.02em' }}>
            Run the Job.{' '}
            <span className="text-success">Pass the Audit.</span>
          </h2>
          <p className="text-primary-foreground/60 text-base leading-relaxed max-w-md">
            One integrated platform for inspections, compliance, project management,
            maintenance, and team operations — built for property managers and construction teams.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 grid grid-cols-2 gap-3 mt-10"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 + i * 0.07 }}
              className="flex items-start gap-3 p-3.5 rounded-xl"
              style={{
                background: 'hsl(var(--primary-foreground)/0.04)',
                border: '1px solid hsl(var(--primary-foreground)/0.08)',
              }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `color-mix(in srgb, ${f.color} 15%, transparent)` }}
              >
                <f.icon style={{ color: f.color, width: 15, height: 15 }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-foreground mb-0.5">{f.label}</p>
                <p className="text-xs text-primary-foreground/50 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="relative z-10 mt-8">
          <p className="text-xs text-primary-foreground/35">
            © 2025 APAS OS · apasos.ai · All rights reserved
          </p>
        </div>
      </div>

      {/* ── RIGHT: Sign-in form ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background border-l border-border">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Mobile wordmark */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="flex items-end gap-1 mb-2 select-none">
              <span className="font-black text-4xl tracking-tight text-foreground" style={{ letterSpacing: '-0.04em' }}>
                APAS
              </span>
              <span
                className="font-black text-4xl tracking-tight ml-1"
                style={{
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--module-inspections)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                OS
              </span>
            </div>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Operating System</p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Sign in to access your APAS OS dashboard
              </p>
            </div>

            {/* Google */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl text-sm font-medium border border-border bg-background text-foreground transition-colors hover:bg-muted mb-5 disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or continue with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-60"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  'Sign In to APAS OS'
                )}
              </button>
            </form>

            <p className="text-xs text-center mt-5 text-muted-foreground">
              Access is by invitation only.{' '}
              <span className="text-foreground font-medium">Contact your administrator</span> for access.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
