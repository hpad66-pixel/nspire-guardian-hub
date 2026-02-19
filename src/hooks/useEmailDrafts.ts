// Draft system uses localStorage for simplicity — no extra DB table needed.
// One draft slot per user (last-write-wins). Extend to multi-draft later.

const DRAFT_KEY = "pm_apas_email_draft";

export interface EmailDraft {
  subject: string;
  bodyHtml: string;
  recipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  messageType: "internal" | "external";
  savedAt: string; // ISO timestamp
}

export function saveDraft(draft: Omit<EmailDraft, "savedAt">): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() })
    );
  } catch {}
}

export function loadDraft(): EmailDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as EmailDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function hasDraft(): boolean {
  return localStorage.getItem(DRAFT_KEY) !== null;
}
