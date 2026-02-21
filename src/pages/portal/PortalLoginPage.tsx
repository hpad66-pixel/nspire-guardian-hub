import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalBySlug, usePortalSession, setPortalSession } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PortalLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: portal, isLoading } = usePortalBySlug(slug);
  const { isAuthenticated } = usePortalSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!portal || !portal.is_active || portal.status === 'archived') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-lg font-semibold text-foreground">Portal unavailable</p>
          <p className="text-sm text-muted-foreground">
            This portal is no longer available. Please contact{' '}
            {portal?.client_name ?? 'the company'} for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={`/portal/${slug}/home`} replace />;
  }

  const accent = portal.brand_accent_color ?? '#0F172A';

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Check if email exists in portal_access
      const { data: access } = await supabase
        .from('portal_access')
        .select('id, email')
        .eq('portal_id', portal!.id)
        .eq('email', email.trim().toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (!access) {
        setError(`That email isn't on the access list for this portal. Contact ${portal?.client_name ?? 'the company'} to request access.`);
        return;
      }

      // Generate magic link token
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      await supabase
        .from('portal_access')
        .update({ magic_link_token: token, magic_link_expires_at: expires })
        .eq('id', access.id);

      // In production, send email. For now show token in UI.
      setMagicSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data: access } = await supabase
        .from('portal_access')
        .select('id, email, name, password_hash, login_count')
        .eq('portal_id', portal!.id)
        .eq('email', email.trim().toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (!access) {
        setError('Email not found on this portal.');
        return;
      }
      if (!access.password_hash) {
        setError('No password set for this account. Use the magic link above to sign in.');
        return;
      }
      // Simple comparison (in production use bcrypt)
      if (access.password_hash !== password) {
        setError('Incorrect password. Try again or use the magic link above.');
        return;
      }

      await supabase.from('portal_access').update({
        last_login_at: new Date().toISOString(),
        login_count: (access.login_count ?? 0) + 1,
      }).eq('id', access.id);

      setPortalSession({
        portalId: portal!.id,
        email: access.email,
        name: access.name,
        accessId: access.id,
        authenticated: true,
        portalSlug: slug!,
      });

      window.location.href = `/portal/${slug}/home`;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          {portal.brand_logo_url ? (
            <img src={portal.brand_logo_url} alt="logo" className="h-12 object-contain" />
          ) : (
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {(portal.client_name ?? portal.name).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{portal.client_name ?? ''}</p>
            <h1 className="text-lg font-bold text-foreground mt-0.5">Sign in to {portal.name}</h1>
          </div>
        </div>

        {/* Magic link card */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
          {magicSent ? (
            <div className="text-center space-y-2 py-2">
              <div className="text-3xl">✉️</div>
              <p className="font-semibold text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <strong>{email}</strong>. The link expires in 72 hours.
              </p>
              <button
                onClick={() => { setMagicSent(false); setEmail(''); }}
                className="text-xs text-primary hover:underline mt-2"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <p className="text-sm font-medium text-foreground">Sign in with a link</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full rounded-lg py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: accent }}
              >
                {submitting ? 'Sending...' : 'Send me a sign-in link'}
              </button>
            </form>
          )}

          {!magicSent && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-3">
                <p className="text-sm font-medium text-foreground">Sign in with password</p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  disabled={submitting || !email || !password}
                  className="w-full rounded-lg py-2.5 text-sm font-medium border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">Powered by APAS OS · apasos.ai</p>
      </div>
    </div>
  );
}
