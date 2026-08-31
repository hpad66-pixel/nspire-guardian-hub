import { describe, it, expect } from 'vitest';
import {
  isModuleVisible,
  defaultModuleVisible,
  buildModuleConfig,
  resolveModuleVisible,
  portalModulesForProject,
  PROJECT_MODULE_CATALOG,
  CONSULTING_DEFAULT_MODULES,
  CONSULTING_ONLY_MODULES,
  CONSTRUCTION_FIELD_MODULES,
  MODULE_PRESETS,
  LOCKED_MODULES,
} from '../moduleVisibility';

describe('moduleVisibility', () => {
  it('shows every non-consulting-only module by default for property/construction projects', () => {
    for (const def of PROJECT_MODULE_CATALOG) {
      if (LOCKED_MODULES.has(def.slug)) {
        expect(isModuleVisible({ project_type: 'property' }, def.slug)).toBe(true);
        continue;
      }
      const expected = !CONSULTING_ONLY_MODULES.has(def.slug);
      expect(isModuleVisible({ project_type: 'property' }, def.slug)).toBe(expected);
      expect(isModuleVisible({ project_type: 'construction' }, def.slug)).toBe(expected);
    }
  });

  it('uses consulting defaults for client and consulting project types', () => {
    for (const slug of CONSULTING_DEFAULT_MODULES) {
      expect(isModuleVisible({ project_type: 'consulting' }, slug)).toBe(true);
      expect(isModuleVisible({ project_type: 'client' }, slug)).toBe(true);
    }
    for (const slug of CONSTRUCTION_FIELD_MODULES) {
      expect(isModuleVisible({ project_type: 'consulting' }, slug)).toBe(false);
      expect(isModuleVisible({ project_type: 'client' }, slug)).toBe(false);
    }
  });

  it('hides consulting-only modules by default off consulting projects, but allows override', () => {
    expect(isModuleVisible({ project_type: 'property' }, 'scope')).toBe(false);
    expect(isModuleVisible({ project_type: 'property', module_config: { scope: true } }, 'scope')).toBe(true);
  });

  it('treats an unknown/legacy project_type as construction-visible', () => {
    expect(isModuleVisible({ project_type: null }, 'financials')).toBe(true);
    expect(isModuleVisible(null, 'rfis')).toBe(true);
  });

  it('keeps commercial controls visible on consulting projects', () => {
    expect(isModuleVisible({ project_type: 'consulting' }, 'financials')).toBe(true);
    expect(isModuleVisible({ project_type: 'consulting' }, 'contracts')).toBe(true);
    expect(isModuleVisible({ project_type: 'consulting' }, 'directory')).toBe(true);
  });

  it('keeps the same client update workflow visible on every project type', () => {
    expect(isModuleVisible({ project_type: 'consulting' }, 'client-updates')).toBe(true);
    expect(isModuleVisible({ project_type: 'property' }, 'client-updates')).toBe(true);
    expect(isModuleVisible({ project_type: 'client' }, 'client-updates')).toBe(true);
  });

  it('still hides field-construction modules by default on consulting projects', () => {
    expect(isModuleVisible({ project_type: 'consulting' }, 'rfis')).toBe(false);
    expect(isModuleVisible({ project_type: 'consulting' }, 'daily-logs')).toBe(false);
    expect(isModuleVisible({ project_type: 'consulting' }, 'procurement')).toBe(false);
    expect(isModuleVisible({ project_type: 'consulting' }, 'safety')).toBe(false);
  });

  it('lets an explicit override win over the type default', () => {
    expect(isModuleVisible({ project_type: 'consulting', module_config: { financials: true } }, 'financials')).toBe(true);
    expect(isModuleVisible({ project_type: 'property', module_config: { overview: false } }, 'overview')).toBe(true); // locked
    expect(isModuleVisible({ project_type: 'property', module_config: { safety: false } }, 'safety')).toBe(false);
  });

  it('inherits from parent when module_inherit_from_parent is set', () => {
    const parent = { project_type: 'property', module_config: { safety: false, procurement: true } };
    const child = {
      project_type: 'consulting',
      module_inherit_from_parent: true,
      parent_project_id: 'parent-1',
      module_config: { rfis: true }, // local override
    };
    expect(resolveModuleVisible(child, 'safety', parent)).toBe(false);
    expect(resolveModuleVisible(child, 'procurement', parent)).toBe(true);
    expect(resolveModuleVisible(child, 'rfis', parent)).toBe(true);
  });

  it('maps portal modules from project config', () => {
    const enabled = portalModulesForProject({
      project_type: 'consulting',
      module_config: { schedule: false, 'client-updates': true, repository: true },
    });
    expect(enabled.has('overview')).toBe(true);
    expect(enabled.has('updates')).toBe(true);
    expect(enabled.has('documents')).toBe(true);
    expect(enabled.has('schedule')).toBe(false);
  });

  it('surfaces permits on the owner portal when the construction module is on', () => {
    const enabled = portalModulesForProject({ project_type: 'property' });
    expect(enabled.has('permits')).toBe(true);
    expect(defaultModuleVisible('permits', 'consulting')).toBe(false);
    expect(defaultModuleVisible('permits', 'property')).toBe(true);
  });

  it('buildModuleConfig emits an explicit boolean for every catalog slug', () => {
    const cfg = buildModuleConfig({ financials: false });
    expect(Object.keys(cfg).sort()).toEqual(PROJECT_MODULE_CATALOG.map((m) => m.slug).sort());
    expect(cfg.financials).toBe(false);
    expect(cfg.overview).toBe(true); // locked
  });

  it('consulting-lean preset hides field modules', () => {
    const cfg = MODULE_PRESETS.find((p) => p.id === 'consulting-lean')!.apply('consulting');
    expect(cfg.safety).toBe(false);
    expect(cfg.procurement).toBe(false);
    expect(cfg.invoicing).toBe(true);
    expect(cfg.directory).toBe(true);
  });

  it('defaultModuleVisible matches kind', () => {
    expect(defaultModuleVisible('invoicing', 'consulting')).toBe(true);
    expect(defaultModuleVisible('invoicing', 'property')).toBe(false);
    expect(defaultModuleVisible('rfis', 'property')).toBe(true);
  });
});
