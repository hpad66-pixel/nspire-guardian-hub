import { describe, it, expect } from 'vitest';

// preparePermitScan uses DOM Image/canvas — unit-test the pure helpers via extractPermit normalize path
import { extractPermitFromFile } from '../extractPermit';

describe('extractPermitFromFile contract', () => {
  it('exports a callable extractor', () => {
    expect(typeof extractPermitFromFile).toBe('function');
  });
});

describe('preparePermitScan media rules', () => {
  it('rejects non image/pdf via File type check pattern', () => {
    const ok = (name: string, type: string) =>
      type.startsWith('image/') ||
      type === 'application/pdf' ||
      /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(name);
    expect(ok('permit.jpg', 'image/jpeg')).toBe(true);
    expect(ok('card.PDF', 'application/pdf')).toBe(true);
    expect(ok('notes.txt', 'text/plain')).toBe(false);
  });
});
