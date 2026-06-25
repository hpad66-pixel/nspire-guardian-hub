import { describe, it, expect } from 'vitest';
import {
  getProjectSector, SECTOR_CONFIG, SECTOR_ORDER, type ProjectSector,
} from '@/lib/projectSector';
import type { Project } from '@/hooks/useProjects';

const make = (over: Partial<any>): Project => ({
  id: 'p', name: 'P', status: 'active',
  ...over,
}) as Project;

describe('getProjectSector', () => {
  it('maps government client_type to government', () => {
    expect(getProjectSector(make({ project_type: 'client', client: { name: 'City', client_type: 'government' } }))).toBe('government');
  });

  it('maps business_client to private sector', () => {
    expect(getProjectSector(make({ project_type: 'client', client: { name: 'Acme', client_type: 'business_client' } }))).toBe('private');
  });

  it('maps property_management to property_mgmt', () => {
    expect(getProjectSector(make({ project_type: 'client', client: { name: 'PM Co', client_type: 'property_management' } }))).toBe('property_mgmt');
  });

  it('maps internal_org to internal', () => {
    expect(getProjectSector(make({ project_type: 'client', client: { name: 'HQ', client_type: 'internal_org' } }))).toBe('internal');
  });

  it('maps explicit "other" client_type to other', () => {
    expect(getProjectSector(make({ project_type: 'client', client: { name: 'X', client_type: 'other' } }))).toBe('other');
  });

  it('treats a property project with no client as the property sector', () => {
    expect(getProjectSector(make({ project_type: 'property', property: { name: 'Bldg' }, client: null }))).toBe('property');
  });

  it('falls back to other when nothing is resolvable', () => {
    expect(getProjectSector(make({ project_type: 'client', client: null }))).toBe('other');
  });
});

describe('SECTOR_CONFIG', () => {
  it('has a config entry with label/icon/colors for every ordered sector', () => {
    for (const key of SECTOR_ORDER) {
      const cfg = SECTOR_CONFIG[key as ProjectSector];
      expect(cfg).toBeTruthy();
      expect(cfg.label.length).toBeGreaterThan(0);
      expect(cfg.icon).toBeTruthy();
      expect(cfg.accent).toMatch(/^border-l-/);
    }
  });

  it('government and private (the two the user cares about) have distinct colors', () => {
    expect(SECTOR_CONFIG.government.dot).not.toBe(SECTOR_CONFIG.private.dot);
    expect(SECTOR_CONFIG.government.accent).not.toBe(SECTOR_CONFIG.private.accent);
  });
});
