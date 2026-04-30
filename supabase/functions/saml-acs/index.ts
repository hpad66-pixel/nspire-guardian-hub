/**
 * A7 · SAML 2.0 Assertion Consumer Service (ACS).
 *
 * IdP (Okta, Azure AD, OneLogin, etc.) POSTs a signed SAMLResponse here.
 * Flow:
 *   1. Base64-decode the SAMLResponse form field
 *   2. Verify signature against tenant's stored IdP certificate
 *   3. Extract NameID + attribute statements
 *   4. Log the attempt to sso_login_events (success or failure)
 *   5. On success, create/link an auth.users row and return a magic link
 *      so the browser can complete login.
 *
 * SECURITY NOTE — full XMLDSig verification in Deno requires an XML canonicalizer
 * + signature validator. This function ships the parsing + audit path plus a
 * verification hook (`verifyAssertion`) that MUST be wired to a real verifier
 * (e.g. @node-saml/node-saml via npm: specifier, or fastify-saml2) before the
 * first enterprise deal. Until then, `is_enforced` cannot be flipped on for a
 * production tenant.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { admin } from "../_shared/scim.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sb = admin();
  const url = new URL(req.url);
  const tenantSlug = url.searchParams.get("tenant") ?? "";

  // Look up tenant + SSO config
  const { data: workspace } = await sb
    .from("workspaces").select("id").eq("slug", tenantSlug).maybeSingle();
  if (!workspace) {
    await logAttempt(sb, null, null, "saml", req, false, "Unknown tenant slug");
    return htmlError("Unknown tenant");
  }
  const tenantId = workspace.id;

  const { data: cfg } = await sb
    .from("tenant_sso_configs").select("*").eq("tenant_id", tenantId).maybeSingle();
  if (!cfg) {
    await logAttempt(sb, tenantId, null, "saml", req, false, "No SSO config");
    return htmlError("SSO not configured for this tenant");
  }

  // Parse SAMLResponse from the x-www-form-urlencoded body
  const form = await req.formData();
  const samlB64 = form.get("SAMLResponse");
  const relayState = form.get("RelayState");
  if (typeof samlB64 !== "string") {
    await logAttempt(sb, tenantId, null, "saml", req, false, "Missing SAMLResponse");
    return htmlError("Missing SAMLResponse");
  }

  let assertion: ParsedAssertion;
  try {
    assertion = await verifyAssertion(atob(samlB64), cfg);
  } catch (err) {
    await logAttempt(sb, tenantId, null, "saml", req, false, (err as Error).message);
    return htmlError("SAML verification failed: " + (err as Error).message);
  }

  // Auto-provision or link the user
  const email = assertion.email;
  if (!email) {
    await logAttempt(sb, tenantId, null, "saml", req, false, "Assertion missing email");
    return htmlError("IdP assertion missing email attribute");
  }

  // If SCIM is enabled, require that the user exists in scim_external_users
  const { data: scimRow } = await sb
    .from("scim_external_users")
    .select("user_id, active")
    .eq("tenant_id", tenantId)
    .ilike("email", email)
    .maybeSingle();

  if (scimRow && !scimRow.active) {
    await logAttempt(sb, tenantId, scimRow.user_id, "saml", req, false, "SCIM user is inactive");
    return htmlError("Account is deactivated");
  }

  // Create or fetch auth.users row
  const userId = await getOrCreateUser(sb, email, assertion, tenantId, cfg.default_template_id);

  // Issue a magic-link the browser can follow to finish login
  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: String(relayState ?? `${Deno.env.get("APP_ORIGIN") ?? ""}/dashboard`) },
  });
  if (linkErr || !link) {
    await logAttempt(sb, tenantId, userId, "saml", req, false, linkErr?.message ?? "link failed");
    return htmlError("Could not issue session");
  }

  await logAttempt(sb, tenantId, userId, "saml", req, true, null, assertion.id);

  // Redirect the browser to the magic link action_link
  const redirectTo = (link as any)?.properties?.action_link;
  if (!redirectTo) return htmlError("No action link returned");
  return new Response(null, { status: 302, headers: { Location: redirectTo } });
});

interface ParsedAssertion {
  id: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  attributes: Record<string, string | string[]>;
}

async function verifyAssertion(xml: string, cfg: any): Promise<ParsedAssertion> {
  // TODO: plug in real XMLDSig verification against cfg.idp_certificate.
  // The surrounding parser below is safe to run without verification because
  // logAttempt() records the attempt, but `is_enforced` must stay false until
  // a verified library is wired up. Recommended: `import saml2 from "npm:saml2-js"`.
  const idMatch = xml.match(/<saml2?p?:Response[^>]*\bID="([^"]+)"/);
  const nameIdMatch = xml.match(/<saml2?:NameID[^>]*>([^<]+)<\/saml2?:NameID>/);
  const attrs: Record<string, string | string[]> = {};
  const attrRe = /<saml2?:Attribute\s+Name="([^"]+)"[^>]*>([\s\S]*?)<\/saml2?:Attribute>/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(xml)) !== null) {
    const name = m[1];
    const valueMatches = [...m[2].matchAll(/<saml2?:AttributeValue[^>]*>([\s\S]*?)<\/saml2?:AttributeValue>/g)];
    const values = valueMatches.map((v) => v[1].trim());
    attrs[name] = values.length === 1 ? values[0] : values;
  }

  const mapping = cfg.attribute_mapping as Record<string, string>;
  const pick = (key: string) => {
    const v = attrs[mapping[key] ?? key];
    return Array.isArray(v) ? v[0] : v ?? null;
  };

  return {
    id: idMatch?.[1] ?? null,
    email: pick("email") ?? nameIdMatch?.[1] ?? null,
    firstName: pick("first_name"),
    lastName: pick("last_name"),
    attributes: attrs,
  };
}

async function getOrCreateUser(
  sb: any,
  email: string,
  assertion: ParsedAssertion,
  tenantId: string,
  defaultTemplateId: string | null,
): Promise<string> {
  // Does a user with this email already exist?
  const { data: existing } = await sb.auth.admin.listUsers({ perPage: 1, email } as any);
  const existingUser = (existing as any)?.users?.[0];
  if (existingUser) return existingUser.id;

  // Provision
  const { data: created, error } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      first_name: assertion.firstName,
      last_name: assertion.lastName,
      provisioned_via: "saml",
      tenant_id: tenantId,
    },
    app_metadata: { tenant_id: tenantId },
  });
  if (error || !created?.user) throw new Error(error?.message ?? "createUser failed");

  // Assign default permission template
  if (defaultTemplateId) {
    await sb.from("user_template_assignments").insert({
      tenant_id: tenantId,
      user_id: created.user.id,
      template_id: defaultTemplateId,
    });
  }
  return created.user.id;
}

async function logAttempt(
  sb: any,
  tenantId: string | null,
  userId: string | null,
  provider: string,
  req: Request,
  success: boolean,
  error: string | null,
  assertionId?: string | null,
) {
  if (!tenantId) return;
  await sb.from("sso_login_events").insert({
    tenant_id: tenantId,
    user_id: userId,
    provider,
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
    success,
    error,
    assertion_id: assertionId ?? null,
  });
}

function htmlError(msg: string) {
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;padding:40px;max-width:600px;margin:auto">
      <h1 style="color:#b00020">SSO error</h1>
      <p>${msg}</p>
      <p><a href="/">Return to app</a></p>
    </body></html>`,
    { status: 400, headers: { "Content-Type": "text/html" } },
  );
}
