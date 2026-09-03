import { describe, it, expect } from 'vitest';
import { getProjectNav, routedTabDestinations, PROJECT_NAV_ITEMS } from '../projectNav';

describe('projectNav', () => {
  it('groups consulting nav into Engagement / Delivery / Commercial / Client', () => {
    const { kind, groups, items } = getProjectNav({
      project: { project_type: 'consulting' },
      isAdmin: true,
    });
    expect(kind).toBe('consulting');
    expect(groups.map((g) => g.key)).toContain('engagement');
    expect(groups.map((g) => g.key)).toContain('commercial');
    expect(items.find((i) => i.value === 'financials')).toBeTruthy();
    expect(items.find((i) => i.value === 'invoicing')).toBeTruthy();
    expect(items.find((i) => i.value === 'directory')).toBeTruthy();
    expect(items.find((i) => i.value === 'admin')).toBeTruthy();
    // Permits available on consulting for phone OCR / closeout
    expect(items.find((i) => i.value === 'permits')).toBeTruthy();
    expect(items.find((i) => i.value === 'accountability')?.route?.('proj-1')).toBe('/projects/proj-1/accountability');
    // Field construction modules hidden by default
    expect(items.find((i) => i.value === 'rfis')).toBeFalsy();
    expect(items.find((i) => i.value === 'safety')).toBeFalsy();
    expect(items.find((i) => i.value === 'procurement')).toBeFalsy();
  });

  it('shows construction field modules on property projects', () => {
    const { kind, items } = getProjectNav({
      project: { project_type: 'property' },
      isAdmin: false,
    });
    expect(kind).toBe('construction');
    expect(items.find((i) => i.value === 'rfis')).toBeTruthy();
    expect(items.find((i) => i.value === 'permits')).toBeTruthy();
    // Permits should sit near the top of Field for easy PWA discovery
    const fieldOrder = items.filter((i) => i.group === 'field').map((i) => i.value);
    expect(fieldOrder.indexOf('permits')).toBeLessThan(fieldOrder.indexOf('rfis'));
    expect(items.find((i) => i.value === 'site-map')).toBeTruthy();
    // Stores is opt-in — hidden until Project Admin enables it
    expect(items.find((i) => i.value === 'stores')).toBeFalsy();
    expect(items.find((i) => i.value === 'voice-agent')).toBeFalsy();
    expect(items.find((i) => i.value === 'pay-apps' as never)).toBeFalsy();
    expect(items.find((i) => i.value === 'financials')).toBeTruthy();
    // Admin tab only for admins
    expect(items.find((i) => i.value === 'admin')).toBeFalsy();
    // Consulting-only hidden
    expect(items.find((i) => i.value === 'invoicing')).toBeFalsy();
  });

  it('shows Stores when the admin turns the optional module on', () => {
    const { items } = getProjectNav({
      project: { project_type: 'property', module_config: { stores: true } },
      isAdmin: true,
    });
    expect(items.find((i) => i.value === 'stores')).toBeTruthy();
  });

  it('shows Voice Complaints when the optional module is enabled', () => {
    const { items } = getProjectNav({
      project: { project_type: 'construction', module_config: { 'voice-agent': true } },
      isAdmin: true,
    });
    expect(items.find((i) => i.value === 'voice-agent')?.label).toBe('Voice Complaints');
  });

  it('hides modules the admin turned off', () => {
    const { items } = getProjectNav({
      project: {
        project_type: 'property',
        module_config: { safety: false, procurement: false, directory: true },
      },
      isAdmin: true,
    });
    expect(items.find((i) => i.value === 'safety')).toBeFalsy();
    expect(items.find((i) => i.value === 'procurement')).toBeFalsy();
    expect(items.find((i) => i.value === 'directory')).toBeTruthy();
  });

  it('routes financials, directory, and admin to dedicated pages', () => {
    const routes = routedTabDestinations('proj-1');
    expect(routes.financials).toBe('/projects/proj-1/financials/overview');
    expect(routes.directory).toBe('/projects/proj-1/directory');
    expect(routes.admin).toBe('/projects/proj-1/admin');
    expect(routes.invoicing).toBe('/projects/proj-1/financials/client-invoices');
    expect(routes.accountability).toBe('/projects/proj-1/accountability');
  });

  it('keeps a single catalog entry per module slug', () => {
    const slugs = PROJECT_NAV_ITEMS.map((i) => i.value);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
