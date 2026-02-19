import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalBySlug, usePortalSession, setPortalSession } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

export default function PortalWelcomePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: portal, isLoading } = usePortalBySlug(slug);
  const { session, isAuthenticated } = usePortalSession();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAuthenticated || !portal) {
    return <Navigate to={`/portal/${slug}`} replace />;
  }

  const accent = portal.brand_accent_color ?? '#0F172A';

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await supabase.from('portal_access').update({ password_hash: password }).eq('id', session!.accessId);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {portal.brand_logo_url ? (
          <img src={portal.brand_logo_url} alt="logo" className="h-10 object-contain mx-auto" />
        ) : (
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg font-bold text-white mx-auto" style={{ backgroundColor: accent }}>
            {(portal.client_name ?? portal.name).charAt(0).toUpperCase()}
          </div>
        )}

        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Welcome{session?.name ? `, ${session.name.split(' ')[0]}` : ''}!</h1>
          <p className="text-sm text-muted-foreground mt-1">You're now signed in to {portal.client_name ?? portal.name}'s compliance portal.</p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
          <div>
            <p className="font-semibold text-sm text-foreground">Want faster access next time?</p>
            <p className="text-xs text-muted-foreground mt-1">Set a password to sign in without waiting for a link.</p>
          </div>

          {saved ? (
            <p className="text-sm text-green-600 font-medium">✓ Password set successfully</p>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg py-2.5 text-sm font-medium border border-border bg-muted text-foreground hover:bg-muted/80 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Set Password'}
              </button>
            </form>
          )}

          <button
            onClick={() => navigate(`/portal/${slug}/home`)}
            className="w-full text-sm text-center font-medium"
            style={{ color: accent }}
          >
            Skip — take me to the portal →
          </button>
        </div>
      </div>
    </div>
  );
}
