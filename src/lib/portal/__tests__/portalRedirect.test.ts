import { describe, expect, it } from 'vitest';
import { internalAppRedirectForPortalKind } from '../portalRedirect';

describe('internalAppRedirectForPortalKind', () => {
  it('keeps main workspace users in the internal app shell', () => {
    expect(internalAppRedirectForPortalKind('main')).toBeNull();
    expect(internalAppRedirectForPortalKind(null)).toBeNull();
  });

  it('routes external owner and ops users to their focused portals', () => {
    expect(internalAppRedirectForPortalKind('owner')).toBe('/owner-portal');
    expect(internalAppRedirectForPortalKind('ops')).toBe('/ops-portal');
  });
});
