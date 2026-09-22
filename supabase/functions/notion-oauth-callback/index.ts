// Public Notion OAuth callback. Notion redirects here without a Supabase JWT.
// Authenticity comes from the signed state created by the authenticated Notion
// starter function.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { exchangeCode, notionGetMe, safeOrigin, safeReturnPath, verifyState } from "../_shared/notionOAuth.ts";

serve(async (req) => {
  const params = new URL(req.url).searchParams;
  const back = (origin: string, path: string, status: string) =>
    new Response(null, {
      status: 302,
      headers: { Location: `${safeOrigin(origin)}${safeReturnPath(path)}?notion=${status}` },
    });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const state = await verifyState(serviceKey, params.get("state"));
    const returnTo = state?.r ?? "/settings";
    const origin = state?.o ?? "";
    const err = params.get("error");
    const code = params.get("code");

    if (err || !code || !state) {
      console.error("notion-oauth-callback rejected:", { err, hasCode: !!code, validState: !!state });
      return back(origin, returnTo, "error");
    }

    const tokens = await exchangeCode(code);
    await notionGetMe(tokens.access_token);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
      : null;

    const { error } = await admin.from("notion_connections").upsert({
      tenant_id: state.t,
      user_id: state.u,
      notion_workspace_id: tokens.workspace_id,
      workspace_name: tokens.workspace_name ?? null,
      workspace_icon: tokens.workspace_icon ?? null,
      bot_id: tokens.bot_id,
      owner: tokens.owner ?? {},
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      scopes: null,
      status: "active",
      last_error: null,
      connected_by: state.u,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,user_id,notion_workspace_id" });

    if (error) {
      console.error("notion-oauth-callback upsert:", error.message);
      return back(origin, returnTo, "error");
    }

    return back(origin, returnTo, "connected");
  } catch (e) {
    console.error("notion-oauth-callback error:", e);
    return back("", "/settings", "error");
  }
});
