import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalBySlug } from "@/hooks/usePortal";
import { supabase } from "@/integrations/supabase/client";
import { ownerPortalPath } from "@/lib/portal/ownerPortalPaths";
import "./client-portal.css";

/**
 * Public, branded handoff for returning clients. Access is authenticated by
 * Supabase Auth; this page never reads portal_access credentials or creates a
 * browser-only pseudo-session. First-time clients enter through the one-click
 * /portal-invite/:token link and returning clients can request a fresh link.
 */
export default function PortalLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { data: portal, isLoading } = usePortalBySlug(slug);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) {
    return <div className="client-access-loading"><Loader2 className="animate-spin" /></div>;
  }

  // Authenticated clients and project administrators share the same secure
  // destination; the portal gate decides whether this is an owner view or an
  // administrator preview.
  if (user) {
    return <Navigate to={ownerPortalPath(portal?.project_id)} replace />;
  }

  if (!portal || !portal.is_active || portal.status === "archived") {
    return (
      <div className="client-access-loading">
        <div className="client-access-unavailable">
          <LockKeyhole />
          <h1>Portal unavailable</h1>
          <p>This private portal is not currently available. Please contact your project team for assistance.</p>
        </div>
      </div>
    );
  }

  async function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}${ownerPortalPath(portal?.project_id)}`,
        shouldCreateUser: false,
      },
    });
    setSubmitting(false);
    if (otpError) {
      setError(otpError.message.includes("rate")
        ? "Please wait a moment before requesting another link."
        : "We could not send the link. Please contact your project team.");
      return;
    }
    // Use the same confirmation for every email to avoid exposing who has
    // access to a private workspace.
    setSent(true);
  }

  const accent = portal.brand_accent_color || "#d5aa52";
  const clientName = portal.client_name || portal.name;

  return (
    <div className="client-access-page" style={{ "--portal-accent": accent } as React.CSSProperties}>
      <div className="client-access-art" aria-hidden="true">
        <div className="client-access-grid" />
        <div className="client-access-orbit client-access-orbit--one" />
        <div className="client-access-orbit client-access-orbit--two" />
      </div>

      <main className="client-access-card">
        <section className="client-access-card__story">
          <div className="client-access-wordmark">
            <span>APAS</span>
            <div><strong>Project Controls</strong><small>Powered by projOS</small></div>
          </div>
          <div className="client-access-story-copy">
            <span className="client-access-kicker"><ShieldCheck /> Private project access</span>
            <h1>Clarity without the clutter.</h1>
            <p>Your decisions, project updates, schedule, financial status, and approved documents—organized in one secure client view.</p>
            <ul>
              <li><CheckCircle2 /> See exactly what needs your decision</li>
              <li><CheckCircle2 /> Review owner-facing financials and approvals</li>
              <li><CheckCircle2 /> Keep a defensible record of every action</li>
            </ul>
          </div>
          <p className="client-access-story-footer">Private by design · Role restricted · Fully auditable</p>
        </section>

        <section className="client-access-card__form">
          <div className="client-access-client-brand">
            {portal.brand_logo_url ? (
              <img src={portal.brand_logo_url} alt={`${clientName} logo`} />
            ) : (
              <span>{clientName.charAt(0).toUpperCase()}</span>
            )}
            <div><small>Client portal</small><strong>{clientName}</strong></div>
          </div>

          {sent ? (
            <div className="client-access-sent">
              <span><Mail /></span>
              <h2>Check your email</h2>
              <p>If <strong>{email}</strong> is connected to this portal, a secure sign-in link is on its way.</p>
              <p className="client-access-hint">Use the link on this device. No password is required.</p>
              <button type="button" onClick={() => { setSent(false); setEmail(""); }}>Use another email</button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="client-access-form">
              <div>
                <span className="client-access-kicker">Welcome back</span>
                <h2>Open your project portal</h2>
                <p>Enter your approved email. We’ll send a secure sign-in link—no password to remember.</p>
              </div>
              <label htmlFor="client-email">Email address</label>
              <div className="client-access-input">
                <Mail />
                <input
                  id="client-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              {error && <p className="client-access-error" role="alert">{error}</p>}
              <button type="submit" className="client-access-submit" disabled={submitting || !email.trim()}>
                {submitting ? <><Loader2 className="animate-spin" /> Sending secure link…</> : <>Email my secure link <ArrowRight /></>}
              </button>
              <p className="client-access-hint"><LockKeyhole /> First visit? Use the private invitation sent by your project team.</p>
            </form>
          )}
        </section>
      </main>
      <footer className="client-access-page__footer">© 2026 APAS Consulting · Secure client project controls</footer>
    </div>
  );
}
