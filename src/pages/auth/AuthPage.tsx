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
  {
    icon: ShieldCheck,
    color: '#10B981',
    label: 'NSPIRE Compliance',
    desc: 'Real-time scoring, defect tracking & audit-ready reporting',
  },
  {
    icon: HardHat,
    color: '#1D6FE8',
    label: 'Construction Projects',
    desc: 'RFIs, submittals, daily reports & client portals in one place',
  },
  {
    icon: ClipboardList,
    color: '#8B5CF6',
    label: 'Daily Inspections',
    desc: 'Grounds walkthroughs with photo evidence and voice notes',
  },
  {
    icon: Wrench,
    color: '#F59E0B',
    label: 'Maintenance & Work Orders',
    desc: 'Issue tracking from request to resolution, fully traced',
  },
  {
    icon: BarChart3,
    color: '#F43F5E',
    label: 'Operations Intelligence',
    desc: 'Cross-module dashboards for every role in your org',
  },
  {
    icon: Building2,
    color: '#1D6FE8',
    label: 'Multi-Property Management',
    desc: 'Manage your entire portfolio from a single command center',
  },
];

export default function AuthPage() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error('Failed to sign in with Google. Please try again.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0C12' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1D6FE8' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0A0C12' }}>
      {/* ── Left panel: APAS OS Brand & Features ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12 xl:p-16"
        style={{ background: 'linear-gradient(135deg, #0A0C12 0%, #10131D 60%, #161B2B 100%)' }}>

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(29,111,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(29,111,232,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />

        {/* Sapphire glow orbs */}
        <div className="absolute top-1/4 right-0 w-[28rem] h-[28rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(29,111,232,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 left-0 w-[20rem] h-[20rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* Brand lockup */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          {/* APAS OS Logo mark */}
          <div className="flex items-end gap-3 mb-10">
            <div className="flex items-center gap-1">
              {/* APAS */}
              <span
                className="font-black tracking-tight leading-none"
                style={{
                  fontSize: '3.5rem',
                  color: '#F1F5FF',
                  letterSpacing: '-0.03em',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                APAS
              </span>
              {/* OS — distinct treatment */}
              <div className="flex items-end mb-1 ml-1">
                <span
                  className="font-black leading-none"
                  style={{
                    fontSize: '3.5rem',
                    background: 'linear-gradient(135deg, #1D6FE8 0%, #60a5fa 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.03em',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  OS
                </span>
              </div>
            </div>
          </div>

          {/* OS pill badge */}
          <div className="flex items-center gap-2 mb-6">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{
                background: 'rgba(29,111,232,0.15)',
                border: '1px solid rgba(29,111,232,0.35)',
                color: '#60a5fa',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Operating System for Property &amp; Construction
            </div>
          </div>

          {/* Tagline */}
          <h2
            className="font-bold leading-tight mb-4"
            style={{
              fontSize: 'clamp(1.75rem, 2.5vw, 2.5rem)',
              color: '#F1F5FF',
              letterSpacing: '-0.02em',
            }}
          >
            Run the Job.{' '}
            <span style={{ color: '#10B981' }}>Pass the Audit.</span>
          </h2>
          <p style={{ color: '#6B7A99', fontSize: '1.05rem', maxWidth: '440px', lineHeight: 1.65 }}>
            One integrated platform for inspections, compliance, project management,
            maintenance, and team operations — built for property managers and construction teams.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="relative z-10 grid grid-cols-2 gap-3 mt-10"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
              className="flex items-start gap-3 p-3.5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
              >
                <f.icon style={{ color: f.color, width: 16, height: 16 }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: '#F1F5FF' }}>{f.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#6B7A99' }}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer attribution */}
        <div className="relative z-10 mt-8">
          <p className="text-xs" style={{ color: '#6B7A99' }}>
            © 2025 APAS OS · apasos.ai · All rights reserved
          </p>
        </div>
      </div>

      {/* ── Right panel: Sign-in form ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12"
        style={{ background: '#10131D', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="flex items-end gap-1 mb-3">
              <span
                className="font-black tracking-tight"
                style={{ fontSize: '2.5rem', color: '#F1F5FF', letterSpacing: '-0.03em' }}
              >
                APAS
              </span>
              <span
                className="font-black tracking-tight"
                style={{
                  fontSize: '2.5rem',
                  background: 'linear-gradient(135deg, #1D6FE8 0%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.03em',
                  marginLeft: '4px',
                }}
              >
                OS
              </span>
            </div>
            <p className="text-xs tracking-widest uppercase" style={{ color: '#6B7A99' }}>Operating System</p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#161B2B',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div className="mb-7">
              <h1 className="text-2xl font-bold mb-1.5" style={{ color: '#F1F5FF' }}>
                Welcome back
              </h1>
              <p className="text-sm" style={{ color: '#6B7A99' }}>
                Sign in to access your operations dashboard
              </p>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl text-sm font-medium transition-all mb-5"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F1F5FF',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#6B7A99' }} />
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
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-xs" style={{ color: '#6B7A99' }}>or sign in with email</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7A99' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl px-3.5 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: '#F1F5FF',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(29,111,232,0.6)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: '#6B7A99' }}>Password</label>
                  <Link to="/forgot-password" className="text-xs transition-colors" style={{ color: '#1D6FE8' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#60a5fa')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#1D6FE8')}
                  >
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
                  className="w-full h-11 rounded-xl px-3.5 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: '#F1F5FF',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(29,111,232,0.6)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-sm font-semibold transition-all mt-2 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #1D6FE8 0%, #2563eb 100%)',
                  color: '#fff',
                  boxShadow: '0 0 24px rgba(29,111,232,0.25)',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(29,111,232,0.45)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(29,111,232,0.25)')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to APAS OS'
                )}
              </button>
            </form>

            <p className="text-xs text-center mt-5" style={{ color: '#6B7A99' }}>
              Access is by invitation only.{' '}
              <span style={{ color: '#F1F5FF' }}>Contact your administrator</span> for access.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs transition-colors"
              style={{ color: '#6B7A99' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F1F5FF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B7A99')}
            >
              ← Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
