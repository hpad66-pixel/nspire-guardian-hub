/**
 * Standing APAS defaults (ported from the skill's config/apas_defaults.json) and
 * helpers to auto-populate party/branding info from a project's prime contract.
 */
import type { CoParties, CoSpec, CoSignatory } from "./types";

export const APAS_BRAND = {
  wordmark: "APAS CONSULTING",
  footer: "APAS Consulting LLC  ·  Confidential  ·  Change Order Proposal",
};

export const APAS_FROM = {
  name: "APAS Consulting LLC",
  address: "3256 NW 83 Way",
  city: "Cooper City, FL 33024",
  contact: "Hardeep Anand, P.E.",
  title: "Principal",
  email: "hardeep@apas.ai",
};

export const APAS_OWNER_DEFAULT = {
  name: "Glorieta Partners, Ltd.",
  attn: "c/o R4 GGOL GP LLC",
  address: "780 Third Avenue, 16th Floor",
  city: "New York, NY 10017",
  contact: "Attn: Chris Sullivan, SEVP",
  email: "csullivan@r4cap.com",
};

export const APAS_SIGNATORIES: { submitted: CoSignatory; accepted: CoSignatory } = {
  submitted: { company: "APAS Consulting LLC", name: "Hardeep Anand, P.E.", title: "Principal", date: "" },
  accepted: {
    company: "Glorieta Partners, Ltd.\nc/o R4 GGOL GP LLC",
    name: "Chris Sullivan",
    title: "Senior Executive Vice President",
    date: "",
  },
};

/** A loose shape of the prime_contracts row we read auto-fill from. */
export interface PrimeContractLike {
  contract_no?: string | null;
  contract_date?: string | null;
  project_address?: string | null;
  contractor_name?: string | null;
  contractor_address?: string | null;
  contractor_contact?: string | null;
  contractor_email?: string | null;
  owner_name?: string | null;
  owner_address?: string | null;
  owner_contact?: string | null;
  owner_email?: string | null;
  architect_name?: string | null;
}

/**
 * Build the standing party block, preferring the live prime-contract values and
 * falling back to the APAS defaults. Fully overridable downstream in the form.
 */
export function partiesFromContract(
  contract: PrimeContractLike | null | undefined,
  projectName: string | undefined,
): CoParties {
  const c = contract ?? {};
  return {
    from: {
      name: c.contractor_name || APAS_FROM.name,
      address: c.contractor_address || APAS_FROM.address,
      city: APAS_FROM.city,
      contact: c.contractor_contact || APAS_FROM.contact,
      title: APAS_FROM.title,
      email: c.contractor_email || APAS_FROM.email,
    },
    to: {
      name: c.owner_name || APAS_OWNER_DEFAULT.name,
      attn: APAS_OWNER_DEFAULT.attn,
      address: c.owner_address || APAS_OWNER_DEFAULT.address,
      city: APAS_OWNER_DEFAULT.city,
      contact: c.owner_contact || APAS_OWNER_DEFAULT.contact,
      email: c.owner_email || APAS_OWNER_DEFAULT.email,
    },
    project: projectName || "Glorieta Gardens Sanitary Sewer Extension",
    contract: c.contract_no
      ? `${c.contract_no}${c.contract_date ? ` (${fmtLongDate(c.contract_date)})` : ""}`
      : "PC-01 (July 11, 2025)",
  };
}

export function signatoriesFromContract(contract: PrimeContractLike | null | undefined): {
  submitted: CoSignatory;
  accepted: CoSignatory;
} {
  const c = contract ?? {};
  return {
    submitted: {
      company: c.contractor_name || APAS_SIGNATORIES.submitted.company,
      name: c.contractor_contact || APAS_SIGNATORIES.submitted.name,
      title: APAS_SIGNATORIES.submitted.title,
      date: "",
    },
    accepted: {
      company: c.owner_name || APAS_SIGNATORIES.accepted.company,
      name: c.owner_contact?.replace(/^Attn:\s*/i, "") || APAS_SIGNATORIES.accepted.name,
      title: APAS_SIGNATORIES.accepted.title,
      date: "",
    },
  };
}

/** Currency helpers — money is carried as pre-formatted strings, per the skill. */
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const parseMoney = (s: string | number | null | undefined): number => {
  if (typeof s === "number") return s;
  const x = parseFloat(String(s ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

export function fmtLongDate(d: string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** A blank spec scaffold seeded with standing defaults for a fresh CO. */
export function blankSpec(parties: CoParties, sigs: { submitted: CoSignatory; accepted: CoSignatory }): CoSpec {
  return {
    doc: { co_number: "", co_label: "", title: "", date: "", wordmark: APAS_BRAND.wordmark, footer: APAS_BRAND.footer },
    parties,
    sections: [
      { heading: "1. BACKGROUND", blocks: [{ p: "" }] },
      { heading: "2. SCOPE OF WORK", blocks: [{ p: "" }, { bullets: [""] }] },
    ],
    pricing: {
      heading: "3. PRICING",
      intro: "",
      groups: [{ label: "A. ", rows: [], subtotal: { label: "Subtotal A", amount: money(0) } }],
      markups: [
        { label: "APAS Overhead", amount: "10%", basis: "" },
        { label: "APAS Profit", amount: "5%", basis: "" },
      ],
      grand_total: { label: "GRAND TOTAL", amount: money(0) },
    },
    sections_after_pricing: [
      {
        heading: "4. EXCLUSIONS",
        blocks: [
          { p: "The Change Order amount does NOT include the following, which remain the Owner's responsibility:" },
          {
            bullets: [
              "Permit fees (DERM, Miami-Dade Water & Sewer, FDEP, municipal).",
              "Impact and connection fees.",
              "Work beyond the scope described above requires a separate change order.",
            ],
          },
        ],
      },
      {
        heading: "5. APPROVAL REQUESTED",
        blocks: [{ p: "APAS Consulting respectfully requests approval of this Change Order in the amount stated above." }],
      },
    ],
    signatures: sigs,
  };
}
