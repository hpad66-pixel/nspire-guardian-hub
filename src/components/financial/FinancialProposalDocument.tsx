import { forwardRef } from "react";
import type { FinancialProposal, FinancialProposalLine } from "@/hooks/useFinancialProposals";
import { proposalTotals } from "@/lib/financial/proposalPricing";

const GOLD = "#C4A35A";
const INK = "#1A1714";
const MUTE = "#6B6B6B";
const STAMP = "#247455";

const money = (n: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2,
}).format(n || 0);

export interface ProposalClient {
  name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export const FinancialProposalDocument = forwardRef<HTMLDivElement, {
  proposal: FinancialProposal;
  lines: FinancialProposalLine[];
  projectName: string;
  client?: ProposalClient | null;
  submittedSignature?: string | null;
  acceptedSignature?: string | null;
}>(function FinancialProposalDocument({ proposal, lines, projectName, client, submittedSignature, acceptedSignature }, ref) {
  const totals = proposalTotals(lines, proposal);
  const date = new Date(proposal.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const clientAddress = client
    ? [client.address, [client.city, client.state].filter(Boolean).join(", ")].filter(Boolean).join(", ")
    : "";
  const salutationName = client?.contact_name?.trim() || client?.name?.trim() || "";
  const valid = proposal.valid_until
    ? new Date(`${proposal.valid_until}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";
  const th: React.CSSProperties = { padding: "7px 8px", fontSize: 10, textAlign: "left", background: "#F3EFE6", borderBottom: `1px solid ${GOLD}` };
  const td: React.CSSProperties = { padding: "7px 8px", fontSize: 10.5, borderBottom: "1px solid #ECE9E2", verticalAlign: "top" };

  return (
    <div ref={ref} style={{ position: "relative", width: 720, boxSizing: "border-box", padding: 40, background: "#fff", color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {proposal.accepted_signed_at && (
        <div style={{ position: "absolute", top: 30, right: 38, transform: "rotate(-10deg)", color: STAMP, border: `3px solid ${STAMP}`, borderRadius: 8, padding: "6px 16px", textAlign: "center", opacity: .9 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>ACCEPTED</div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5 }}>{new Date(proposal.accepted_signed_at).toLocaleDateString()}</div>
        </div>
      )}

      <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>APAS CONSULTING</div>
      <div style={{ height: 3, background: GOLD, margin: "6px 0 18px" }} />
      <div style={{ fontSize: 20, fontWeight: 700 }}>PROPOSAL · {proposal.proposal_no}</div>
      <div style={{ color: MUTE, fontSize: 14, fontStyle: "italic", margin: "3px 0 18px" }}>{proposal.title}</div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <tbody>
          {[
            ["Project", projectName], ["Prepared for", proposal.client_name || "—"],
            ["Client email", proposal.client_email || "—"], ["Proposal date", date],
            ...(Number(proposal.revision_no ?? 0) > 0 ? [["Revision", String(proposal.revision_no)]] : []),
            ["Valid until", valid],
          ].map(([label, value]) => (
            <tr key={label}><td style={{ ...td, width: "23%", color: MUTE, fontWeight: 700 }}>{label}</td><td style={td}>{value}</td></tr>
          ))}
        </tbody>
      </table>

      {client && (client.name || salutationName) && (
        <div style={{ fontSize: 11.5, lineHeight: 1.5, margin: "0 0 16px" }}>
          {client.name && <div style={{ fontWeight: 700 }}>{client.name}</div>}
          {client.contact_name && <div>Attn: {client.contact_name}</div>}
          {clientAddress && <div style={{ color: MUTE }}>{clientAddress}</div>}
          {client.contact_email && <div style={{ color: MUTE }}>{client.contact_email}</div>}
          {salutationName && <div style={{ marginTop: 12 }}>Dear {salutationName},</div>}
        </div>
      )}

      {proposal.notes && <><h3 style={{ color: GOLD, fontSize: 12, margin: "0 0 6px" }}>OVERVIEW</h3><p style={{ fontSize: 11.5, lineHeight: 1.55, whiteSpace: "pre-wrap", margin: "0 0 16px" }}>{proposal.notes}</p></>}

      {Array.isArray(proposal.scope_bullets) && proposal.scope_bullets.length > 0 && (
        <>
          <h3 style={{ color: GOLD, fontSize: 12, margin: "0 0 6px" }}>SCOPE OF SERVICES</h3>
          <ul style={{ fontSize: 11.5, lineHeight: 1.5, margin: "0 0 16px", paddingLeft: 18 }}>
            {proposal.scope_bullets.map((bullet, index) => <li key={index} style={{ marginBottom: 3 }}>{bullet}</li>)}
          </ul>
        </>
      )}

      {Array.isArray(proposal.deliverables) && proposal.deliverables.length > 0 && (
        <>
          <h3 style={{ color: GOLD, fontSize: 12, margin: "0 0 6px" }}>DELIVERABLES</h3>
          <ul style={{ fontSize: 11.5, lineHeight: 1.5, margin: "0 0 16px", paddingLeft: 18 }}>
            {proposal.deliverables.map((item, index) => <li key={index} style={{ marginBottom: 3 }}>{item}</li>)}
          </ul>
        </>
      )}

      <h3 style={{ color: GOLD, fontSize: 12, margin: "0 0 6px" }}>PRICING</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>#</th><th style={th}>Description</th><th style={th}>Category</th><th style={{ ...th, textAlign: "right" }}>Qty</th><th style={th}>Unit</th><th style={{ ...th, textAlign: "right" }}>Unit cost</th><th style={{ ...th, textAlign: "right" }}>Extended</th></tr></thead>
        <tbody>
          {lines.map((line) => {
            const extended = Number(line.quantity) * Number(line.unit_cost);
            return <tr key={line.id}><td style={td}>{line.line_no}</td><td style={td}>{line.description}</td><td style={{ ...td, textTransform: "capitalize" }}>{line.category}</td><td style={{ ...td, textAlign: "right" }}>{line.quantity}</td><td style={td}>{line.unit}</td><td style={{ ...td, textAlign: "right" }}>{money(Number(line.unit_cost))}</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(extended)}</td></tr>;
          })}
          {lines.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: MUTE }}>No priced line items</td></tr>}
        </tbody>
      </table>

      <div style={{ marginLeft: "auto", width: 280, marginTop: 10, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", color: MUTE }}><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", color: MUTE }}><span>Overhead ({Number(proposal.overhead_pct || 0)}%)</span><span>{money(totals.overhead)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", color: MUTE }}><span>Profit ({Number(proposal.profit_pct || 0)}%)</span><span>{money(totals.profit)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px", background: GOLD, color: "#fff", fontWeight: 800, fontSize: 13 }}><span>PROPOSAL TOTAL</span><span>{money(totals.total)}</span></div>
      </div>

      <h3 style={{ color: GOLD, fontSize: 12, margin: "20px 0 6px" }}>TERMS &amp; CONDITIONS</h3>
      <p style={{ fontSize: 10.5, lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0 }}>{proposal.terms || "Net 30. All work per applicable codes and standards."}</p>

      <div style={{ display: "flex", gap: 28, marginTop: 28 }}>
        {[
          ["SUBMITTED BY", submittedSignature || proposal.submitted_signature_path, "APAS Consulting", proposal.submitted_signed_at],
          ["ACCEPTED & AUTHORIZED", acceptedSignature || proposal.accepted_signature_path, proposal.accepted_signed_name || proposal.client_name || "", proposal.accepted_signed_at],
        ].map(([label, image, name, signedAt]) => (
          <div key={label as string} style={{ flex: 1 }}>
            <div style={{ color: GOLD, fontSize: 9, fontWeight: 700 }}>{label}</div>
            <div style={{ height: 48, borderBottom: `1px solid ${INK}`, display: "flex", alignItems: "flex-end" }}>{image && <img src={image as string} alt="signature" style={{ maxHeight: 44, maxWidth: "90%" }} />}</div>
            <div style={{ fontSize: 10.5, marginTop: 4 }}>{name}</div>
            <div style={{ fontSize: 9.5, color: MUTE }}>Date: {signedAt ? new Date(signedAt as string).toLocaleDateString() : "____________"}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `2px solid ${GOLD}`, marginTop: 22, paddingTop: 6, fontSize: 8.5, color: MUTE }}>APAS Consulting · Commercial proposal · {proposal.proposal_no}</div>
    </div>
  );
});
