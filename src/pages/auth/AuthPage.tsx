import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AUTH0_ENABLED } from '@/lib/auth/auth0';
import { Loader2, Landmark, Siren, FileCheck2, Leaf, Headphones, FileSearch } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion } from 'framer-motion';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const features = [
  { icon: Landmark,   color: 'hsl(var(--accent))',             label: 'Financial Control',       desc: 'Contracts, changes, pay applications, payments, retainage, and reports' },
  { icon: Siren,      color: 'hsl(var(--severity-severe))',    label: 'Risk & Critical Alerts', desc: 'Responsible parties, deadlines, escalation, and evidence in one record' },
  { icon: FileCheck2, color: 'hsl(var(--module-inspections))', label: 'Permits & Regulatory',   desc: 'Obligations, inspections, agency correspondence, and closeout' },
  { icon: Leaf,       color: 'hsl(var(--success))',            label: 'Environmental Control', desc: 'Sampling, observations, exceedances, and corrective actions' },
  { icon: Headphones, color: 'hsl(var(--module-projects))',    label: 'Voice & Work Orders',    desc: 'Calls become transcripts, assignments, alerts, and accountable action' },
  { icon: FileSearch, color: 'hsl(var(--warning))',            label: 'Defensible Documents',  desc: 'Photos, approvals, correspondence, reports, and audit history' },
];

export default function AuthPage() {
  const { user, loading, signIn, signInWithAuth0 } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPath = searchParams.get('next');
  const safeNext = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : null;
  const isClientPortal = searchParams.get('portal') === 'client' || safeNext?.startsWith('/owner-portal') === true;
  const destination = safeNext ?? (isClientPortal ? '/owner-portal' : '/dashboard');
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [auth0Pending, setAuth0Pending]   = useState<'login' | 'signup' | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(!AUTH0_ENABLED);
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !loading) navigate(destination, { replace: true });
  }, [user, loading, navigate, destination]);

  // The Auth0 callback function redirects failures back here with a message it
  // has already made safe to show (no client ids, no Auth0 internals).
  const authError = searchParams.get('error');
  const authErrorMessage = searchParams.get('message');
  useEffect(() => {
    if (!authError) return;
    toast.error(authErrorMessage || 'Sign-in could not be completed. Please try again.');
  }, [authError, authErrorMessage]);

  const handleAuth0 = async (mode: 'login' | 'signup') => {
    setAuth0Pending(mode);
    const { error } = await signInWithAuth0({ mode, next: safeNext ?? undefined });
    // On success the browser is already navigating to Auth0; only a failure
    // returns here, so the pending state is cleared exactly when it should be.
    if (error) {
      toast.error(error.message);
      setAuth0Pending(null);
    }
  };

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
      navigate(destination, { replace: true });
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
          {/* APAS Project Controls wordmark */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3 select-none">
            <span
              className="font-black leading-none tracking-tight text-primary-foreground"
              style={{ fontSize: 'clamp(3rem, 4.5vw, 4.2rem)', letterSpacing: '-0.04em' }}
            >
              APAS
            </span>
            <span
              className="font-semibold leading-none tracking-tight"
              style={{
                fontSize: 'clamp(1.9rem, 3vw, 2.75rem)',
                letterSpacing: '-0.035em',
                color: 'hsl(var(--accent))',
              }}
            >
              Project Controls
            </span>
          </div>

          {/* Tagline */}
          <p className="text-primary-foreground/70 font-semibold tracking-[0.22em] uppercase mb-7"
            style={{ fontSize: '0.78rem', letterSpacing: '0.22em' }}>
            Powered by projOS
          </p>

          {/* OS descriptor badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-7"
            style={{
              background: 'hsl(var(--accent)/0.18)',
              border: '1px solid hsl(var(--accent)/0.30)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase text-accent">
              Private infrastructure command center
            </span>
          </div>

          {/* Tagline */}
          <h2 className="font-bold text-primary-foreground mb-4 leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.6rem)', letterSpacing: '-0.02em' }}>
            See every project.{' '}
            <span className="text-accent">Prove every decision.</span>
          </h2>
          <p className="text-primary-foreground/60 text-base leading-relaxed max-w-md">
            One operating record for financial control, field work, emergency response,
            permits, environmental compliance, inspections, and owner-ready documentation.
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
            © 2026 APAS Consulting · Project Controls · projos.ai
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
            <div className="flex flex-wrap items-baseline justify-center gap-x-2 mb-1.5 select-none">
              <span className="font-black text-4xl tracking-tight text-foreground" style={{ letterSpacing: '-0.04em' }}>
                APAS
              </span>
              <span
                className="font-semibold text-2xl tracking-tight text-accent"
                style={{
                  letterSpacing: '-0.03em',
                }}
              >
                Project Controls
              </span>
            </div>
            <p className="text-xs font-bold tracking-[0.22em] uppercase text-muted-foreground mb-1">Powered by projOS</p>
            <p className="text-xs text-muted-foreground text-center">Private project-control workspace</p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
                {isClientPortal ? 'Secure client access' : 'Welcome back'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isClientPortal
                  ? 'Sign in with the account connected to your private project portal'
                  : AUTH0_ENABLED
                    ? 'One APAS ID signs you in to APAS Project Controls and every connected product'
                    : 'Sign in to access your APAS Project Controls workspace'}
              </p>
            </div>

            {/* APAS ID (Auth0 Universal Login) — the front door across products */}
            {AUTH0_ENABLED && (
              <div className="space-y-3">
                <button
                  type="button" onClick={() => handleAuth0('login')} disabled={auth0Pending !== null}
                  className="w-full h-12 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {auth0Pending === 'login'
                    ? (<><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</>)
                    : ('Continue with APAS ID')}
                </button>

                {!isClientPortal && (
                  <button
                    type="button" onClick={() => handleAuth0('signup')} disabled={auth0Pending !== null}
                    className="w-full h-12 rounded-xl text-sm font-semibold text-foreground bg-background border border-input transition-colors hover:bg-muted disabled:opacity-60 flex items-center justify-center gap-2">
                    {auth0Pending === 'signup'
                      ? (<><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</>)
                      : ('Start a new workspace')}
                  </button>
                )}

                {!showPasswordForm && (
                  <button
                    type="button" onClick={() => setShowPasswordForm(true)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1">
                    Use an email and password instead
                  </button>
                )}
              </div>
            )}

            {AUTH0_ENABLED && showPasswordForm && (
              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            {/* Form */}
            {showPasswordForm && (
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                  <input
                    type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    placeholder="you@example.com" required disabled={isSubmitting}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-60"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
                  </div>
                  <input
                    type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••" required disabled={isSubmitting}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-60"
                  />
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full h-12 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                  {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>) : ('Sign in to projOS')}
                </button>
            </form>
            )}

            {!isClientPortal && <p className="text-xs text-center mt-5 text-muted-foreground">
              {AUTH0_ENABLED
                ? 'Invited to an existing workspace? Open the private invitation your administrator sent you.'
                : 'New accounts are created by a Proj OS administrator and activated from a private invitation.'}
            </p>}
            {isClientPortal && (
              <p className="text-xs text-center mt-5 text-muted-foreground">
                First visit? Open the private invitation your project team sent you. No separate registration is required.
              </p>
            )}
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
