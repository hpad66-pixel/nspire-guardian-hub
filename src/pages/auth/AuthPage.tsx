import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AUTH0_ENABLED } from '@/lib/auth/auth0';
import { Loader2, Landmark, Siren, FileCheck2, Headphones, FileSearch, ShieldCheck, ArrowRight, HardHat, Users } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const features = [
  { icon: Landmark,   color: '#E2BD76', label: 'Money control',       desc: 'Proposals, pay apps, invoices, subcontractor caps, approvals, and reports' },
  { icon: Siren,      color: '#F18C6A', label: 'Risk visibility',      desc: 'Open issues, deadlines, escalation, responsibility, and proof in one record' },
  { icon: FileCheck2, color: '#7EC8BE', label: 'Decision history',     desc: 'Permits, signoffs, correspondence, client comments, and closeout trail' },
  { icon: Headphones, color: '#8CA9FF', label: 'Voice to workflow',    desc: 'Calls become transcripts, tickets, assignments, and accountable action' },
  { icon: FileSearch, color: '#F4D58D', label: 'Defensible evidence',  desc: 'Photos, reports, source files, letter packages, and audit history' },
  { icon: ShieldCheck, color: '#9AE6B4', label: 'Private access',      desc: 'Workspace identity, client portals, tenant boundaries, and role based views' },
];

const signalRows = [
  ['Voice call', 'MR-1042', 'Urgent ticket created'],
  ['Proposal', '$53,000', 'Billing guardrail active'],
  ['Site walk', '27 photos', 'Before proof saved'],
  ['Client portal', 'Secure', 'Owner view updated'],
];

type AccessMode = 'team' | 'client' | 'partner';

const ACCESS_MODES: Record<AccessMode, {
  title: string;
  eyebrow: string;
  description: string;
  destination: string;
  icon: typeof Users;
}> = {
  client: {
    title: 'Client / Owner',
    eyebrow: 'Private project portal',
    description: 'Approvals, reports, updates, pay apps, documents, and walkthrough proof.',
    destination: '/owner-portal',
    icon: ShieldCheck,
  },
  team: {
    title: 'APAS Team',
    eyebrow: 'Internal workspace',
    description: 'Projects, proposals, invoices, field work, messages, and admin controls.',
    destination: '/dashboard',
    icon: Users,
  },
  partner: {
    title: 'Contractor / Partner',
    eyebrow: 'Vendor workspace',
    description: 'Commitments, invoices, RFIs, submittals, punch lists, and required documents.',
    destination: '/sub-portal',
    icon: HardHat,
  },
};

function modeFromParams(portal: string | null, next: string | null): AccessMode {
  if (portal === 'client' || next?.startsWith('/owner-portal')) return 'client';
  if (portal === 'partner' || portal === 'subcontractor' || next?.startsWith('/sub-portal')) return 'partner';
  return 'team';
}

export default function AuthPage() {
  const { user, loading, signIn, signInWithAuth0 } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedPath = searchParams.get('next');
  const safeNext = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : null;
  const [accessMode, setAccessMode] = useState<AccessMode>(() => modeFromParams(searchParams.get('portal'), safeNext));
  const selectedAccess = ACCESS_MODES[accessMode];
  const isClientPortal = accessMode === 'client';
  const isPartnerPortal = accessMode === 'partner';
  const safeNextMode = safeNext ? modeFromParams(null, safeNext) : null;
  const destination = safeNext && safeNextMode === accessMode ? safeNext : selectedAccess.destination;
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
    const { error } = await signInWithAuth0({ mode, next: destination });
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
    <div className="min-h-screen flex bg-[#f3f0e8]">

      {/* ── LEFT: Proj OS brand panel ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-[#061f1a]">
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(rgba(226,189,118,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(226,189,118,.12) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
          }}
        />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(90deg,rgba(6,31,26,0),rgba(15,96,121,.18))] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="mb-8 inline-flex items-center gap-3 text-[#f8f4e8]">
            <div className="grid h-12 w-12 place-items-center border border-[#e2bd76]/45 bg-[#e2bd76]/10 text-[11px] font-black tracking-[0.14em] text-[#e2bd76]">
              POS
            </div>
            <div>
              <div className="font-display text-4xl font-medium leading-none tracking-normal">Proj OS</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#c8d8d1]">
                Project intelligence workspace
              </div>
            </div>
          </div>

          <p className="mb-5 inline-flex items-center gap-2 border border-[#e2bd76]/35 bg-[#e2bd76]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#e2bd76]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#77e0b3]" />
            Secure operating record
          </p>

          <h2 className="max-w-xl font-display text-6xl font-medium leading-[0.95] tracking-normal text-[#fffaf0] xl:text-7xl">
            Sign in where project truth becomes usable.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#c8d8d1]">
            Proj OS connects consulting work, construction controls, voice intake, field proof,
            financial packages, and client portals inside one private project record.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="relative z-10 my-10 grid grid-cols-[1.05fr_.95fr] gap-4"
        >
          <div className="border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e2bd76]">Executive cockpit</span>
              <span className="text-xs font-bold text-[#9ae6b4]">Live</span>
            </div>
            <div className="grid gap-3">
              {signalRows.map(([label, value, detail]) => (
                <div key={label} className="grid grid-cols-[84px_1fr] gap-3 border border-white/10 bg-[#061f1a]/65 p-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8fb4aa]">{label}</span>
                  <div>
                    <strong className="block text-lg font-semibold text-[#fffaf0]">{value}</strong>
                    <small className="text-xs text-[#c8d8d1]/75">{detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid content-between border border-[#e2bd76]/25 bg-[#e2bd76]/10 p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e2bd76]">Private portal</p>
              <h3 className="mt-5 font-display text-4xl font-medium leading-none text-[#fffaf0]">Right role. Right record. Right next step.</h3>
              <p className="mt-4 text-sm leading-6 text-[#d8e3de]/75">
                Owners, consultants, construction teams, vendors, and executives see the work they are allowed to see.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[#9ae6b4]">
              <ShieldCheck className="h-4 w-4" />
              Role based access active
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="relative z-10 grid grid-cols-2 gap-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.32 + i * 0.06 }}
              className="flex items-start gap-3 border border-white/10 bg-white/[0.045] p-3.5"
            >
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-white/10"
                style={{ background: `color-mix(in srgb, ${f.color} 16%, transparent)` }}
              >
                <f.icon style={{ color: f.color, width: 15, height: 15 }} />
              </div>
              <div>
                <p className="mb-0.5 text-sm font-semibold text-[#fffaf0]">{f.label}</p>
                <p className="text-xs leading-relaxed text-[#c8d8d1]/60">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="relative z-10 mt-8 flex items-center justify-between text-xs text-[#c8d8d1]/45">
          <span>© 2026 APAS · Proj OS</span>
          <span className="inline-flex items-center gap-2">
            Project intelligence <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* ── RIGHT: Sign-in form ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-[#f8f6ef] border-l border-[#d8d4c7]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Mobile wordmark */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="mb-3 grid h-12 w-12 place-items-center border border-[#c89443]/45 bg-[#c89443]/10 text-[11px] font-black tracking-[0.14em] text-[#8a6427]">
              POS
            </div>
            <div className="font-display text-5xl font-medium leading-none tracking-normal text-[#08233b]">Proj OS</div>
            <p className="mt-2 text-xs font-bold tracking-[0.22em] uppercase text-muted-foreground mb-1">Project intelligence workspace</p>
            <p className="text-xs text-muted-foreground text-center">Private project-control workspace</p>
          </div>

          {/* Card */}
          <div className="bg-card border border-[#d8d4c7] p-8 shadow-sm">
            <div className="mb-7">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6427]">Secure sign in</p>
              <h1 className="font-display text-4xl font-medium tracking-normal text-foreground mb-2">
                {isClientPortal ? 'Secure client access' : isPartnerPortal ? 'Secure partner access' : 'Welcome back'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isClientPortal
                  ? 'Sign in with the account connected to your private project portal'
                  : isPartnerPortal
                    ? 'Sign in with the account connected to your contractor or consultant workspace'
                  : AUTH0_ENABLED
                    ? 'Use your secure workspace identity to continue'
                    : 'Sign in to access your Proj OS workspace'}
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-[#d8d4c7] bg-[#f8f6ef] p-2">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                What are you opening?
              </p>
              <div className="grid gap-2">
                {(Object.keys(ACCESS_MODES) as AccessMode[]).map((mode) => {
                  const option = ACCESS_MODES[mode];
                  const Icon = option.icon;
                  const active = accessMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAccessMode(mode)}
                      aria-label={`Choose ${option.title} access`}
                      className={cn(
                        'flex min-h-[74px] items-start gap-3 rounded-xl border p-3 text-left transition-all',
                        active
                          ? 'border-[#c89443] bg-white shadow-sm'
                          : 'border-transparent bg-transparent hover:border-[#d8d4c7] hover:bg-white/60',
                      )}
                      aria-pressed={active}
                    >
                      <span
                        className={cn(
                          'grid h-10 w-10 shrink-0 place-items-center rounded-xl border',
                          active
                            ? 'border-[#c89443]/35 bg-[#c89443]/12 text-[#8a6427]'
                            : 'border-border bg-background text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                          {option.eyebrow}
                        </span>
                        <span className="mt-0.5 block text-sm font-bold text-foreground">{option.title}</span>
                        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{option.description}</span>
                      </span>
                      {active && (
                        <span className="mt-1 rounded-full bg-[#0b3a30] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* APAS ID (Auth0 Universal Login) — the front door across products */}
            {AUTH0_ENABLED && (
              <div className="space-y-3">
                <button
                  type="button" onClick={() => handleAuth0('login')} disabled={auth0Pending !== null}
                  className="w-full h-12 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                  {auth0Pending === 'login'
                    ? (<><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</>)
                    : ('Continue securely')}
                </button>

                {accessMode === 'team' && (
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
                  {isSubmitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>) : (`Sign in as ${selectedAccess.title}`)}
                </button>
            </form>
            )}

            {accessMode === 'team' && <p className="text-xs text-center mt-5 text-muted-foreground">
              {AUTH0_ENABLED
                ? 'Invited to an existing workspace? Open the private invitation your administrator sent you.'
                : 'New accounts are created by a workspace administrator and activated from a private invitation.'}
            </p>}
            {isClientPortal && (
              <p className="text-xs text-center mt-5 text-muted-foreground">
                First visit? Open the private invitation your project team sent you. No separate registration is required.
              </p>
            )}
            {isPartnerPortal && (
              <p className="text-xs text-center mt-5 text-muted-foreground">
                First visit? Use the contractor or consultant invitation tied to your project team role.
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
