import { describe, expect, it } from 'vitest';
import { canEditFieldPhotoCaption } from '../photoOwnership';

describe('field photo caption ownership', () => {
  it('allows the uploader to edit their own caption', () => {
    expect(canEditFieldPhotoCaption('user-a', 'user-a')).toBe(true);
  });

  it('does not allow another user to edit the uploader caption', () => {
    expect(canEditFieldPhotoCaption('user-a', 'user-b')).toBe(false);
  });

  it('does not grant edit access when ownership is unknown', () => {
    expect(canEditFieldPhotoCaption(null, 'user-a')).toBe(false);
    expect(canEditFieldPhotoCaption('user-a', null)).toBe(false);
  });
});
