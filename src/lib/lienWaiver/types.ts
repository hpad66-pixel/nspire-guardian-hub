/**
 * Lien Waiver & Release — the in-app branded waiver document.
 * One `LienWaiverSpec` fully describes a waiver: parties, the payment it is
 * tied to, exceptions, and the claimant's signature. It drives the on-screen
 * document, the print/PDF, and the signed/notarized artifact. The four types
 * mirror the lien_releases.release_type enum.
 */
export type WaiverType =
  | "conditional_progress"
  | "unconditional_progress"
  | "conditional_final"
  | "unconditional_final";

export interface WaiverSignatory {
  company?: string;
  name?: string;
  title?: string;
  date?: string;
}

export interface LienWaiverParties {
  /** The party giving up lien rights — the subcontractor / supplier. */
  claimant: { name: string; address?: string; by?: string; title?: string; email?: string };
  /** Who the claimant contracted with (the GC / customer). */
  customer: string;
  owner: string;
  project: string;
  property: string;
  /** Description of the claimant's work ("Work"). */
  scope?: string;
}

export interface LienWaiverPayment {
  /** Effective / "through" date — coverage cutoff. */
  through_date: string;
  /** Conditional: the payment to be made. Unconditional: the amount received. */
  amount: string;
  /** Conditional only — how payment is/will be made (e.g. Wire Transfer, Check #). */
  method?: string;
  /** Conditional only — maker of payment. */
  maker?: string;
  /** If full/partial payment is made to someone other than the claimant. */
  paid_to?: string;
}

export interface LienWaiverExceptions {
  /** Total of disputed claims expressly excluded from the release. */
  disputed_amount?: string;
  other?: string;
}

export interface LienWaiverDoc {
  waiver_no: string;
  pay_app_no?: string;
  date: string;
  wordmark?: string;
  footer?: string;
  /** Optional state whose statutory wording governs (informational + disclaimer). */
  jurisdiction?: string;
}

export interface LienWaiverSpec {
  doc: LienWaiverDoc;
  type: WaiverType;
  parties: LienWaiverParties;
  payment: LienWaiverPayment;
  exceptions: LienWaiverExceptions;
  /** The claimant (subcontractor) signature block. */
  signature: WaiverSignatory;
}

export const isUnconditional = (t: WaiverType) => t === "unconditional_progress" || t === "unconditional_final";
export const isFinal = (t: WaiverType) => t === "conditional_final" || t === "unconditional_final";
