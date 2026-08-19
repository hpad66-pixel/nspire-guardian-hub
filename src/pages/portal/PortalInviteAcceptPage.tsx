/**
 * PortalInviteAcceptPage — public landing for a portal invitation link
 * (/portal-invite/:token). Calls the accept-portal-invitation edge function,
 * which provisions the client's login + owner/sub membership and returns a magic
 * link; we then forward the browser to it so the client lands in their portal.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "./client-portal.css";

const HUMAN: Record<string, string> = {
  invalid_token: "This invitation link isn't valid.",
  already_accepted: "This invitation has already been accepted — try signing in.",
  expired: "This invitation has expired. Ask your project team for a new one.",
  missing_token: "This invitation link is incomplete.",
};

export default function PortalInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"working" | "error" | "done">("working");
  const [message, setMessage] = useState("Setting up your access…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;
    (async () => {
      try {
        const next = searchParams.get("next") === "schedule" ? "schedule" : "portal";
        const { data, error } = await supabase.functions.invoke("accept-portal-invitation", { body: { token, next } });
        if (error) throw error;
        const d = data as any;
        if (d?.error) { setStatus("error"); setMessage(HUMAN[d.error] ?? "Couldn't accept the invitation."); return; }
        if (d?.redirect_url) { setMessage("Taking you to your portal…"); window.location.href = d.redirect_url; return; }
        setStatus("done"); setMessage("Your access is ready — please sign in.");
      } catch {
        setStatus("error");
        setMessage("We couldn't verify this invitation. Please try again or ask your project team for a fresh link.");
      }
    })();
  }, [searchParams, token]);

  return (
    <div className="client-invite-page">
      <div className="client-access-grid" aria-hidden="true" />
      <div className="client-invite-card">
        <div className="client-access-wordmark">
          <span>APAS</span>
          <div><strong>Project Controls</strong><small>Powered by projOS</small></div>
        </div>
        <div className="client-invite-status">
          {status === "working" && <span className="is-working"><Loader2 className="animate-spin" /></span>}
          {status === "done" && <span className="is-done"><CheckCircle2 /></span>}
          {status === "error" && <span className="is-error"><AlertTriangle /></span>}
          <small><ShieldCheck /> Secure client invitation</small>
          <h1>{status === "error" ? "Invitation problem" : "Welcome to your project portal"}</h1>
          <p>{message}</p>
          {status === "error" && (
            <a href="/auth?portal=client&next=%2Fowner-portal">Go to secure sign in</a>
          )}
        </div>
        <p className="client-invite-footnote">Private by design · Your access is limited to approved client information</p>
      </div>
    </div>
  );
}
