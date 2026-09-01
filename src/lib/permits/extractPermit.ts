import { supabase } from '@/integrations/supabase/client';
import { preparePermitScan } from '@/lib/permits/preparePermitScan';

export interface PermitOcrFields {
  permit_number: string;
  description: string;
  department: string;
  trade: string;
  contractor: string;
  building: string;
  street_address: string;
  city: string;
  issued_on: string;
  expires_on: string;
  status_guess: string;
  issuing_authority: string;
  raw_text_summary: string;
  confidence: number;
}

export interface PermitExtractResult {
  prepared: Awaited<ReturnType<typeof preparePermitScan>>;
  fields: PermitOcrFields;
  rawText: string;
}

function emptyFields(): PermitOcrFields {
  return {
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
}

function normalizeFields(raw: Partial<PermitOcrFields> | null | undefined): PermitOcrFields {
  const base = emptyFields();
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

/** On-device prep + edge AI OCR. */
export async function extractPermitFromFile(
  file: File,
  opts?: { notationHint?: string; projectId?: string | null },
): Promise<PermitExtractResult> {
  const prepared = await preparePermitScan(file);
  const { data, error } = await supabase.functions.invoke('extract-permit', {
    body: {
      imageBase64: prepared.base64,
      mediaType: prepared.mediaType,
      notationHint: opts?.notationHint ?? '',
      projectId: opts?.projectId ?? null,
    },
  });
  if (error) throw new Error(error.message || 'Permit OCR failed');
  if (data?.error) throw new Error(String(data.error));
  return {
    prepared,
    fields: normalizeFields(data?.fields),
    rawText: String(data?.rawText ?? data?.fields?.raw_text_summary ?? ''),
  };
}
