const ALLOWED_FINANCIAL_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const FINANCIAL_UPLOAD_MAX_BYTES = 12 * 1024 * 1024;

function matchesSignature(bytes: Uint8Array, type: string): boolean {
  if (type === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (type === 'image/webp') {
    return new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF'
      && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

export async function validateFinancialEvidenceFile(file: File): Promise<void> {
  if (!ALLOWED_FINANCIAL_TYPES.has(file.type)) {
    throw new Error('Only PDF, JPG, PNG, or WebP documents are accepted.');
  }
  if (file.size <= 0 || file.size > FINANCIAL_UPLOAD_MAX_BYTES) {
    throw new Error('The document must be 12 MB or smaller.');
  }
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesSignature(header, file.type)) {
    throw new Error('The selected file content does not match its file type.');
  }
}
