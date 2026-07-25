// Public Gmail OAuth callback (verify_jwt = false — Google calls it with no JWT).
// Authenticity comes from the signed `state`. Exchanges the code, stores the
// refresh token (service role, edge-only), and 302s the browser back to the app.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyState, exchangeCode, gmailAddress, safeReturnPath, safeOrigin } from "../_shared/gmailOAuth.ts";

serve(async (req) => {
  const params = new URL(req.url).searchParams;
  const back = (origin: string, path: string, status: string) =>
    new Response(null, { status: 302, headers: { Location: `${safeOrigin(origin)}${safeReturnPath(path)}?gmail=${status}` } });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const err = params.get("error");
    const code = params.get("code");
    const state = await verifyState(serviceKey, params.get("state"));
    const returnTo = state?.r ?? "/";
    const origin = state?.o ?? "";

    if (err || !code || !state) {
      console.error("gmail-oauth-callback rejected:", { err, hasCode: !!code, validState: !!state });
      return back(origin, returnTo, "error");
    }

    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      // Google only returns a refresh token on first consent; prompt=consent forces it.
      console.error("gmail-oauth-callback: no refresh_token returned");
      return back(origin, returnTo, "error");
    }
    const email = await gmailAddress(tokens.access_token);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
    const { error } = await admin.from("gmail_connections").upsert({
      tenant_id: state.t,
      user_id: state.u,
      email,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
      scopes: tokens.scope ?? null,
      status: "active",
      last_error: null,
      connected_by: state.u,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,user_id" });
    if (error) { console.error("gmail-oauth-callback upsert:", error.message); return back(origin, returnTo, "error"); }

    return back(origin, returnTo, "connected");
  } catch (e) {
    console.error("gmail-oauth-callback error:", e);
    return back("", "/", "error");
  }
});
