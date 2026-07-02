import { describe, it, expect } from 'vitest';
import {
  isModuleVisible,
  defaultModuleVisible,
  buildModuleConfig,
  PROJECT_MODULE_CATALOG,
  CONSULTING_DEFAULT_MODULES,
  CONSULTING_ONLY_MODULES,
} from '../moduleVisibility';

describe('moduleVisibility', () => {
  it('shows every non-consulting-only module by default for property/client projects', () => {
    for (const def of PROJECT_MODULE_CATALOG) {
      const expected = !CONSULTING_ONLY_MODULES.has(def.slug);
      expect(isModuleVisible({ project_type: 'property' }, def.slug)).toBe(expected);
      expect(isModuleVisible({ project_type: 'client' }, def.slug)).toBe(expected);
    }
  });

  it('hides consulting-only modules by default off consulting projects, but allows override', () => {
    expect(isModuleVisible({ project_type: 'property' }, 'scope')).toBe(false);
    expect(isModuleVisible({ project_type: 'property', module_config: { scope: true } }, 'scope')).toBe(true);
  });

  it('treats an unknown/legacy project_type as fully visible', () => {
    expect(isModuleVisible({ project_type: null }, 'financials')).toBe(true);
    expect(isModuleVisible(null, 'rfis')).toBe(true);
  });

  it('hides construction modules by default on consulting projects', () => {
    expect(isModuleVisible({ project_type: 'consulting' }, 'financials')).toBe(false);
    expect(isModuleVisible({ project_type: 'consulting' }, 'rfis')).toBe(false);
    expect(isModuleVisible({ project_type: 'consulting' }, 'daily-logs')).toBe(false);
  });

  it('shows the consulting default set on consulting projects', () => {
    for (const slug of CONSULTING_DEFAULT_MODULES) {
      expect(defaultModuleVisible(slug, 'consulting')).toBe(true);
      expect(isModuleVisible({ project_type: 'consulting' }, slug)).toBe(true);
    }
  });

  it('lets an explicit override win over the type default', () => {
    // Turn a construction module back ON for a consulting project.
    expect(isModuleVisible({ project_type: 'consulting', module_config: { financials: true } }, 'financials')).toBe(true);
    // Turn a normally-visible module OFF for a property project.
    expect(isModuleVisible({ project_type: 'property', module_config: { overview: false } }, 'overview')).toBe(false);
  });

  it('buildModuleConfig emits an explicit boolean for every catalog slug', () => {
    const cfg = buildModuleConfig({ financials: false });
    expect(Object.keys(cfg).sort()).toEqual(PROJECT_MODULE_CATALOG.map((m) => m.slug).sort());
    expect(cfg.financials).toBe(false);
    // Unspecified slugs default to visible.
    expect(cfg.overview).toBe(true);
  });
});
