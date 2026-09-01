/**
 * On-device prep for permit OCR: resize/compress camera captures before the
 * edge extract-permit call. Keeps payloads small on mobile without a new OCR library.
 */

export interface PreparedPermitScan {
  blob: Blob;
  dataUrl: string;
  base64: string;
  mediaType: string;
  fileName: string;
  width: number;
  height: number;
}

const MAX_EDGE = 1800;
const JPEG_QUALITY = 0.82;

function stripDataUrlPrefix(dataUrl: string): string {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

async function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Prepare a camera/file capture for edge OCR.
 * - Images → JPEG, max edge 1800px
 * - PDFs → pass through as-is (base64)
 */
export async function preparePermitScan(file: File): Promise<PreparedPermitScan> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const dataUrl = await readAsDataUrl(file);
    return {
      blob: file,
      dataUrl,
      base64: stripDataUrlPrefix(dataUrl),
      mediaType: 'application/pdf',
      fileName: file.name || `permit-${Date.now()}.pdf`,
      width: 0,
      height: 0,
    };
  }

  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    throw new Error('Please choose a photo or PDF of the permit');
  }

  // HEIC / undecodable formats: fall back to raw upload (edge still accepts).
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    // Soft contrast lift helps OCR on phone photos of paper permits.
    ctx.filter = 'contrast(1.08) brightness(1.03)';
    ctx.drawImage(img, 0, 0, width, height);
    ctx.filter = 'none';

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compress failed'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });

    const dataUrl = await readAsDataUrl(blob);
    return {
      blob,
      dataUrl,
      base64: stripDataUrlPrefix(dataUrl),
      mediaType: 'image/jpeg',
      fileName: (file.name || `permit-${Date.now()}`).replace(/\.[^.]+$/, '') + '.jpg',
      width,
      height,
    };
  } catch {
    const dataUrl = await readAsDataUrl(file);
    return {
      blob: file,
      dataUrl,
      base64: stripDataUrlPrefix(dataUrl),
      mediaType: file.type || 'image/jpeg',
      fileName: file.name || `permit-${Date.now()}.jpg`,
      width: 0,
      height: 0,
    };
  }
}
