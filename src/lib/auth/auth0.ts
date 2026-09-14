import { supabase } from '@/integrations/supabase/client';

/**
 * Client half of the Auth0 Universal Login bridge.
 *
 * Auth0 is the single front door across APAS products, so signup attribution
 * ("this person came from ProjOS") is decided once, in Auth0, rather than being
 * reconstructed per product. Supabase Auth still issues the session this app
 * runs on -- see supabase/functions/auth0-callback for why.
 *
 * The browser deliberately does not build the /authorize URL: the PKCE verifier
 * and the signup intent live server-side in `auth0_login_states`.
 */

const flag = (value: unknown) => String(value ?? '').trim().toLowerCase() === 'true';

export const AUTH0_ENABLED = flag(import.meta.env.VITE_AUTH0_ENABLED);

/** Public Auth0 values, needed only to end the Auth0 session on sign-out. */
const AUTH0_DOMAIN = (import.meta.env.VITE_AUTH0_DOMAIN ?? '').trim().replace(/^https?:\/\//, '');
const AUTH0_CLIENT_ID = (import.meta.env.VITE_AUTH0_CLIENT_ID ?? '').trim();

export interface StartAuth0Options {
  /** `signup` opens Universal Login on its sign-up tab. */
  mode?: 'login' | 'signup';
  /** Single-use workspace invitation being redeemed, if any. */
  invitationToken?: string;
  /** Self-serve only: names the workspace the signup provisions. */
  companyName?: string;
  fullName?: string;
  /** Same-site path to land on afterwards. */
  next?: string;
}

/** Supabase wraps non-2xx function responses; dig the real message out. */
async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    const body = await context.json().catch(() => null);
    if (body?.error) return String(body.error);
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Asks the bridge for an /authorize URL and hands the browser over to Auth0.
 * Resolves only on failure -- on success the page is already navigating away.
 */
export async function startAuth0(options: StartAuth0Options = {}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('auth0-authorize', {
    body: {
      mode: options.mode ?? 'login',
      invitationToken: options.invitationToken,
      companyName: options.companyName,
      fullName: options.fullName,
      next: options.next,
    },
  });

  if (error) throw new Error(await functionErrorMessage(error, 'Could not start sign-in.'));
  if (data?.error) throw new Error(String(data.error));
  if (!data?.url) throw new Error('Could not start sign-in.');

  window.location.assign(data.url as string);
}

export interface Auth0CallbackTokens {
  accessToken: string;
  refreshToken: string;
  next: string | null;
}

/** Only same-site relative paths may be used as a post-login destination. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith('/') && !value.startsWith('//') ? value : null;
}

/**
 * Reads the session the callback function handed back in the URL fragment.
 * A fragment is never sent to a server; the callback page still scrubs it from
 * history immediately after reading it.
 */
export function parseAuth0Fragment(hash: string): Auth0CallbackTokens | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, next: safeNextPath(params.get('next')) };
}

/**
 * Auth0 keeps its own session cookie. Without this the next "sign in" silently
 * re-authenticates the user who just signed out, which reads as a broken logout.
 */
export function auth0LogoutUrl(returnTo: string): string | null {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) return null;
  const url = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
  url.searchParams.set('client_id', AUTH0_CLIENT_ID);
  url.searchParams.set('returnTo', returnTo);
  return url.toString();
}
