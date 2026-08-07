# Paying a vendor — the standing process

How every disbursement to a subcontractor gets into the system from now on. The
short version: **no invoice, no payment.** The database enforces that, not just
convention, so the sequence below is the only path that works.

---

## The four steps

### 1 · The vendor invoices for the period

One invoice per billing period, per vendor. Create it on the commitment:

> Project → **Financials** → **Commitments** → *the vendor's commitment* → **Invoices** → **New invoice**

| Field | What goes in it |
|---|---|
| Invoice # | The vendor's own number if they have one, otherwise `VENDOR-YYYY-MM` |
| Period end | Last day of the period being billed |
| Submitted amount | What they're asking for |
| Retainage held | Whatever you're withholding this period (0 if none) |

The invoice starts in **submitted**.

### 2 · We approve it

Review, then approve. The **approved amount** — not the submitted amount —
becomes the ceiling for everything downstream. Approving less than was submitted
is normal and is how you short-pay a disputed line.

### 3 · The vendor signs a lien release

> Project → **Financials** → **Lien Releases** → **New** (or *Send for signature*)

An **inbound** release, tied to that invoice, in status **approved**. Conditional
before payment, unconditional after, per whatever the subcontract requires.

This step is not optional and not skippable in the UI, because it is enforced in
the database: `guard_commitment_payment_lien` rejects any payment against an
invoice with no approved inbound release, raising `LIEN_REQUIRED`. That is
deliberate — it is the thing that stops money going out against unreleased lien
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
When the payments meet the approved amount the invoice flips itself to **paid**
(`sync_commitment_invoice_paid_status`). Nobody sets that status by hand.

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
| `guard_commitment_payment_lien` | Paying an invoice with no approved inbound lien release → `LIEN_REQUIRED`. |
| `guard_commitment_payment_overpay` | Payments summing past the invoice's approved amount → `OVERPAYMENT`. |
| `commitment_payments_method_check` | A method outside the list above. |
| `commitment_invoices_commitment_id_invoice_no_key` | Reusing an invoice number on the same commitment — which is what stops a double-entry. |

If the UI refuses a payment, one of these is why, and the fix is upstream: the
invoice is missing, unapproved, unreleased, or already fully paid.

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

## The one-time D'SHIN backfill (August 2026)

D'SHIN Plumbing's history predates this process. Thirteen months of
disbursements — 35 payments, $532,186.27, July 2025 through July 2026 — were
reconstructed from Wells Fargo Initiate Business Checking …5644 statements and
loaded by replaying exactly the four steps above: twelve monthly invoices, each
approved, each with an unconditional progress release, then every payment
recorded against its month with the real wire trace or Zelle reference.

Verified against the source document per month and in total: wires
$380,786.27 (18), Zelle $151,400.00 (17).

> The source PDF's summary card reads "19 wires · 16 transfers". Its own detail
> table and monthly subtotals say 18 and 17, and the dollar totals confirm it —
> the summary card miscounts by one. The loaded data follows the detail table.

Nothing about that backfill is special-cased in the code. It is the ordinary
process, run after the fact — which is why it is safe to trust the numbers it
produced, and why the same screens handle August 2026 onward with no change.
