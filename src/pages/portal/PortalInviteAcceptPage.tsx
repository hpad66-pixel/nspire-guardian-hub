/**
 * PortalInviteAcceptPage — public landing for a portal invitation link
 * (/portal-invite/:token). Calls the accept-portal-invitation edge function,
 * which provisions the client's login + owner/sub membership and returns a magic
 * link; we then forward the browser to it so the client lands in their portal.
 */
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HUMAN: Record<string, string> = {
  invalid_token: "This invitation link isn't valid.",
  already_accepted: "This invitation has already been accepted — try signing in.",
  expired: "This invitation has expired. Ask your project team for a new one.",
  missing_token: "This invitation link is incomplete.",
};

export default function PortalInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"working" | "error" | "done">("working");
  const [message, setMessage] = useState("Setting up your access…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("accept-portal-invitation", { body: { token } });
        if (error) throw error;
        const d = data as any;
        if (d?.error) { setStatus("error"); setMessage(HUMAN[d.error] ?? "Couldn't accept the invitation."); return; }
        if (d?.redirect_url) { setMessage("Taking you to your portal…"); window.location.href = d.redirect_url; return; }
        setStatus("done"); setMessage("Your access is ready — please sign in.");
      } catch (e: any) {
        setStatus("error"); setMessage(e?.message ?? "Something went wrong accepting the invitation.");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-3">
        {status === "working" && <Loader2 className="h-10 w-10 animate-spin text-[var(--apas-sapphire)] mx-auto" />}
        {status === "done" && <CheckCircle2 className="h-10 w-10 text-[var(--apas-emerald)] mx-auto" />}
        {status === "error" && <AlertTriangle className="h-10 w-10 text-[var(--apas-rose)] mx-auto" />}
        <h1 className="text-xl font-semibold">{status === "error" ? "Invitation problem" : "Welcome"}</h1>
        <p className="text-muted-foreground">{message}</p>
        {status === "error" && <a href="/login" className="text-sm text-[var(--apas-sapphire)] hover:underline">Go to sign in</a>}
      </div>
    </div>
  );
}
