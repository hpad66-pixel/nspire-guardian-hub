import { describe, expect, it, vi } from 'vitest';
import { drawStampOnCanvas } from '../stampPhoto';
import { DEFAULT_STAMP_SETTINGS } from '../types';

describe('drawStampOnCanvas', () => {
  it('draws a rounded card and stamp lines onto the canvas', () => {
    const calls: string[] = [];
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(() => calls.push('fill')),
      stroke: vi.fn(() => calls.push('stroke')),
      fillText: vi.fn((text: string) => calls.push(`text:${text}`)),
      measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
      font: '',
      textBaseline: 'alphabetic',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    const bundle = drawStampOnCanvas(ctx, 800, 600, {
      settings: {
        ...DEFAULT_STAMP_SETTINGS,
        customText: 'Filter change',
        position: 'bottom-left',
      },
      now: new Date(2026, 8, 1, 22, 22, 41),
      geo: {
        lat: 25.9,
        lng: -80.25,
        address: '13004 Alexandria Dr',
        capturedAt: new Date().toISOString(),
      },
      context: {
        workOrderLabel: 'WO-1842',
        unitLabel: 'Unit 5-204',
        technicianName: 'Hardeep',
      },
    });

    expect(bundle.when).toContain('2026');
    expect(bundle.locationLine).toBe('13004 Alexandria Dr');
    expect(calls.some((c) => c.startsWith('text:'))).toBe(true);
    expect(calls.filter((c) => c.startsWith('text:')).length).toBeGreaterThanOrEqual(3);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });
});
