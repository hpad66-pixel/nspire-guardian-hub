/**
 * Branded lien-waiver language. Original, plain-English wording that conveys the
 * full operative effect of the standard conditional/unconditional progress/final
 * waivers — NOT copied from any AIA form. Built on our own template so it can be
 * branded and adapted. Where a state mandates exact statutory wording, the
 * generator can substitute that text; this is the default balanced format.
 */
import type { LienWaiverSpec, WaiverType } from "./types";
import { isUnconditional, isFinal } from "./types";

export function waiverTitle(type: WaiverType): string {
  const cond = isUnconditional(type) ? "Unconditional" : "Conditional";
  const stage = isFinal(type) ? "Final Payment" : "Progress Payment";
  return `${cond} Waiver and Release on ${stage}`;
}

export function waiverShortLabel(type: WaiverType): string {
  return `${isUnconditional(type) ? "Unconditional" : "Conditional"} · ${isFinal(type) ? "Final" : "Progress"}`;
}

/** The bold effectiveness notice shown right under the title. */
export function effectivenessNotice(type: WaiverType): string {
  if (isUnconditional(type)) {
    return "This waiver and release is effective immediately upon the Claimant's signature. It is not conditional on any future event. Do not sign this document until you have actually been paid the amount stated below.";
  }
  return "This conditional waiver and release is effective ONLY upon the Claimant's actual receipt of the payment described below in good funds. Until that payment is received and clears, this document has no effect and the Claimant keeps all of its rights.";
}

/** The operative waiver-and-release clause(s). */
export function operativeClauses(spec: LienWaiverSpec): string[] {
  const t = spec.type;
  const through = spec.payment.through_date || "the Effective Date";
  const scope = spec.parties.scope ? ` in connection with ${spec.parties.scope}` : "";
  const trigger = isUnconditional(t)
    ? `In exchange for and to the extent of the payment identified below, which the Claimant acknowledges it has received,`
    : `Conditioned on and effective only upon the Claimant's actual receipt of the payment identified below,`;

  const releaseVerb = isUnconditional(t)
    ? "unconditionally and irrevocably waives, releases, and discharges"
    : "waives, releases, and discharges";

  const rights =
    `any and all (i) mechanic's, materialman's, or construction liens and claims of lien, (ii) rights to assert or record a lien or other encumbrance, ` +
    `(iii) stop-payment notices and bonded stop-notice rights, (iv) claims against any payment, performance, or surety bond, (v) claims under any contract, ` +
    `common law, statute, ordinance, or rule, and (vi) any other right to or claim for payment`;

  const scopeOfWork =
    `for all labor, services, materials, equipment, fixtures, apparatus, machinery, and other items furnished or to be furnished by the Claimant to the ` +
    `Project or Property, and for all monies, funds, and other consideration due or to become due to the Claimant arising out of such work${scope}`;

  const finalNote = isFinal(t)
    ? ` This release extends through final completion and includes all retainage, holdback, and final-payment amounts, except as expressly reserved in the Exceptions.`
    : ` This release covers work performed through ${through}, except as expressly reserved in the Exceptions, and does not cover work furnished after that date.`;

  return [
    `${trigger} and except for the matters specifically reserved in the Exceptions section below, the Claimant ${releaseVerb} ${rights} that the Claimant ` +
      `has or may have ${scopeOfWork}.${finalNote}`,
  ];
}

/** Payment block — conditional shows terms; unconditional shows the acknowledgement. */
export function paymentBlock(spec: LienWaiverSpec): { heading: string; rows: { label: string; value: string }[]; note?: string } {
  const p = spec.payment;
  if (isUnconditional(spec.type)) {
    return {
      heading: "Payment Acknowledged",
      rows: [
        { label: "Amount received", value: p.amount ? `$${p.amount.replace(/^\$/, "")}` : "____________" },
        { label: "Through (Effective Date)", value: p.through_date || "____________" },
      ],
      note: "By signing, the Claimant confirms it has actually received the amount above for all work furnished through the Effective Date.",
    };
  }
  return {
    heading: "Payment Terms (release is conditioned on receipt of this payment)",
    rows: [
      { label: "Amount of payment", value: p.amount ? `$${p.amount.replace(/^\$/, "")}` : "____________" },
      { label: "Method of payment", value: p.method || "____________" },
      { label: "Maker of payment", value: p.maker || "____________" },
      { label: "Through (Effective Date)", value: p.through_date || "____________" },
      ...(p.paid_to ? [{ label: "Payment made to (if not Claimant)", value: p.paid_to }] : []),
    ],
  };
}

/** Standard exceptions (carve-outs that survive the release). */
export function exceptionItems(spec: LienWaiverSpec): string[] {
  const t = spec.type;
  const disputed = spec.exceptions.disputed_amount
    ? `Disputed claims in the amount of $${spec.exceptions.disputed_amount.replace(/^\$/, "")}`
    : "Disputed claims (if any), in the amount stated by the Claimant";
  const base = isFinal(t)
    ? [
        "Amounts not actually received by the Claimant in good funds",
        disputed,
        "Claims based on fraud, misrepresentation, or warranty obligations that survive final payment by law",
      ]
    : [
        "Work or items furnished after the Effective Date",
        "Unpaid retention, retainage, or holdback",
        "Extras, change-order work, or items for which the Claimant has not yet been paid",
        "Pending modifications and changes not yet approved or paid",
        disputed,
      ];
  if (spec.exceptions.other) base.push(spec.exceptions.other);
  return base;
}

/** Claimant's representations (protective for the owner/GC and downstream parties). */
export function representations(): string[] {
  return [
    "The Claimant represents that all sums owed to its sub-subcontractors, laborers, and suppliers for the work covered by this release have been paid, or will be paid in full and on time out of the payment identified above.",
    "The Claimant has authority to execute this waiver and release on behalf of the named claimant entity, and the information stated above is true and correct.",
    "This waiver and release is given to and may be relied upon by the Owner, the Customer, the Project's lender, title company, and surety.",
  ];
}

/** Footer disclaimer — keeps the form honest and admissible. */
export function disclaimer(spec: LienWaiverSpec): string {
  const j = spec.doc.jurisdiction ? ` Governing jurisdiction: ${spec.doc.jurisdiction}.` : "";
  return (
    "This is a branded waiver and release prepared on the issuer's own template. It has important legal consequences and is governed by the lien laws of the " +
    "state where the Property is located, which may require specific statutory wording or notarization." +
    j +
    " The parties should confirm it conforms to applicable state requirements before signing; consult counsel if in doubt."
  );
}
