/**
 * Pure lien-waiver policy helpers (F0). Mirrors the DB lien-gate trigger so the
 * UI can disable/explain before the user attempts a payment. The DB remains the
 * hard guard — these helpers must never be the only check.
 */

export type ReleaseType =
  | "conditional_progress"
  | "unconditional_progress"
  | "conditional_final"
  | "unconditional_final";

export type PaymentKind = "progress" | "final";

export interface LienReleaseLike {
  direction: "inbound" | "outbound";
  release_type: ReleaseType;
  status: string; // 'pending' | 'submitted' | 'approved' | ...
}

/**
 * Release types that satisfy a given payment kind.
 * - progress payment: any approved waiver through the period (conditional progress is the minimum)
 * - final / retainage release: requires an unconditional final waiver
 */
export function requiredReleaseFor(kind: PaymentKind): ReleaseType[] {
  if (kind === "final") return ["unconditional_final"];
  return [
    "conditional_progress",
    "unconditional_progress",
    "conditional_final",
    "unconditional_final",
  ];
}

/**
 * Is an AP payment GATED (blocked)? Returns true when no approved inbound lien
 * release of an acceptable type exists for the invoice.
 */
export function isPaymentGated(
  releases: LienReleaseLike[],
  kind: PaymentKind = "progress",
): boolean {
  const acceptable = requiredReleaseFor(kind);
  const satisfied = releases.some(
    (r) =>
      r.direction === "inbound" &&
      r.status === "approved" &&
      acceptable.includes(r.release_type),
  );
  return !satisfied;
}

/** Human-readable explanation for a gated payment (UI). */
export function gateExplainer(kind: PaymentKind = "progress"): string {
  return kind === "final"
    ? "Final payment requires an approved unconditional final lien waiver."
    : "Payment requires an approved conditional (or better) progress lien waiver.";
}
