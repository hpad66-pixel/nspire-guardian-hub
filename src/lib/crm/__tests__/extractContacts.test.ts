import { describe, it, expect } from 'vitest';
import { buildCandidates, excludeExisting, splitName } from '../extractContacts';

describe('splitName', () => {
  it('splits a two-word name into first/last', () => {
    expect(splitName('Chris Sullivan')).toEqual({ first: 'Chris', last: 'Sullivan' });
  });

  it('treats a single-word name as first name only', () => {
    expect(splitName('Bala')).toEqual({ first: 'Bala', last: null });
  });

  it('joins everything after the first token into last name', () => {
    expect(splitName('D Shin Plumbing')).toEqual({ first: 'D', last: 'Shin Plumbing' });
  });
});

describe('buildCandidates', () => {
  it('merges mentions that share an email, combining sources and filling gaps', () => {
    const candidates = buildCandidates([
      { name: 'Chris Sullivan', email: 'csullivan@r4cap.com', source: 'Correspondence' },
      { name: 'Chris Sullivan', email: 'csullivan@r4cap.com', company: 'R4 Capital', source: 'Prime Contract' },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      first_name: 'Chris',
      last_name: 'Sullivan',
      email: 'csullivan@r4cap.com',
      company_name: 'R4 Capital',
      mentionCount: 2,
      sources: ['Correspondence', 'Prime Contract'],
    });
  });

  it('dedups by normalized name+company when no email is present', () => {
    const candidates = buildCandidates([
      { name: "D'Shin Plumbing", contactType: 'vendor', source: 'Purchase Order' },
      { name: "D'shin Plumbing", contactType: 'vendor', source: 'Purchase Order' },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].mentionCount).toBe(2);
  });

  it('keeps distinct people with the same first name separate when emails differ', () => {
    const candidates = buildCandidates([
      { name: 'Bala', email: 'bala@vendorco.com', source: 'Meeting' },
      { name: 'Bala', email: 'bala.k@othervendor.com', source: 'Meeting' },
    ]);
    expect(candidates).toHaveLength(2);
  });

  it('drops automated-sender names', () => {
    const candidates = buildCandidates([
      { name: 'no-reply', email: 'no-reply@github.com', source: 'Correspondence' },
      { name: 'Notifications', email: 'notifications@example.com', source: 'Correspondence' },
    ]);
    expect(candidates).toHaveLength(0);
  });

  it('ignores mentions with no usable name', () => {
    const candidates = buildCandidates([
      { name: null, email: 'someone@example.com', source: 'Correspondence' },
      { name: '  ', source: 'Correspondence' },
    ]);
    expect(candidates).toHaveLength(0);
  });
});

describe('excludeExisting', () => {
  it('drops a candidate whose email already exists', () => {
    const candidates = buildCandidates([
      { name: 'Chris Sullivan', email: 'csullivan@r4cap.com', source: 'Correspondence' },
    ]);
    const result = excludeExisting(candidates, [
      { email: 'CSullivan@R4cap.com', first_name: 'Chris', last_name: 'S.' },
    ]);
    expect(result).toHaveLength(0);
  });

  it('drops a candidate whose name already exists even without a matching email', () => {
    const candidates = buildCandidates([
      { name: 'Chris Sullivan', source: 'Meeting' },
    ]);
    const result = excludeExisting(candidates, [
      { email: null, first_name: 'chris', last_name: 'sullivan' },
    ]);
    expect(result).toHaveLength(0);
  });

  it('keeps a candidate that matches nothing existing', () => {
    const candidates = buildCandidates([
      { name: 'Airia Austin', source: 'Correspondence' },
    ]);
    const result = excludeExisting(candidates, [
      { email: null, first_name: 'Chris', last_name: 'Sullivan' },
    ]);
    expect(result).toHaveLength(1);
  });
});
