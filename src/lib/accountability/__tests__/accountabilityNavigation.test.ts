import { describe, expect, it } from 'vitest';
import {
  isDedicatedSiteAccountabilityProject,
  selectSiteAccountabilityProject,
  staffSiteAccountabilityPath,
} from '../accountabilityNavigation';

describe('site accountability navigation', () => {
  it('recognizes the explicit feature marker and legacy Glorieta marker', () => {
    expect(isDedicatedSiteAccountabilityProject({
      id: 'a',
      name: 'Evidence program',
      program_meta: { feature_key: 'site_accountability' },
    })).toBe(true);
    expect(isDedicatedSiteAccountabilityProject({
      id: 'b',
      name: 'Glorieta program',
      program_meta: { project_key: 'PMO-03' },
    })).toBe(true);
    expect(isDedicatedSiteAccountabilityProject({ id: 'c', name: 'Sewer extension' })).toBe(false);
  });

  it('keeps the shortcut inside the selected client and prefers its marked active record', () => {
    const selected = selectSiteAccountabilityProject([
      { id: 'other', name: 'Other Site Accountability', client_id: 'other', status: 'active' },
      { id: 'old', name: 'Old Site Accountability', client_id: 'r4', status: 'closed' },
      {
        id: 'glorieta',
        name: 'Glorieta Gardens — Site Accountability',
        client_id: 'r4',
        status: 'active',
        program_meta: { feature_key: 'site_accountability', owner_navigation_priority: true },
      },
    ], 'r4');

    expect(selected?.id).toBe('glorieta');
    expect(staffSiteAccountabilityPath(selected!.id)).toBe('/projects/glorieta/accountability');
  });
});
