/**
 * Change Order spec — the in-app port of the change-order-generator skill.
 * One `CoSpec` fully describes a change order: standing party/branding defaults
 * merged with the per-CO scope, pricing, and signatures. It drives the editable
 * .docx, the on-screen preview, and the locked signed PDF.
 */

export interface PartyFrom {
  name: string;
  address?: string;
  city?: string;
  contact?: string;
  title?: string;
  email?: string;
}
export interface PartyTo {
  name: string;
  attn?: string;
  address?: string;
  city?: string;
  contact?: string;
  email?: string;
}

export interface CoParties {
  from: PartyFrom;
  to: PartyTo;
  project: string;
  contract: string;
  subject?: string;
  basis?: string;
}

/** A content block inside a section (renders before/after the pricing table). */
export type CoBlock =
  | { p: string }
  | { p_bold: string }
  | { sub: string }
  | { bullets: string[] }
  | { numbered: string[] };

export interface CoSection {
  heading: string;
  blocks: CoBlock[];
}

export interface CoPricingRow {
  n: string;
  desc: string;
  unit: string;
  qty: string;
  unit_cost: string;
  extended: string;
  basis: string;
}
export interface CoPricingGroup {
  label: string;
  rows: CoPricingRow[];
  subtotal?: { label: string; amount: string };
}
export interface CoMarkup {
  label: string;
  amount: string;
  basis?: string;
}
export interface CoPricing {
  heading?: string;
  intro?: string;
  groups: CoPricingGroup[];
  markups: CoMarkup[];
  grand_total: { label: string; amount: string };
  footnote?: string;
}

export interface CoSignatory {
  company?: string;
  name?: string;
  title?: string;
  date?: string;
}

export interface CoDoc {
  co_number: string;
  co_label: string;
  title: string;
  date: string;
  wordmark?: string;
  tagline?: string;
  footer?: string;
}

export interface CoSpec {
  doc: CoDoc;
  parties: CoParties;
  sections: CoSection[];
  pricing: CoPricing;
  sections_after_pricing: CoSection[];
  signatures: { submitted: CoSignatory; accepted: CoSignatory };
}
