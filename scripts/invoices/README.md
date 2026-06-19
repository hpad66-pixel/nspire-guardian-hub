# Invoice extraction → Financial Ledger wiring

Turns the three project invoices into live records on the **Stack A** financial
model (`project_contracts` / `contract_invoices` / `contract_change_orders` /
`contract_payments`) with the original PDFs attached via `project_artifacts`.

## The three documents

| File | Direction | Amount | Becomes |
|------|-----------|--------|---------|
| `INV-26-34.pdf` | A/R — APAS → R4 (owner) | $91,857.43 | Pay App #5 on the owner contract |
| `INV-26-33.pdf` | A/R — APAS → R4 (owner) | $2,075.00 | Invoice tied to change order **CO-001** |
| `ECOTech-594.pdf` | A/P — Eco Tech → APAS (vendor) | $2,075.00 | Vendor invoice on the Eco Tech subcontract |

`INV-26-33` (turbidity rental billed to the owner) and `ECOTech-594` (the vendor
cost behind it) are a pass-through: the change order carries the owner-billed
amount, and the Eco Tech invoice is its cost backup.

## 1 · Extract (non-destructive)

```bash
python3 scripts/invoices/extract_invoices.py
```

Reads `scripts/invoices/source/*.pdf` → writes `scripts/invoices/extracted.json`
(+ a `.txt` of raw text per file). Nothing touches the database.

## 2 · Apply the schema migration

```bash
supabase db push        # applies 20260618120000_financial_ledger_payments.sql
```

Adds `direction` / `invoice_id` / `change_order_id` / `artifact_id` to
`contract_payments`, a tenant-boundary trigger, document links on invoices/COs,
and the `financial_ledger` + `contract_invoice_balances` views.

## 3 · Import the data + attach PDFs

```bash
export SUPABASE_URL="https://xlfwzqpixlrnntzqhvcm.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role key from Supabase dashboard>"
node scripts/invoices/import_to_supabase.mjs
```

Idempotent — re-running upserts by natural keys. Resolves the Glorieta project,
creates the owner + Eco Tech contracts, the invoices/pay-app/change-order, and
uploads the PDFs.

Rows-only fallback (no file upload), if you prefer pure SQL:
`psql "$DATABASE_URL" -f scripts/invoices/seed_financials.sql`.

## 4 · Use it

Open the project → **Financials → Ledger**. Record full or partial payments
against any pay app / invoice, optionally tied to a change order. Generate the
AIA G702/G703 for a pay app from the ledger row.
