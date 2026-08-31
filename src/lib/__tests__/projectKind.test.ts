import { describe, it, expect } from 'vitest';
import {
  projectKind,
  projectKindLabel,
  isProjectTypeMissing,
  projectKindBadgeClass,
  projectKindTileClass,
  groupProjectsByKind,
} from '@/lib/projectKind';

describe('projectKind', () => {
  it('maps consulting and client to consulting', () => {
    expect(projectKind({ project_type: 'consulting' })).toBe('consulting');
    expect(projectKind({ project_type: 'client' })).toBe('consulting');
    expect(projectKind({ project_type: 'Consulting' })).toBe('consulting');
  });

  it('maps property and construction to construction', () => {
    expect(projectKind({ project_type: 'property' })).toBe('construction');
    expect(projectKind({ project_type: 'construction' })).toBe('construction');
  });

  it('defaults unknown/empty to construction for billing fallback, but flags missing', () => {
    expect(projectKind({ project_type: null })).toBe('construction');
    expect(projectKind({ project_type: '' })).toBe('construction');
    expect(projectKind({ project_type: 'weird' })).toBe('construction');
    expect(isProjectTypeMissing({ project_type: null })).toBe(true);
    expect(isProjectTypeMissing({ project_type: '' })).toBe(true);
    expect(isProjectTypeMissing({ project_type: 'weird' })).toBe(true);
    expect(isProjectTypeMissing({ project_type: 'property' })).toBe(false);
    expect(isProjectTypeMissing({ project_type: 'consulting' })).toBe(false);
  });

  it('labels kinds in bold-ready Title Case', () => {
    expect(projectKindLabel('construction')).toBe('Construction');
    expect(projectKindLabel('consulting')).toBe('Consulting');
  });

  it('uses electrified green consulting and orange construction chrome', () => {
    expect(projectKindBadgeClass('consulting')).toContain('project-kind-badge-consulting');
    expect(projectKindBadgeClass('construction')).toContain('project-kind-badge-construction');
    // Solid dark-green consulting tiles + West-orange construction tiles
    expect(projectKindTileClass('consulting')).toContain('project-kind-tile-consulting');
    expect(projectKindTileClass('construction')).toContain('project-kind-tile-construction');
  });

  it('groups client portfolio into Construction then Consulting rows by name', () => {
    const grouped = groupProjectsByKind([
      { name: 'Stucco Repairs', project_type: 'consulting' },
      { name: 'Stormdrain Maintenance', project_type: 'property' },
      { name: 'Design and Modeling', project_type: 'consulting' },
      { name: 'Water Meter Box Program', project_type: 'consulting' },
      { name: 'Conveyance & Close-Out', project_type: 'property' },
    ]);
    expect(grouped.construction.map((p) => p.name)).toEqual([
      'Conveyance & Close-Out',
      'Stormdrain Maintenance',
    ]);
    expect(grouped.consulting.map((p) => p.name)).toEqual([
      'Design and Modeling',
      'Stucco Repairs',
      'Water Meter Box Program',
    ]);
    expect(grouped.missingType).toHaveLength(0);
  });
});
