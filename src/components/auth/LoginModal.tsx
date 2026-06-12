import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // If the user becomes authenticated while the modal is open, close it
  // and send them to the dashboard. Covers OAuth round-trips too.
  useEffect(() => {
    if (open && user) {
      onOpenChange(false);
      navigate('/dashboard');
    }
  }, [open, user, onOpenChange, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) {
      toast.error(
        error.message.includes('Invalid login credentials')
          ? 'Invalid email or password. Please try again.'
          : error.message
      );
    } else {
      toast.success('Welcome back!');
      onOpenChange(false);
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) toast.error('Failed to sign in with Google. Please try again.');
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-white/[0.08] bg-[#0A0B0D] p-0 sm:max-w-[440px]"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Ambient gradient orbs (match the homepage aesthetic) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
        >
          <div
            className="absolute right-[-30%] top-[-30%] h-64 w-64 opacity-40 blur-3xl"
            style={{
              background:
                'radial-gradient(60% 60% at 50% 50%, rgba(29,111,232,0.35), transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-[-30%] left-[-20%] h-56 w-56 opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(60% 60% at 50% 50%, rgba(139,92,246,0.25), transparent 70%)',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 px-7 pb-7 pt-8"
        >
          {/* Wordmark */}
          <div className="mb-6 flex items-end gap-1.5 select-none">
            <span
              className="text-[28px] font-black leading-none tracking-tight text-white"
              style={{ letterSpacing: '-0.04em' }}
            >
              Build
            </span>
            <span
              className="text-[28px] font-black leading-none tracking-tight"
              style={{
                letterSpacing: '-0.04em',
                background:
                  'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              OS
            </span>
          </div>

          {/* Heading */}
          <h2
            className="mb-1.5 text-[22px] font-semibold text-white"
            style={{ letterSpacing: '-0.018em' }}
          >
            Welcome back
          </h2>
          <p className="mb-6 text-[13.5px] text-white/50">
            Sign in to your Proj OS workspace.
          </p>

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="mb-4 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[14px] font-medium text-white/90 transition-colors hover:bg-white/[0.07] disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/60" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
              or
            </span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-white/70">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-[14px] text-white placeholder:text-white/25 outline-none transition-all focus:border-blue-400/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-400/20 disabled:opacity-60"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[12px] font-semibold text-white/70">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  onClick={() => onOpenChange(false)}
                  className="text-[11.5px] font-medium text-blue-400/80 transition-colors hover:text-blue-300"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-[14px] text-white placeholder:text-white/25 outline-none transition-all focus:border-blue-400/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-blue-400/20 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
              style={{
                background:
                  'linear-gradient(135deg, #1D6FE8 0%, #8B5CF6 100%)',
                boxShadow:
                  '0 4px 24px -6px rgba(29,111,232,0.5), 0 0 0 1px rgba(255,255,255,0.08) inset',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11.5px] text-white/35">
            Access is by invitation only.{' '}
            <span className="text-white/60">Contact your administrator</span> if you need access.
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
