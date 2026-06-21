/**
 * Helpers to auto-populate change-order party/branding info. The standing
 * contractor identity comes from the workspace's Change Order Settings
 * (white-label), then the project's prime contract overrides per project.
 * No tenant-specific values are hardcoded here.
 */
import type { CoParties, CoSpec, CoSignatory } from "./types";

/** A workspace's standing change-order identity (from workspace_co_settings). */
export interface CompanyProfile {
  company_name?: string | null;
  company_address?: string | null;
  company_city?: string | null;
  company_contact?: string | null;
  company_title?: string | null;
  company_email?: string | null;
  wordmark?: string | null;
  footer?: string | null;
}

export const NEUTRAL_BRAND = { wordmark: "CHANGE ORDER", footer: "Confidential  ·  Change Order Proposal" };

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
 * Build the standing party block: the contractor side comes from the prime
 * contract, then the workspace company profile, then blank — never a hardcoded
 * tenant. The owner side comes from the contract (left blank to fill in if not).
 */
export function partiesFromContract(
  contract: PrimeContractLike | null | undefined,
  projectName: string | undefined,
  company?: CompanyProfile | null,
): CoParties {
  const c = contract ?? {};
  const co = company ?? {};
  return {
    from: {
      name: c.contractor_name || co.company_name || "",
      address: c.contractor_address || co.company_address || "",
      city: co.company_city || "",
      contact: c.contractor_contact || co.company_contact || "",
      title: co.company_title || "",
      email: c.contractor_email || co.company_email || "",
    },
    to: {
      name: c.owner_name || "",
      attn: "",
      address: c.owner_address || "",
      city: "",
      contact: c.owner_contact || "",
      email: c.owner_email || "",
    },
    project: projectName || "",
    contract: c.contract_no
      ? `${c.contract_no}${c.contract_date ? ` (${fmtLongDate(c.contract_date)})` : ""}`
      : "",
  };
}

export function signatoriesFromContract(
  contract: PrimeContractLike | null | undefined,
  company?: CompanyProfile | null,
): { submitted: CoSignatory; accepted: CoSignatory } {
  const c = contract ?? {};
  const co = company ?? {};
  return {
    submitted: {
      company: c.contractor_name || co.company_name || "",
      name: c.contractor_contact || co.company_contact || "",
      title: co.company_title || "",
      date: "",
    },
    accepted: {
      company: c.owner_name || "",
      name: c.owner_contact?.replace(/^Attn:\s*/i, "") || "",
      title: "",
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
export function blankSpec(
  parties: CoParties,
  sigs: { submitted: CoSignatory; accepted: CoSignatory },
  opts?: { company?: CompanyProfile | null; overheadPct?: number; profitPct?: number },
): CoSpec {
  const co = opts?.company ?? {};
  const companyLabel = co.company_name ? co.company_name.split(/,|\bLLC\b|\bInc\b|\bLtd\b/)[0].trim() : "";
  const oh = opts?.overheadPct ?? 10;
  const pf = opts?.profitPct ?? 5;
  return {
    doc: {
      co_number: "", co_label: "", title: "", date: "",
      wordmark: co.wordmark || (co.company_name ? co.company_name.toUpperCase() : NEUTRAL_BRAND.wordmark),
      footer: co.footer || (co.company_name ? `${co.company_name}  ·  Confidential  ·  Change Order Proposal` : NEUTRAL_BRAND.footer),
    },
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
        { label: `${companyLabel ? companyLabel + " " : ""}Overhead`.trim(), amount: `${oh}%`, basis: "" },
        { label: `${companyLabel ? companyLabel + " " : ""}Profit`.trim(), amount: `${pf}%`, basis: "" },
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
        blocks: [{ p: `${companyLabel || "We"} respectfully request approval of this Change Order in the amount stated above.` }],
      },
    ],
    signatures: sigs,
  };
}
