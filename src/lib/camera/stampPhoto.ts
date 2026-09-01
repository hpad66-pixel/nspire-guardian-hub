import { buildStampLines, flattenStampLines } from './formatStamp';
import type { GeoFix, StampContext, StampLineBundle, StampPosition, StampSettings } from './types';
import { STAMP_COLOR_HEX } from './types';

export interface StampDrawOpts {
  settings: StampSettings;
  geo?: GeoFix | null;
  context?: StampContext | null;
  now?: Date;
  /** Override pre-built lines (e.g. frozen capture time). */
  lines?: StampLineBundle;
}

function positionOrigin(
  position: StampPosition,
  canvasW: number,
  canvasH: number,
  boxW: number,
  boxH: number,
  pad: number,
): { x: number; y: number } {
  switch (position) {
    case 'top-left':
      return { x: pad, y: pad };
    case 'top-center':
      return { x: (canvasW - boxW) / 2, y: pad };
    case 'top-right':
      return { x: canvasW - boxW - pad, y: pad };
    case 'bottom-center':
      return { x: (canvasW - boxW) / 2, y: canvasH - boxH - pad };
    case 'bottom-right':
      return { x: canvasW - boxW - pad, y: canvasH - boxH - pad };
    case 'bottom-left':
    default:
      return { x: pad, y: canvasH - boxH - pad };
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Draw the timestamp stamp onto an existing canvas (video frame or photo). */
export function drawStampOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  opts: StampDrawOpts,
): StampLineBundle {
  const bundle =
    opts.lines ??
    buildStampLines(opts.settings, {
      now: opts.now,
      geo: opts.geo,
      context: opts.context,
    });
  const lines = flattenStampLines(bundle);
  if (lines.length === 0) return bundle;

  const scale = Math.max(0.75, Math.min(2.2, canvasW / 720));
  const fontPx = Math.round(opts.settings.fontSize * scale);
  const pad = Math.round(14 * scale);
  const lineGap = Math.round(fontPx * 1.28);
  const cardPadX = Math.round(12 * scale);
  const cardPadY = Math.round(10 * scale);

  ctx.save();
  ctx.font = `600 ${fontPx}px "JetBrains Mono", "SF Mono", ui-monospace, monospace`;
  ctx.textBaseline = 'top';

  let maxW = 0;
  for (const line of lines) {
    maxW = Math.max(maxW, ctx.measureText(line).width);
  }
  const boxW = maxW + cardPadX * 2;
  const boxH = lines.length * lineGap + cardPadY * 2 - (lineGap - fontPx);
  const { x, y } = positionOrigin(opts.settings.position, canvasW, canvasH, boxW, boxH, pad);

  const opacity = opts.settings.opacity;
  // Dark card behind light text; light card behind black text
  const darkText = opts.settings.textColor === 'black';
  ctx.fillStyle = darkText
    ? `rgba(255, 255, 255, ${0.72 * opacity})`
    : `rgba(8, 12, 18, ${0.62 * opacity})`;
  roundRect(ctx, x, y, boxW, boxH, Math.round(10 * scale));
  ctx.fill();

  ctx.strokeStyle = darkText
    ? `rgba(15, 23, 42, ${0.18 * opacity})`
    : `rgba(255, 255, 255, ${0.18 * opacity})`;
  ctx.lineWidth = Math.max(1, scale);
  roundRect(ctx, x, y, boxW, boxH, Math.round(10 * scale));
  ctx.stroke();

  const color = STAMP_COLOR_HEX[opts.settings.textColor];
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  let ty = y + cardPadY;
  for (const line of lines) {
    ctx.fillText(line, x + cardPadX, ty);
    ty += lineGap;
  }
  ctx.restore();
  return bundle;
}

async function blobToImageBitmap(source: Blob | ImageBitmap | HTMLVideoElement | HTMLCanvasElement): Promise<ImageBitmap> {
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) return source;
  if (source instanceof HTMLVideoElement || source instanceof HTMLCanvasElement) {
    return createImageBitmap(source);
  }
  return createImageBitmap(source as Blob);
}

export interface StampedPhotoResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  lines: StampLineBundle;
  takenAt: string;
}

/**
 * Burn date/time/location/context into image pixels (JPEG).
 * Accepts a captured Blob, File, video frame, or canvas.
 */
export async function stampPhoto(
  source: Blob | ImageBitmap | HTMLVideoElement | HTMLCanvasElement,
  opts: StampDrawOpts & { quality?: number; maxEdge?: number },
): Promise<StampedPhotoResult> {
  const bmp = await blobToImageBitmap(source);
  try {
    const maxEdge = opts.maxEdge ?? 1920;
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height, 1));
    const width = Math.max(1, Math.round(bmp.width * scale));
    const height = Math.max(1, Math.round(bmp.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    ctx.drawImage(bmp, 0, 0, width, height);
    const now = opts.now ?? new Date();
    const lines = drawStampOnCanvas(ctx, width, height, { ...opts, now });

    const quality = opts.quality ?? 0.88;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode stamped photo'))),
        'image/jpeg',
        quality,
      );
    });
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return {
      blob,
      dataUrl,
      width,
      height,
      lines,
      takenAt: now.toISOString(),
    };
  } finally {
    if (typeof bmp.close === 'function') bmp.close();
  }
}
