#!/usr/bin/env python3
"""
Extract structured data from the project invoice PDFs.

Non-destructive: reads PDFs from scripts/invoices/source/ and writes a single
normalized JSON file (scripts/invoices/extracted.json) plus a per-file .txt of
the raw extracted text. Nothing touches the database.

The normalized schema is what the TypeScript ledger importer / seed consumes:
each record maps onto Stack A tables (project_contracts / contract_invoices /
contract_change_orders / contract_payments) and project_artifacts.

Usage:
    python3 scripts/invoices/extract_invoices.py
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

import pdfplumber

SRC_DIR = Path(__file__).parent / "source"
OUT_JSON = Path(__file__).parent / "extracted.json"

MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def parse_date(text: str) -> str | None:
    """Return ISO date for the first 'Month DD, YYYY' or 'MM/DD/YYYY' match."""
    m = re.search(r"([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})", text)
    if m:
        mon = MONTHS.get(m.group(1)[:3].lower())
        if mon:
            return f"{int(m.group(3)):04d}-{mon:02d}-{int(m.group(2)):02d}"
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if m:
        return f"{int(m.group(3)):04d}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return None


def money(s: str) -> float:
    return round(float(s.replace(",", "").replace("$", "").strip()), 2)


def first_money(text: str) -> float | None:
    m = re.search(r"\$\s*([\d,]+\.\d{2})", text)
    return money(m.group(1)) if m else None


def extract_text(pdf_path: Path) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)


def parse_apas_invoice(text: str, source_file: str) -> dict:
    """APAS Consulting (Invoice Ninja layout): APAS -> R4 (accounts receivable)."""
    inv_no = re.search(r"Invoice\s+(INV-\d+-\d+)", text)
    issue = parse_date(text.split("Hi ")[0] if "Hi " in text else text)
    due = None
    due_m = re.search(r"Due\s+([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})", text)
    if due_m:
        due = parse_date(due_m.group(1))

    # Line items: "<desc> <qty> $<price> $<total>"
    lines = []
    for m in re.finditer(r"^(.*?)\s+(\d+)\s+\$([\d,]+\.\d{2})\s+\$([\d,]+\.\d{2})\s*$",
                         text, re.MULTILINE):
        desc = m.group(1).strip()
        if desc.lower() in ("item", "total"):
            continue
        lines.append({
            "description": desc,
            "qty": int(m.group(2)),
            "unit_price": money(m.group(3)),
            "total": money(m.group(4)),
        })

    total_m = re.search(r"Total\s+\$([\d,]+\.\d{2})", text)
    total = money(total_m.group(1)) if total_m else (lines[-1]["total"] if lines else None)

    desc0 = lines[0]["description"].lower() if lines else ""
    is_payapp = "pay app" in desc0 or "payapp" in desc0
    payapp_no = None
    pm = re.search(r"pay app\s*#?\s*(\d+)", desc0)
    if pm:
        payapp_no = int(pm.group(1))

    return {
        "source_file": source_file,
        "doc_kind": "ar_pay_app" if is_payapp else "ar_invoice",
        "pay_app_no": payapp_no,
        "invoice_number": inv_no.group(1) if inv_no else None,
        "issue_date": issue,
        "due_date": due,
        "currency": "USD",
        "from_party": {
            "name": "APAS Consulting LLC",
            "role": "prime_contractor",
            "email": "admin@apas.ai",
            "address": "3256 NW 83 Way, Pembroke Pines, FL 33024",
        },
        "to_party": {
            "name": "R4 Capital C/o R4 GGOL GP LLC",
            "role": "owner",
            "email": "csullivan@r4cap.com",
            "address": "780 Third Avenue, New York, NY 11017",
        },
        "line_items": lines,
        "total": total,
        "project_hint": "Glorieta Gardens",
    }


def parse_ecotech_invoice(text: str, source_file: str) -> dict:
    """Eco Tech Consulting (vendor) -> APAS (accounts payable)."""
    inv_no = re.search(r"INVOICE\s*#\s*(\d+)", text, re.IGNORECASE)
    date = parse_date(text)
    total_m = re.search(r"TOTAL\s*\$\s*([\d,]+\.\d{2})", text)
    total = money(total_m.group(1)) if total_m else first_money(text)

    # Description block sits between "AMOUNT" and the "$ <amount>"/"TOTAL" marker.
    desc = None
    dm = re.search(r"DESCRIPTION\s+AMOUNT\s+(.*?)\s+\$\s*[\d,]+\.\d{2}",
                   text, re.IGNORECASE | re.DOTALL)
    if dm:
        desc = re.sub(r"\s+", " ", dm.group(1)).strip()

    return {
        "source_file": source_file,
        "doc_kind": "ap_invoice",
        "invoice_number": inv_no.group(1) if inv_no else None,
        "issue_date": date,
        "due_date": None,
        "currency": "USD",
        "from_party": {
            "name": "Eco Tech Consulting, LLC",
            "role": "vendor",
            "address": "556 NW 53rd Street, Boca Raton, FL 33487",
            "phone": "(305) 924-2260",
        },
        "to_party": {
            "name": "APAS Consulting LLC",
            "role": "prime_contractor",
            "contact": "Hardeep Anand",
            "address": "3256 NW 83 Way, Pembroke Pines, FL 33024",
        },
        "line_items": [{
            "description": desc or "Turbidity meter logistics",
            "qty": 1,
            "unit_price": total,
            "total": total,
        }],
        "total": total,
        "project_hint": "Glorieta Gardens",
        "project_address": "13210 Alexandria Drive, Opa-locka, FL 33054",
    }


def classify_and_parse(text: str, source_file: str) -> dict:
    if "APAS Consulting LLC" in text and re.search(r"Invoice\s+INV-", text):
        return parse_apas_invoice(text, source_file)
    if re.search(r"Eco\s*Tech", text, re.IGNORECASE):
        return parse_ecotech_invoice(text, source_file)
    # Fallback: generic
    return {
        "source_file": source_file,
        "doc_kind": "unknown",
        "invoice_number": None,
        "issue_date": parse_date(text),
        "total": first_money(text),
        "line_items": [],
    }


def main() -> None:
    pdfs = sorted(SRC_DIR.glob("*.pdf"))
    if not pdfs:
        raise SystemExit(f"No PDFs found in {SRC_DIR}")

    records = []
    for pdf in pdfs:
        text = extract_text(pdf)
        (pdf.with_suffix(".txt")).write_text(text)
        rec = classify_and_parse(text, pdf.name)
        rec["raw_text"] = text
        records.append(rec)
        print(f"✓ {pdf.name}: {rec['doc_kind']} "
              f"{rec.get('invoice_number')} total={rec.get('total')}")

    payload = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source_dir": str(SRC_DIR),
        "count": len(records),
        "invoices": records,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2))
    print(f"\nWrote {OUT_JSON} ({len(records)} records)")


if __name__ == "__main__":
    main()
