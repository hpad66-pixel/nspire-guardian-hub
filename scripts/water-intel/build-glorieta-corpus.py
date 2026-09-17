from pathlib import Path
import re, json, hashlib
from datetime import datetime
import pdfplumber

ROOT=Path('Water Meter Files')
OUT=Path('src/lib/water-intel/glorietaCorpus.generated.ts')
ACCOUNTS={
 '2745714336': {'label':'Building 8 / 13200 Alexandria', 'sort':10},
 '1674911185': {'label':'13235 Alexandria', 'sort':20},
 '8082997418': {'label':'13210 Alexandria', 'sort':30},
 '2218802663': {'label':'13210 Alexandria (idle meter)', 'sort':35},
 '4621903166': {'label':'Port Said East', 'sort':40},
 '1787762492': {'label':'The Gardens', 'sort':60},
 '7963207450': {'label':'Port Said West', 'sort':70},
 '1692380502': {'label':'Building 7 / North', 'sort':80},
 '0285466092': {'label':'Aswan South', 'sort':90},
 '9952938168': {'label':'Aswan North', 'sort':50},
}

def money(s):
    if not s: return None
    s=s.replace(',', '').replace('$','').strip()
    try: return round(float(s),2)
    except: return None

def iso(d, fmt):
    if not d: return None
    try: return datetime.strptime(d, fmt).strftime('%Y-%m-%d')
    except: return None

def kgw_to_gal(v):
    if v is None: return None
    return int(v if v >= 5000 else v*1000)

def first(pattern, text, flags=re.I):
    m=re.search(pattern, text, flags)
    return m.group(1) if m else None

def charge(label, text):
    # Prefer exact charge line, avoid subtotal and fee lines.
    pats = [
        rf'{label}\s+Charges\s+([\-0-9,]+\.\d{{2}})',
        rf'{label}\s+Service\s+Charge\s+([\-0-9,]+\.\d{{2}})',
    ]
    for pat in pats:
        m=re.search(pat, text, re.I)
        if m: return money(m.group(1))
    return None

records=[]
for p in sorted(ROOT.rglob('*.pdf')):
    rel=str(p.relative_to(ROOT))
    try:
        with pdfplumber.open(p) as pdf:
            text='\n'.join((page.extract_text(x_tolerance=1, y_tolerance=3) or '') for page in pdf.pages)
    except Exception as e:
        records.append({'file':rel, 'parseStatus':'error', 'error':str(e)[:120]})
        continue
    one=' '.join(text.split())
    acct=first(r'Account Number:\s*(\d{7,12})', one) or first(r'Account No\.\s*(\d{7,12})', one)
    bdate=iso(first(r'Billing Date:\s*(\d{2}/\d{2}/\d{4})', one), '%m/%d/%Y')
    due=iso(first(r'Past Due Date:\s*(\d{2}/\d{2}/\d{4})', one), '%m/%d/%Y')
    svc=re.search(r'(\d{2}/\d{2}/\d{2})\s+(\d{2}/\d{2}/\d{2})\s+(\d{5,12})\s+(\d{1,3})\s+(\d+)\s+(\d+)\s+(\d+)', one)
    start=end=meter=days=prior=current=kgw=None
    if svc:
        start=iso(svc.group(1),'%m/%d/%y'); end=iso(svc.group(2),'%m/%d/%y')
        meter=svc.group(3); days=int(svc.group(4)); prior=int(svc.group(5)); current=int(svc.group(6)); kgw=int(svc.group(7))
    addr_match=re.search(r'Service Address:\s*([^\n]+)', text, re.I)
    addr=' '.join(addr_match.group(1).split()) if addr_match else None
    amount_due=money(first(r'Total Account Balance\s*\$?\s*([\-0-9,]+\.\d{2})', one)) or money(first(r'Amount Due \(US \$\).*?\$\s*([\-0-9,]+\.\d{2})', one))
    current_charges=money(first(r'Current Charges\s+([\-0-9,]+\.\d{2})', one))
    previous_balance=money(first(r'Previous Balance\s+\$?\s*([\-0-9,]+\.\d{2})', one))
    water=charge('Water', text)
    sewer=charge('Sewer', text)
    other=None
    if current_charges is not None:
        other=round(current_charges - (water or 0) - (sewer or 0), 2)
    estimated=bool(re.search(r'office estimate|\bestimat(?:ed|e)\b|no read|do not use|retroactive re-billing|retro rebill', one, re.I))
    records.append({
        'file': rel, 'accountNumber': acct, 'buildingLabel': ACCOUNTS.get(acct,{}).get('label'), 'serviceAddress': addr,
        'periodStart': start, 'periodEnd': end, 'billingDate': bdate, 'dueDate': due, 'meterNumber': meter,
        'daysOfService': days, 'priorReading': prior, 'currentReading': current, 'consumptionKgw': kgw,
        'consumptionGallons': kgw_to_gal(kgw), 'previousBalance': previous_balance, 'currentCharges': current_charges,
        'amountDue': amount_due, 'waterCharges': water, 'sewerCharges': sewer, 'otherFees': other,
        'isEstimatedOrDisputeText': estimated, 'parseStatus': 'parsed' if acct and start else 'needs_review',
        'checksum': hashlib.sha1((rel+str(acct)+str(start)+str(amount_due)).encode()).hexdigest()[:12],
    })

# Duplicate detection and canonical flag.
groups={}
for r in records:
    key=(r.get('accountNumber'), r.get('periodStart'))
    if key[0] and key[1]: groups.setdefault(key,[]).append(r)
for key, rows in groups.items():
    def score(r):
        filled=sum(1 for k in ['amountDue','currentCharges','waterCharges','sewerCharges','consumptionGallons','meterNumber','billingDate'] if r.get(k) not in [None,''])
        # Favor named Account files and later paths as tie-breaker.
        return (filled, 'Account' in r['file'] or 'ACCOUNT' in r['file'], r['file'])
    best=max(rows, key=score)
    for r in rows:
        r['duplicateCount']=len(rows)
        r['isCanonical']=r is best

for r in records:
    r.setdefault('duplicateCount', 0)
    r.setdefault('isCanonical', False)

canonical=[r for r in records if r.get('isCanonical')]
review=[r for r in records if r.get('parseStatus')!='parsed']
accounts=sorted({r.get('accountNumber') for r in records if r.get('accountNumber')})
# Vacancy/dispute period from formal dispute: Apr 2024 through Jan 2026, plus known vacant/rehab note.
dispute=[r for r in canonical if r.get('accountNumber')=='2745714336' and r.get('periodStart') and '2024-04-01' <= r['periodStart'] <= '2026-01-31']
current_sum=sum((r.get('currentCharges') or 0) for r in dispute)
water_sum=sum((r.get('waterCharges') or 0) for r in dispute)
sewer_sum=sum((r.get('sewerCharges') or 0) for r in dispute)
gal_sum=sum((r.get('consumptionGallons') or 0) for r in dispute)
summary={
 'sourceFileCount': len(records),
 'canonicalBillCount': len(canonical),
 'reviewQueueCount': len(review),
 'duplicateSourceCount': len([r for r in records if r.get('duplicateCount',0)>1]),
 'accountCount': len(accounts),
 'accounts': accounts,
 'fanningHits': 0,
 'claimedCreditTarget': 1100000,
 'disputeAccount': '2745714336',
 'disputeMeter': '61302354',
 'disputePeriodStart': '2024-04-01',
 'disputePeriodEnd': '2026-01-31',
 'disputeCanonicalBills': len(dispute),
 'disputeCurrentCharges': round(current_sum,2),
 'disputeWaterCharges': round(water_sum,2),
 'disputeSewerCharges': round(sewer_sum,2),
 'disputeGallons': gal_sum,
 'formalDisputeDate': '2026-07-23',
 'formalDisputePdf': 'Formal Dispute_Glorieta Account.pdf',
}
# Keep all records but trim nulls for bundle size.
def trim(obj):
    return {k:v for k,v in obj.items() if v is not None and v != ''}
records=[trim(r) for r in records]
content='''/* eslint-disable */\n/**\n * Generated from /Water Meter Files with scripts/water-intel/build-glorieta-corpus.mjs equivalent.\n * Source PDFs are local evidence; this file is the browser-safe fact index for the Glorieta billing review.\n */\n\nexport interface GlorietaCorpusBill {\n  file: string;\n  accountNumber?: string;\n  buildingLabel?: string;\n  serviceAddress?: string;\n  periodStart?: string;\n  periodEnd?: string;\n  billingDate?: string;\n  dueDate?: string;\n  meterNumber?: string;\n  daysOfService?: number;\n  priorReading?: number;\n  currentReading?: number;\n  consumptionKgw?: number;\n  consumptionGallons?: number;\n  previousBalance?: number;\n  currentCharges?: number;\n  amountDue?: number;\n  waterCharges?: number;\n  sewerCharges?: number;\n  otherFees?: number;\n  isEstimatedOrDisputeText?: boolean;\n  parseStatus: 'parsed' | 'needs_review' | 'error';\n  duplicateCount?: number;\n  isCanonical?: boolean;\n  checksum?: string;\n  error?: string;\n}\n\nexport const GLORIETA_CORPUS_SUMMARY = '''+json.dumps(summary, indent=2)+''' as const;\n\nexport const GLORIETA_CORPUS_BILLS: GlorietaCorpusBill[] = '''+json.dumps(records, indent=2)+''';\n\nexport const GLORIETA_CANONICAL_BILLS = GLORIETA_CORPUS_BILLS.filter((bill) => bill.isCanonical);\nexport const GLORIETA_REVIEW_QUEUE = GLORIETA_CORPUS_BILLS.filter((bill) => bill.parseStatus !== 'parsed');\n'''
OUT.write_text(content)
print(json.dumps(summary, indent=2))
