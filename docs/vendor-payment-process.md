# Paying a vendor — the standing process

How every disbursement to a subcontractor gets into the system from now on. The
short version: **no invoice, no payment.** The database enforces that, not just
convention, so the sequence below is the only path that works.

---

## The four steps

### 1 · The vendor submits the invoice or pay app

One invoice per billing period, per vendor, against the vendor's executed
commitment. It must arrive through one of three evidenced paths:

1. **Vendor Inbox** — upload or receive the vendor's invoice PDF, classify it,
   and attach it to the correct commitment. Processing atomically creates the
   draft and preserves the original file as immutable source evidence.
2. **Requested pay app** — send the vendor a token link from the Vendor Inbox.
   The vendor bills the server-provided SOV, signs the conditional waiver, and
   submits. Finance conversion atomically creates the draft invoice, SOV lines,
   source backlinks, and approved inbound waiver.
3. **Subcontractor portal** — an active member of the commitment's vendor
   organization creates the native invoice. Proj OS records that user's vendor
   attestation and freezes it with the submitted SOV detail.

A GC-authored `manual` draft cannot become submitted or payable. The D'SHIN
reconstruction described below is a backend-only historical exception, not a
fourth standing workflow.

Every normal invoice begins as **draft**. The submitted amount must equal its
SOV lines, cumulative billing cannot exceed any SOV line, and the vendor (or
the processed vendor source) must submit it before finance can act.

### 2 · We approve it

Review, then approve. The **approved amount** — not the submitted amount —
becomes the ceiling for everything downstream. A signed pay app must be
approved exactly as submitted or rejected for vendor revision; an uploaded
invoice can be approved for less when the documented review supports it.

Approval is available only to an admin/manager, only after the invoice has moved
`draft → submitted`, and only when the subcontract/commitment is **executed**.
Approval writes the durable **Processed** and **Approved** timestamps used by the
invoice stamp.

### 3 · The vendor signs a lien release

> Project → **Financials** → **Lien Releases** → **New** (or *Send for signature*)

An **inbound** release, tied to that invoice, in status **approved**. Conditional
before payment, unconditional after, per whatever the subcontract requires.

This step is not optional and not skippable in the UI. The database requires an
approved inbound release whose amount covers the invoice's full net payable;
`guard_commitment_payment_overpay` raises `LIEN_REQUIRED` when coverage is
missing or short. That is what stops money going out against unreleased lien
rights.

### 4 · We pay, and record it

Pay the vendor however you pay them, then record it:

> Project → **Financials** → **Payments** → **Paid to Subcontractors** → **Record payment**

| Field | What goes in it |
|---|---|
| Amount | What actually left the account |
| Paid date | The date the bank posted it, not the date you authorised it |
| Method | `check` · `ach` · `wire` · `zelle` · `card` · `cash` · `other` |
| Reference | **The bank's own identifier.** Wires: `WT <trace> / SRF <srf>`. Zelle: the `WFCT…` ref #. Checks: the check number. |
| Notes | Anything a human needs later — "balance of 25K", "rest coming tomorrow" |

Partial payments are fine; record each one separately against the same invoice.
When payments meet the approved amount less retainage held, the invoice flips itself to **paid**
(`sync_commitment_invoice_paid_status`). Nobody sets that status by hand.
Retainage remains held at the contract/invoice level and cannot be slipped into
an ordinary progress payment; a controlled closeout/retainage-release process
must authorize any later disbursement.

Open the paid invoice and select **Finalize paid PDF**. Proj OS renders the
processed-and-paid seal plus the complete payment register, uploads that exact
PDF as a project artifact, and locks it as the executed copy. The original
vendor upload remains attached separately; the finalized PDF is what the
financial ledger/report link prefers.

**The reference field is the whole point of the exercise.** It is what lets any
payment on the dashboard be traced back to a line on a bank statement a year
later. Leave it blank and the record is an assertion; fill it in and the record
is evidence.

---

## What the database will not let you do

These are hard guards, not warnings:

| Guard | What it blocks |
|---|---|
| `commitment_payments.commitment_invoice_id NOT NULL` | A payment with no invoice behind it. |
| `guard_commitment_payment_overpay` | Paying without full-net approved inbound lien coverage → `LIEN_REQUIRED`; paying past invoice net or revised commitment → `OVERPAYMENT`. |
| Invoice lifecycle guard | Skipping `draft → submitted → approved`, approving against an unexecuted commitment, or approving without finance authority. |
| Invoice source guard | Submitting a GC-authored manual row or an invoice without vendor attestation, a linked source document, or a signed pay app. |
| SOV/CCO integrity | Rebilling a line, changing a billed SOV row, or reducing a CCO below the SOV/invoice/payment reliance floor. |
| `commitment_payments_method_check` | A method outside the list above. |
| `commitment_invoices_commitment_id_invoice_no_key` | Reusing an invoice number on the same commitment — which is what stops a double-entry. |
| Payment/reference integrity | Blank/duplicate bank references and every update/delete of a posted payment. |
| Paid evidence integrity | Rewriting a paid invoice's dates, amounts, stamp, source, finalized PDF, or approved lien release. |

If the UI refuses a payment, one of these is why, and the fix is upstream: the
invoice is missing, unapproved, unreleased, or already fully paid.

Posted cash is append-only. A historical correction is performed only through
the finance-restricted reconciliation procedure/migration, so a user cannot
silently rewrite a bank-backed entry in place.

---

## Where to see it

**Vendor Dashboard** — `Financials → Vendors` — is the per-vendor view: revised
contract, paid to date, retainage held, remaining to pay, the reconciliation
waterfall, and the full payment ledger with every date, method, bank reference
and memo. The ledger total and the "Paid to date" tile are the same number from
the same source, so they cannot disagree.

**Payments → Paid to Subcontractors → By vendor** is the same ledger arranged
for a payment run: invoices reconciled against payments, each payment drillable
into its base / change-order / line-item split.

---

## The one-time D'SHIN backfill (certified August 2026)

D'SHIN Plumbing's history predates this process. The certified paid-to-date
control is **$540,479.39 through July 27, 2026**. It has two deliberately
separate evidence layers:

| Control layer | Count | Amount |
|---|---:|---:|
| Wells Fargo statement-detail payments | 35 | $532,186.27 |
| Jointly agreed June 11 baseline adjustment | 1 | $8,293.12 |
| **Certified ledger total** | **36** | **$540,479.39** |

The 35 bank-backed payments were reconstructed from Wells Fargo Initiate
Business Checking …5644 statements. They comprise 18 wires totaling
$380,786.27 and 17 Zelle payments totaling $151,400.00. The bank detail is
loaded against twelve monthly invoices, each approved and supported by its
historical lien-release acknowledgment. Those invoices are explicitly marked
`historical_bank_reconstruction`; that backend-only provenance cannot be
selected through ordinary invoice screens.

The additional $8,293.12 is not presented as a Wells Fargo transaction. It is a
separately labeled reconciliation adjustment that preserves the paid-to-date
baseline jointly agreed on June 11, 2026:

| June 11 control | Amount |
|---|---:|
| Statement-detail payments through June 11 | $452,486.27 |
| Jointly agreed baseline adjustment | $8,293.12 |
| **Agreed paid to date through June 11** | **$460,779.39** |
| Bank-backed payments after June 11 | $79,700.00 |
| **Certified paid to date through July 27** | **$540,479.39** |

That adjustment is represented by a thirteenth reconstruction invoice so it is
visible, reviewable, and never confused with a bank reference. No bank trace is
fabricated for it. Its ledger method is `other` and its non-bank control
reference is `JOINT-RECON-2026-06-11`.

The July 3, 2026 $15,000 wire is already present in the detail: `WT
260703-020083 / SRF 0W00007152783323`. It is not the remaining discrepancy.

> The source PDF's summary card reads "19 wires · 16 transfers". Its own detail
> table and monthly subtotals say 18 wires and 17 Zelle payments, and the dollar
> totals confirm the detail. The certified control follows the detail table.

The versioned, transaction-level control—including every date, amount, bank
reference, invoice assignment, and control total—is
`src/test/fixtures/dshinReconciliation.v1.ts`. Any future correction must update
that manifest and its control test together.
