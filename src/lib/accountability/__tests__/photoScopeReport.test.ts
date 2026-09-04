import { describe, expect, it } from 'vitest';
import { buildFieldPhotoScopeReport } from '../photoScopeReport';
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
});
