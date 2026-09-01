import { describe, it, expect } from 'vitest';

/** Mirror of normalizeFields in extractPermit.ts for unit coverage without network. */
function normalizeFields(raw: Record<string, unknown> | null | undefined) {
  const base = {
    permit_number: '',
    description: '',
    department: '',
    trade: '',
    contractor: '',
    building: '',
    street_address: '',
    city: '',
    issued_on: '',
    expires_on: '',
    status_guess: 'unknown',
    issuing_authority: '',
    raw_text_summary: '',
    confidence: 0,
  };
  if (!raw || typeof raw !== 'object') return base;
  return {
    permit_number: String(raw.permit_number ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    department: String(raw.department ?? '').trim(),
    trade: String(raw.trade ?? '').trim(),
    contractor: String(raw.contractor ?? '').trim(),
    building: String(raw.building ?? '').trim(),
    street_address: String(raw.street_address ?? '').trim(),
    city: String(raw.city ?? '').trim(),
    issued_on: String(raw.issued_on ?? '').trim(),
    expires_on: String(raw.expires_on ?? '').trim(),
    status_guess: String(raw.status_guess ?? 'unknown').trim() || 'unknown',
    issuing_authority: String(raw.issuing_authority ?? '').trim(),
    raw_text_summary: String(raw.raw_text_summary ?? '').trim(),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : Number(raw.confidence) || 0,
  };
}

describe('permit OCR field normalize', () => {
  it('trims and fills defaults', () => {
    const out = normalizeFields({
      permit_number: '  PW-24040057 ',
      description: ' Sewer ',
      confidence: 0.91,
      status_guess: '',
    });
    expect(out.permit_number).toBe('PW-24040057');
    expect(out.description).toBe('Sewer');
    expect(out.confidence).toBe(0.91);
    expect(out.status_guess).toBe('unknown');
    expect(out.trade).toBe('');
  });

  it('handles null input', () => {
    expect(normalizeFields(null).permit_number).toBe('');
  });
});
