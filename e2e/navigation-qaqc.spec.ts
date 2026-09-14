import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

test.describe('navigation QAQC guardrails', () => {
  test('dashboard launchers point to mounted routes', () => {
    const navMap = read('src/lib/dashboard/navMap.ts');

    expect(navMap).toContain("to: '/organizations'");
    expect(navMap).toContain("to: '/inspections/daily'");
    expect(navMap).not.toContain("to: '/clients'");
    expect(navMap).not.toContain("to: '/daily-grounds'");
  });

  test('internal layout sends portal-only users to focused portal shells', () => {
    const layout = read('src/components/layout/AppLayout.tsx');
    const redirect = read('src/lib/portal/portalRedirect.ts');

    expect(layout).toContain('internalAppRedirectForPortalKind(portalKind)');
    expect(redirect).toContain("kind === 'owner'");
    expect(redirect).toContain("'/owner-portal'");
    expect(redirect).toContain("kind === 'ops'");
    expect(redirect).toContain("'/ops-portal'");
  });

  test('desktop and mobile navigation gate inactive modules', () => {
    const desktop = read('src/components/layout/AppSidebar.tsx');
    const mobile = read('src/components/layout/MobileNav.tsx');

    expect(desktop).toContain("label=\"Client Portals\"");
    expect(desktop).toContain('showWaterIntelligence');
    expect(desktop).toMatch(/isModuleEnabled\('clientPortalEnabled'\)[\s\S]*to="\/portals"/);
    expect(desktop).toMatch(/isModuleEnabled\('propertyMgmtEnabled'\)[\s\S]*label="Property Ops"/);

    expect(mobile).toContain('showOperationsSection');
    expect(mobile).toContain('showWaterIntelligence');
    expect(mobile).toContain('showEmail');
    expect(mobile).toContain('showTraining');
    expect(mobile).toContain('label="Home"');
  });
});
