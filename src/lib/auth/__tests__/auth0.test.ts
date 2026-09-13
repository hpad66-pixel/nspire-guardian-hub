import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));

describe('Auth0 bridge client', () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('parseAuth0Fragment', () => {
    it('reads the session the callback function handed back', async () => {
      const { parseAuth0Fragment } = await import('../auth0');
      expect(
        parseAuth0Fragment('#access_token=abc&refresh_token=def&expires_in=3600&next=%2Fprojects'),
      ).toEqual({ accessToken: 'abc', refreshToken: 'def', next: '/projects' });
    });

    it('refuses a fragment missing either half of the session', async () => {
      const { parseAuth0Fragment } = await import('../auth0');
      expect(parseAuth0Fragment('#access_token=abc')).toBeNull();
      expect(parseAuth0Fragment('#refresh_token=def')).toBeNull();
      expect(parseAuth0Fragment('')).toBeNull();
    });

    it('drops an off-site destination rather than following it', async () => {
      const { parseAuth0Fragment } = await import('../auth0');
      // //evil.example is protocol-relative: the browser would leave the site.
      expect(parseAuth0Fragment('#access_token=a&refresh_token=b&next=//evil.example')?.next)
        .toBeNull();
      expect(parseAuth0Fragment('#access_token=a&refresh_token=b&next=https://evil.example')?.next)
        .toBeNull();
    });
  });

  describe('safeNextPath', () => {
    it('accepts same-site paths only', async () => {
      const { safeNextPath } = await import('../auth0');
      expect(safeNextPath('/dashboard')).toBe('/dashboard');
      expect(safeNextPath('//evil.example')).toBeNull();
      expect(safeNextPath('https://evil.example')).toBeNull();
      expect(safeNextPath('dashboard')).toBeNull();
      expect(safeNextPath(null)).toBeNull();
    });
  });

  describe('AUTH0_ENABLED', () => {
    it('stays off unless the flag is explicitly true', async () => {
      vi.stubEnv('VITE_AUTH0_ENABLED', 'false');
      expect((await import('../auth0')).AUTH0_ENABLED).toBe(false);

      vi.resetModules();
      vi.stubEnv('VITE_AUTH0_ENABLED', '');
      expect((await import('../auth0')).AUTH0_ENABLED).toBe(false);

      vi.resetModules();
      vi.stubEnv('VITE_AUTH0_ENABLED', 'TRUE');
      expect((await import('../auth0')).AUTH0_ENABLED).toBe(true);
    });
  });

  describe('auth0LogoutUrl', () => {
    it('ends the Auth0 session so the next sign-in is a real one', async () => {
      vi.stubEnv('VITE_AUTH0_DOMAIN', 'apas.us.auth0.com');
      vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'client-123');
      const { auth0LogoutUrl } = await import('../auth0');

      const url = new URL(auth0LogoutUrl('https://projos.ai/auth') as string);
      expect(url.origin).toBe('https://apas.us.auth0.com');
      expect(url.pathname).toBe('/v2/logout');
      expect(url.searchParams.get('client_id')).toBe('client-123');
      expect(url.searchParams.get('returnTo')).toBe('https://projos.ai/auth');
    });

    it('returns null when Auth0 is not configured, rather than a broken URL', async () => {
      vi.stubEnv('VITE_AUTH0_DOMAIN', '');
      vi.stubEnv('VITE_AUTH0_CLIENT_ID', '');
      const { auth0LogoutUrl } = await import('../auth0');
      expect(auth0LogoutUrl('https://projos.ai/auth')).toBeNull();
    });
  });

  describe('startAuth0', () => {
    it('asks the bridge for the URL instead of building /authorize itself', async () => {
      invoke.mockResolvedValue({ data: { url: 'https://apas.us.auth0.com/authorize?x=1' }, error: null });
      const assign = vi.fn();
      vi.stubGlobal('window', { ...window, location: { ...window.location, assign } });

      const { startAuth0 } = await import('../auth0');
      await startAuth0({ mode: 'signup', invitationToken: 'tok', next: '/dashboard' });

      expect(invoke).toHaveBeenCalledWith('auth0-authorize', {
        body: {
          mode: 'signup',
          invitationToken: 'tok',
          companyName: undefined,
          fullName: undefined,
          next: '/dashboard',
        },
      });
      expect(assign).toHaveBeenCalledWith('https://apas.us.auth0.com/authorize?x=1');
    });

    it('defaults to login mode', async () => {
      invoke.mockResolvedValue({ data: { url: 'https://apas.us.auth0.com/authorize' }, error: null });
      vi.stubGlobal('window', { ...window, location: { ...window.location, assign: vi.fn() } });

      const { startAuth0 } = await import('../auth0');
      await startAuth0();

      expect(invoke.mock.calls[0][1].body.mode).toBe('login');
    });

    it('surfaces the function error body rather than a generic failure', async () => {
      invoke.mockResolvedValue({
        data: null,
        error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
          context: new Response(
            JSON.stringify({ error: 'Invitation is invalid, expired, or already used' }),
            { status: 400 },
          ),
        }),
      });

      const { startAuth0 } = await import('../auth0');
      await expect(startAuth0({ invitationToken: 'dead' })).rejects.toThrow(
        'Invitation is invalid, expired, or already used',
      );
    });

    it('never navigates when the bridge returns no URL', async () => {
      invoke.mockResolvedValue({ data: {}, error: null });
      const assign = vi.fn();
      vi.stubGlobal('window', { ...window, location: { ...window.location, assign } });

      const { startAuth0 } = await import('../auth0');
      await expect(startAuth0()).rejects.toThrow('Could not start sign-in.');
      expect(assign).not.toHaveBeenCalled();
    });
  });
});
