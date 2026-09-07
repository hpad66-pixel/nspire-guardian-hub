import { describe, expect, it } from 'vitest';
import {
  buildFieldPhotoScopeReport,
  buildPhotoScopeGroups,
  classifyScopeIssue,
  HUD_READINESS_DELIVERY_PACKAGES,
} from '../photoScopeReport';
import type { FieldPhoto } from '@/hooks/useFieldAccountability';

function photo(overrides: Partial<FieldPhoto> = {}): FieldPhoto {
  return {
    id: 'link-1', tenant_id: 'tenant', project_id: 'project', visit_id: 'visit', item_id: null,
    photo_id: 'photo-1', evidence_type: 'observation', sort_order: 0,
    ai_suggestion: { caption: 'Visible standing water', category: 'grounds', severity: 'high', clarification_questions: ['Confirm the drainage cause.'] },
    review_status: 'ai_drafted', created_at: '2026-08-31T18:00:00Z',
    photo: { id: 'photo-1', uploader_id: 'user', storage_path: 'tenant/project/IMG_1209.JPEG', thumb_path: null, taken_at: '2026-08-31T18:00:00Z', lat: 25.9, lng: -80.3, caption: null, exif: { source_filename: 'IMG_1209.JPEG' }, created_at: '2026-08-31T18:00:00Z' },
    ...overrides,
  };
}

function numberedPhoto(number: number): FieldPhoto {
  const filename = `IMG_${number}.JPEG`;
  return photo({
    id: `link-${number}`,
    photo_id: `photo-${number}`,
    sort_order: number - 1209,
    photo: {
      ...photo().photo,
      id: `photo-${number}`,
      storage_path: `tenant/project/${filename}`,
      exif: { source_filename: filename },
    },
  });
}

describe('field photo scope report', () => {
  it('keeps AI drafts separate from confirmed findings', () => {
    const html = buildFieldPhotoScopeReport({
      projectName: 'Glorieta Gardens — Site Accountability',
      photos: [photo(), photo({ id: 'link-2', photo_id: 'photo-2', review_status: 'confirmed', reviewed_narrative: 'Administrator confirmed ponding at the walk edge.' })],
      items: [],
    });
    expect(html).toContain('AI draft / pending review');
    expect(html).toContain('Confirmed');
    expect(html).toContain('Administrator confirmed ponding');
    expect(html).toContain('IMG_1209.JPEG');
  });

  it('escapes project and review text', () => {
    const html = buildFieldPhotoScopeReport({ projectName: '<Unsafe>', photos: [photo({ reviewed_narrative: '<script>alert(1)</script>' })], items: [] });
    expect(html).toContain('&lt;Unsafe&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('turns the complete Glorieta walk into ten granular owner work packages', () => {
    const photos = Array.from({ length: 153 }, (_, index) => numberedPhoto(1209 + index));
    const groups = buildPhotoScopeGroups(photos, []);
    expect(groups).toHaveLength(10);
    expect(groups.reduce((sum, group) => sum + group.issues.length, 0)).toBe(74);
    expect(groups[0].representativePhotos.map((entry) => entry.photo.exif?.source_filename)).toEqual([
      'IMG_1209.JPEG', 'IMG_1214.JPEG', 'IMG_1223.JPEG',
    ]);
    expect(groups[8].title).toContain('sidewalk-edge voids');
    expect(groups[9].issues.some((issue) => issue.title.includes('gate-control'))).toBe(true);
  });

  it('places secure representative thumbnails in the printable HTML', () => {
    const photos = Array.from({ length: 153 }, (_, index) => numberedPhoto(1209 + index));
    const html = buildFieldPhotoScopeReport({
      projectName: 'Glorieta Gardens — Site Accountability',
      photos,
      items: [],
      imageUrls: { 'link-1209': 'https://example.test/signed-photo.jpg?token=secure&view=owner' },
    });
    expect(html).toContain('Owner Condition &amp;');
    expect(html).toContain('74</b><span>Scope line items');
    expect(html).toContain('https://example.test/signed-photo.jpg?token=secure&amp;view=owner');
    expect(html).toContain('Uncovered gate-control device');
    expect(html).toContain('Expedited owner direction · HUD inspection readiness');
    expect(html).toContain('Combined stucco + civil restoration package');
    expect(html).toContain('Trade assignment');
  });

  it('assigns every recommendation to one or more accountable disciplines', () => {
    const photos = Array.from({ length: 153 }, (_, index) => numberedPhoto(1209 + index));
    const groups = buildPhotoScopeGroups(photos, []);
    const issues = groups.flatMap((group) => group.issues);
    expect(issues.every((issue) => classifyScopeIssue(issue).length > 0)).toBe(true);

    const gateControl = issues.find((issue) => issue.title.includes('gate-control'))!;
    expect(classifyScopeIssue(gateControl)).toEqual(expect.arrayContaining(['Electrical', 'General Contractor']));

    const walkVoid = issues.find((issue) => issue.title === 'Open void beside concrete walk')!;
    expect(classifyScopeIssue(walkVoid)).toEqual(expect.arrayContaining(['Civil', 'Structural Engineering', 'General Contractor']));

    const planting = issues.find((issue) => issue.title === 'Fence-line planting-bed restoration')!;
    expect(classifyScopeIssue(planting)).toEqual(expect.arrayContaining(['Plumbing', 'Landscaping']));
    expect(HUD_READINESS_DELIVERY_PACKAGES).toHaveLength(6);
  });
});
