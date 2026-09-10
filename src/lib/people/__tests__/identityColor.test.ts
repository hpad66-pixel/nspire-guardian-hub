import { describe, expect, it } from 'vitest';
import { identityColor } from '../identityColor';

describe('identityColor', () => {
  it('assigns the same person the same visual identity', () => {
    expect(identityColor('Simi Patel')).toEqual(identityColor('simi patel'));
  });

  it('distinguishes common project owners and handles unassigned work', () => {
    expect(identityColor('Simi Patel')).not.toEqual(identityColor('Rohit Patel'));
    expect(identityColor('')).toEqual(identityColor('Unassigned'));
  });
});
