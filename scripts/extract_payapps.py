#!/usr/bin/env python3
"""Extract AIA G702 pay-application figures from the 4 PC-01 pay app PDFs."""
import json, re, os
import pdfplumber

CANON = json.load(open(os.path.join(os.path.dirname(__file__), "_payapps/canonical.json")))

def money(s):
    if s is None: return None
    s = s.replace(",", "").replace("$", "").strip()
    if s in ("", "-"): return 0.0
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()")
    try: v = float(s)
    except: return None
    return -v if neg else v

def grab(txt, label):
    # find a $-amount on the same logical line as a G702 label
    m = re.search(re.escape(label) + r"[^\$]*\$?\s*([\d,]+\.\d{2})", txt)
    return money(m.group(1)) if m else None

def parse(path):
    with pdfplumber.open(path) as pdf:
        txt = "\n".join((p.extract_text() or "") for p in pdf.pages)
    appno = re.search(r"APPLICATION NO:\s*(\d+)", txt)
    period = re.search(r"PERIOD:\s*([\d/]+)\s*-\s*([\d/]+)", txt)
    def to_iso(d):
        m = re.match(r"(\d{2})/(\d{2})/(\d{2})", d or "")
        return f"20{m.group(3)}-{m.group(1)}-{m.group(2)}" if m else None
    return {
        "app_no": int(appno.group(1)) if appno else None,
        "period_start": to_iso(period.group(1)) if period else None,
        "period_end": to_iso(period.group(2)) if period else None,
        "original_contract_sum": grab(txt, "Original Contract Sum"),
        "net_change_orders": grab(txt, "Net change by change orders"),
        "contract_sum_to_date": grab(txt, "Contract Sum to date"),
        "completed_stored_to_date": grab(txt, "Column G on detail sheet"),
        "retainage_total": grab(txt, "Line 5a + 5b or total in column I of detail sheet"),
        "total_earned_less_retainage": grab(txt, "Line 4 less Line 5 Total"),
        "less_previous_certificates": grab(txt, "Line 6 from prior certificate"),
        "current_payment_due": grab(txt, "Current payment due"),
        "balance_to_finish": grab(txt, "Line 3 less Line 6"),
        "file": os.path.basename(path),
    }

records = [parse(CANON[k]) for k in sorted(CANON, key=int)]
json.dump(records, open(os.path.join(os.path.dirname(__file__), "_payapps/extracted.json"), "w"), indent=2)

print(f"{'App':>3} {'Period End':>11} {'Compl-to-date':>14} {'Retainage':>11} {'Curr Pay Due':>13} {'Prev Cert':>11}")
print("-" * 70)
for r in records:
    print(f"{r['app_no']:>3} {str(r['period_end']):>11} {(r['completed_stored_to_date'] or 0):>14,.2f} "
          f"{(r['retainage_total'] or 0):>11,.2f} {(r['current_payment_due'] or 0):>13,.2f} {(r['less_previous_certificates'] or 0):>11,.2f}")
print("-" * 70)
print(f"Original contract (all should match): {set(r['original_contract_sum'] for r in records)}")
print(f"Sum of current payments due: {sum(r['current_payment_due'] or 0 for r in records):,.2f}")
