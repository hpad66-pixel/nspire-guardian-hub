import { supabase } from "@/integrations/supabase/client";

export const CRM_CARD_CONTRACT_VERSION = "2026-09-01" as const;
export const CRM_CARD_SCAN_ENABLED = import.meta.env.VITE_CRM_CARD_SCAN_ENABLED === "true";

export type CardField = {
  field: "name" | "title" | "organization" | "email" | "phone" | "website" | "address";
  value: string;
  confidence: number;
  sourceSide: "front" | "back";
  reviewRequired: boolean;
};
export type DuplicateCandidate = {
  apasContactExternalId: string;
  displayName: string;
  matchScore: number;
  matchedOn: string[];
  safePreview: Record<string, string>;
};
export type IntakeResult = {
  intakeId: string;
  correlationId: string;
  state: "awaiting_upload" | "processing" | "processed" | "review_required" | "failed" | "completed";
  fields?: CardField[];
  duplicateCandidates?: DuplicateCandidate[];
  reason?: string;
  guidance?: string;
  failureCode?: string;
  message?: string;
  retryable?: boolean;
  uploads?: { front: SignedUpload; back?: SignedUpload };
};
type SignedUpload = { path: string; token: string };
export type ReviewedContact = {
  firstName: string; lastName: string; organization: string; title: string; email: string;
  phone: string; mobile: string; website: string; address: string; city: string;
  state: string; zipCode: string; country: string; contactType: string;
};
export type SourceContext = { eventOrLocation?: string; metOn?: string; notes?: string; tags: string[]; projectRole?: string };
export type ApprovalPreview = {
  approvalId: string; approvalToken: string; expiresAt: string;
  preview: { title: string; summary: string };
};

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("crm-card-intake", { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json().catch(() => null);
      throw new Error(payload?.error?.message ?? error.message);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error.message ?? "Card intake failed.");
  return data as T;
}

export async function checkCardScanEntitlement(projectId: string): Promise<boolean> {
  try {
    const result = await invoke<{ enabled: boolean }>({ operation: "entitlement", contractVersion: CRM_CARD_CONTRACT_VERSION, projectId });
    return result.enabled;
  } catch { return false; }
}

export async function scanBusinessCard(input: {
  projectId: string; front: File; back?: File; sourceContext: SourceContext;
  onProgress?: (message: string) => void;
}): Promise<IntakeResult> {
  if (input.front.size === 0 || input.front.size > 10 * 1024 * 1024 || (input.back && (input.back.size === 0 || input.back.size > 10 * 1024 * 1024))) {
    throw new Error("Each card image must be between 1 byte and 10 MB.");
  }
  if (input.back && normalizedMediaType(input.front) !== normalizedMediaType(input.back)) {
    throw new Error("The front and back images must use the same file type.");
  }
  const correlationId = crypto.randomUUID();
  const intakeIdempotency = crypto.randomUUID();
  input.onProgress?.("Preparing a private upload…");
  const [frontSha256, backSha256] = await Promise.all([sha256File(input.front), input.back ? sha256File(input.back) : undefined]);
  const intake = await invoke<IntakeResult>({
    operation: "create_intake", contractVersion: CRM_CARD_CONTRACT_VERSION,
    projectId: input.projectId, correlationId, idempotencyKey: intakeIdempotency,
    card: { mediaType: normalizedMediaType(input.front), frontSha256, ...(backSha256 ? { backSha256 } : {}) },
    sourceContext: input.sourceContext,
  });
  if (!intake.uploads) return intake;
  input.onProgress?.("Uploading the card securely…");
  const uploads = [upload(intake.uploads.front, input.front)];
  if (input.back && intake.uploads.back) uploads.push(upload(intake.uploads.back, input.back));
  await Promise.all(uploads);
  input.onProgress?.("Reading the card and checking APAS CRM…");
  return invoke<IntakeResult>({ operation: "process", contractVersion: CRM_CARD_CONTRACT_VERSION, intakeId: intake.intakeId });
}

export async function requestCardApproval(input: {
  intakeId: string; correlationId: string; kind: "create" | "update" | "link_existing";
  targetContactId?: string; reviewedFields: ReviewedContact; sourceContext: SourceContext;
}): Promise<ApprovalPreview> {
  return invoke({
    operation: "approval_preview", contractVersion: CRM_CARD_CONTRACT_VERSION,
    intakeId: input.intakeId, correlationId: input.correlationId, idempotencyKey: crypto.randomUUID(),
    action: { kind: input.kind, ...(input.targetContactId ? { targetContactId: input.targetContactId } : {}), reviewedFields: input.reviewedFields },
    sourceContext: input.sourceContext,
  });
}

export async function executeCardApproval(approval: ApprovalPreview) {
  return invoke<{ identity: { contactExternalId: string; projectDirectoryLinkExternalId: string }; replayed: boolean }>({
    operation: "execute", contractVersion: CRM_CARD_CONTRACT_VERSION,
    approvalId: approval.approvalId, approvalToken: approval.approvalToken,
  });
}

export function fieldsToContact(fields: CardField[]): ReviewedContact {
  const get = (name: CardField["field"]) => fields.find((field) => field.field === name)?.value ?? "";
  const fullName = get("name").trim(); const pieces = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: pieces.shift() ?? "", lastName: pieces.join(" "), organization: get("organization"), title: get("title"),
    email: get("email"), phone: get("phone"), mobile: "", website: get("website"), address: get("address"),
    city: "", state: "", zipCode: "", country: "USA", contactType: "other",
  };
}

async function upload(target: SignedUpload, file: File) {
  const { error } = await supabase.storage.from("crm-card-intake").uploadToSignedUrl(target.path, target.token, file, {
    contentType: normalizedMediaType(file), upsert: false,
  });
  if (error) throw new Error("The card image could not be uploaded securely.");
}
async function sha256File(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function normalizedMediaType(file: File) {
  if (file.type === "image/png" || file.type === "image/heic") return file.type;
  return "image/jpeg";
}
