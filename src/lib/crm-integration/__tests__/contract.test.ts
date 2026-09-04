import { describe, expect, it } from 'vitest';
import {
  readDuplicateCandidates,
  readSuggestedContact,
  STATE_COPY,
  validateCardFile,
} from '../contract';

describe('crm-integration.v1 browser contract', () => {
  it('reads only explicit OCR proposal values and does not invent missing fields', () => {
    expect(readSuggestedContact({
      fields: {
        displayName: { value: 'Maya Patel', confidence: 0.91 },
        email: { value: 'maya@example.test', confidence: 0.72 },
      },
    })).toEqual({ displayName: 'Maya Patel', email: 'maya@example.test' });
  });

  it('drops malformed duplicate candidates', () => {
    expect(readDuplicateCandidates({
      duplicateCandidates: [
        { id: 'contact-1', displayName: 'Maya Patel', score: 0.92 },
        { id: 'missing-name' },
        'unsafe',
      ],
    })).toEqual([{ id: 'contact-1', displayName: 'Maya Patel', score: 0.92 }]);
  });

  it('distinguishes user approval from CRM curator review', () => {
    expect(STATE_COPY.waiting_proj_os_approval.label).toBe('Waiting for your approval');
    expect(STATE_COPY.waiting_crm_review.label).toBe('Waiting for CRM administrator review');
  });

  it('rejects unsupported and oversized card files before upload', () => {
    expect(validateCardFile(new File(['text'], 'card.txt', { type: 'text/plain' }))).toMatch(/JPEG/);
    const oversized = new File([new Uint8Array(12_000_001)], 'card.jpg', { type: 'image/jpeg' });
    expect(validateCardFile(oversized)).toMatch(/12 MB/);
  });
});
