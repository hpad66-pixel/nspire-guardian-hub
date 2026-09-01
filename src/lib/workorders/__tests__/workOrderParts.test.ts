import { describe, expect, it } from 'vitest';
import {
  canMarkPartInstalled,
  partsCompletionBlocker,
  pendingPartsCount,
  workOrderPartsReadyToComplete,
} from '../workOrderParts';

describe('workOrderParts helpers', () => {
  it('requires both photos before install', () => {
    expect(
      canMarkPartInstalled({
        id: '1',
        status: 'assigned',
        before_photo_url: null,
        after_photo_url: null,
      }),
    ).toBe(false);
    expect(
      canMarkPartInstalled({
        id: '1',
        status: 'assigned',
        before_photo_url: 'https://x/before.jpg',
        after_photo_url: null,
      }),
    ).toBe(false);
    expect(
      canMarkPartInstalled({
        id: '1',
        status: 'assigned',
        before_photo_url: 'https://x/before.jpg',
        after_photo_url: 'https://x/after.jpg',
      }),
    ).toBe(true);
  });

  it('blocks completion while parts are still assigned', () => {
    const parts = [
      {
        id: 'a',
        status: 'assigned',
        before_photo_url: 'https://x/b.jpg',
        after_photo_url: 'https://x/a.jpg',
      },
    ];
    expect(pendingPartsCount(parts)).toBe(1);
    expect(workOrderPartsReadyToComplete(parts)).toBe(false);
    expect(partsCompletionBlocker(parts)).toMatch(/marked Installed/i);
  });

  it('allows completion when all parts are installed with photos', () => {
    const parts = [
      {
        id: 'a',
        status: 'installed',
        before_photo_url: 'https://x/b.jpg',
        after_photo_url: 'https://x/a.jpg',
      },
      {
        id: 'b',
        status: 'cancelled',
        before_photo_url: null,
        after_photo_url: null,
      },
    ];
    expect(workOrderPartsReadyToComplete(parts)).toBe(true);
    expect(partsCompletionBlocker(parts)).toBeNull();
  });

  it('allows completion when there are no parts', () => {
    expect(workOrderPartsReadyToComplete([])).toBe(true);
    expect(partsCompletionBlocker([])).toBeNull();
  });

  it('prompts for before+after photos when assigned parts lack them', () => {
    const msg = partsCompletionBlocker([
      { id: '1', status: 'assigned', before_photo_url: null, after_photo_url: null },
    ]);
    expect(msg).toMatch(/before \+ after photos/i);
  });
});
