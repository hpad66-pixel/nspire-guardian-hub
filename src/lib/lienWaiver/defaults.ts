import type { LienWaiverSpec, WaiverType } from "./types";

export interface WaiverSeed {
  type?: WaiverType;
  wordmark?: string | null;
  footer?: string | null;
  project?: string | null;
  owner?: string | null;
  customer?: string | null;
  property?: string | null;
  claimant?: string | null;
  date?: string;
}

/** A blank waiver spec seeded with the project/branding defaults we know. */
export function blankWaiverSpec(seed?: WaiverSeed): LienWaiverSpec {
  return {
    doc: {
      waiver_no: "",
      pay_app_no: "",
      date: seed?.date ?? "",
      wordmark: seed?.wordmark || "APAS CONSULTING",
      footer: seed?.footer || "",
      jurisdiction: "Florida",
    },
    type: seed?.type ?? "conditional_progress",
    parties: {
      claimant: { name: seed?.claimant ?? "", address: "", by: "", title: "", email: "" },
      customer: seed?.customer ?? "",
      owner: seed?.owner ?? "",
      project: seed?.project ?? "",
      property: seed?.property ?? "",
      scope: "",
    },
    payment: { through_date: "", amount: "", method: "", maker: "", paid_to: "" },
    exceptions: { disputed_amount: "", other: "" },
    signature: { company: seed?.claimant ?? "", name: "", title: "", date: "" },
  };
}

export const WAIVER_TYPES: { value: WaiverType; label: string; hint: string }[] = [
  { value: "conditional_progress", label: "Conditional · Progress", hint: "Effective only when this progress payment is received." },
  { value: "unconditional_progress", label: "Unconditional · Progress", hint: "Effective on signing — sign only after you're paid." },
  { value: "conditional_final", label: "Conditional · Final", hint: "Effective only when final payment (incl. retainage) is received." },
  { value: "unconditional_final", label: "Unconditional · Final", hint: "Final release on signing — sign only after final payment." },
];

export const fmtLongDate = (d: string) => {
  if (!d) return "";
  const date = new Date(d.length <= 10 ? d + "T00:00:00" : d);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
