#!/usr/bin/env python3
"""
Extract Procore Daily Log PDFs into structured daily_reports fields.

Two modes:
  • DRY RUN (default): parse every PDF, save extracted thumbnails + a JSON
    summary under scripts/_extracted/, print a report. No network, no creds.
  • LIVE (--apply): also upload the original PDF + extracted thumbnails to
    Supabase Storage and UPDATE the matching daily_reports row. Requires env:
      SUPABASE_URL                e.g. https://xxxx.supabase.co
      SUPABASE_SERVICE_ROLE_KEY   service-role key (server-side only)
      IMPORT_PROJECT_ID           the project_id these logs belong to

Usage:
  python3 scripts/import_procore_logs.py                  # dry run
  python3 scripts/import_procore_logs.py --apply          # write to Supabase
  python3 scripts/import_procore_logs.py --src /path/to/pdfs
"""
import os, re, sys, json, glob, argparse, mimetypes, urllib.request, urllib.error

import pdfplumber

DEFAULT_SRC = os.path.expanduser("~/Downloads/ExportedDailyLogs")
OUT_DIR = os.path.join(os.path.dirname(__file__), "_extracted")
THUMB_DIR = os.path.join(OUT_DIR, "thumbs")

DATE_RE = re.compile(r"(20\d\d)-(\d\d)-(\d\d)")
WORKERS_RE = re.compile(r"(\d+)\s+Workers?\s*\|\s*([\d.]+)\s+Total Hours")
PROJECT_RE = re.compile(r"Project:\s*(.+)")
COMPLETED_RE = re.compile(r"completed by (.+?) on ([A-Za-z0-9 ,:]+?(?:AM|PM)[^.\n]*)", re.I)
SECTION_HEADS = ["OBSERVED WEATHER CONDITIONS", "MANPOWER", "NOTES", "PHOTOS",
                 "DELAYS", "VISITORS", "EQUIPMENT", "MATERIALS"]


def split_sections(text):
    """Return {section: body_text} by slicing between known headers."""
    idxs = []
    for h in SECTION_HEADS:
        for m in re.finditer(re.escape(h), text):
            idxs.append((m.start(), h))
    idxs.sort()
    out = {}
    for i, (pos, h) in enumerate(idxs):
        end = idxs[i + 1][0] if i + 1 < len(idxs) else len(text)
        body = text[pos + len(h):end].strip()
        # keep the first occurrence of each section
        out.setdefault(h, body)
    return out


def parse_notes(body):
    """NOTES rows: 'N Creator Yes/No <Location title>\\n<wrapped comments>'."""
    if not body:
        return [], []
    # drop the column header line
    body = re.sub(r"^\s*No\.\s+Created By\s+Issue\?\s+Location\s+Comments\s*", "", body)
    # split into entries on a leading "<num> <Firstname Lastname> <Yes|No> "
    parts = re.split(r"\n?\s*(\d+)\s+([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)\s+(Yes|No)\s+", body)
    notes, issues = [], []
    # parts: [pre, num, creator, issue, rest, num, creator, issue, rest, ...]
    for i in range(1, len(parts), 4):
        try:
            issue = parts[i + 2]
            rest = parts[i + 3]
        except IndexError:
            continue
        rest = re.sub(r"\s*[A-Za-z ]+Page \d+ of \d+.*", "", rest)  # strip footers
        lines = [l.strip() for l in rest.split("\n") if l.strip()]
        if not lines:
            continue
        title = lines[0]
        comment = " ".join(lines[1:]).strip()
        entry = f"{title}" + (f" — {comment}" if comment else "")
        notes.append(entry)
        if issue.lower() == "yes":
            issues.append(entry)
    return notes, issues


def parse_visitors(body):
    if not body:
        return []
    out = []
    for m in re.finditer(r"\n?\s*(\d+)\s+(\d{1,2}:\d\d\s*[AP]M)\s+(\d{1,2}:\d\d\s*[AP]M)(.*?)(?=\n\s*\d+\s+\d{1,2}:\d\d|\Z)", body, re.S):
        block = m.group(4)
        cm = re.search(r"Comments:\s*(.+?)(?:Created By:|$)", block, re.S)
        creator = re.search(r"Created By:\s*(.+)", block)
        out.append({
            "name": (creator.group(1).strip() if creator else ""),
            "company": "",
            "purpose": (cm.group(1).strip().lstrip("!").strip() if cm else ""),
            "arrivalTime": m.group(2).strip(),
        })
    return out


def parse_photos(body):
    if not body:
        return []
    names = re.findall(r"[\w\-]+\.(?:HEIC|heic|JPG|jpg|JPEG|jpeg|PNG|png)", body)
    seen, out = set(), []
    for n in names:
        if n not in seen:
            seen.add(n); out.append(n)
    return out


def extract_thumbs(pdf, date_str):
    """Crop embedded photo thumbnails (skip logo/icon) -> PNG files."""
    saved = []
    os.makedirs(THUMB_DIR, exist_ok=True)
    n = 0
    for pi, page in enumerate(pdf.pages):
        for im in page.images:
            w = float(im.get("width") or 0); h = float(im.get("height") or 0)
            if w < 70 or h < 70:      # logo 139x52, icon 34x34 -> skip
                continue
            try:
                bbox = (im["x0"], page.height - im["y1"], im["x1"], page.height - im["y0"])
                crop = page.crop(bbox)
                pil = crop.to_image(resolution=200).original
                fn = f"{date_str}_{n}.png"
                fp = os.path.join(THUMB_DIR, fn)
                pil.save(fp)
                saved.append(fp); n += 1
            except Exception as e:
                pass
    return saved


def parse_weather(body):
    """Weather observation rows: 'N HH:MM:SS AM/PM ... Yes/No' + Comments."""
    if not body:
        return []
    out = []
    for m in re.finditer(r"\n?\s*(\d+)\s+(\d{1,2}:\d\d:\d\d\s*[AP]M)\s*(.*?)\s*(Yes|No)?\s*\nComments:\s*(.*?)(?=\n\s*\d+\s+\d{1,2}:\d\d:\d\d|\Z)", body, re.S):
        mid = (m.group(3) or "").strip()
        out.append({
            "time": m.group(2).strip(),
            "conditions": " ".join(mid.split()) or None,
            "delay": (m.group(4) or "").strip() or "No",
            "comment": " ".join((m.group(5) or "").split()) or None,
        })
    return out


def parse_manpower(body):
    """MANPOWER: total line + per-crew rows + created-by."""
    if not body:
        return {}
    tot = re.search(r"(\d+)\s+Workers?\s*\|\s*([\d.]+)\s+Total Hours", body)
    created = re.search(r"Created By:\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)", body)
    crews = []
    for m in re.finditer(r"\n\s*(\d+)\s+(?:([A-Za-z][\w &.,'-]+?)\s+)?(\d+)\s+([\d.]+)\s+([\d.]+)\s*$", body, re.M):
        crews.append({
            "company": (m.group(2) or "").strip() or None,
            "workers": int(m.group(3)),
            "hours_each": float(m.group(4)),
            "total_hours": float(m.group(5)),
        })
    return {
        "workers": int(tot.group(1)) if tot else None,
        "total_hours": float(tot.group(2)) if tot else None,
        "created_by": created.group(1).strip() if created else None,
        "crews": crews,
    }


def parse_pdf(path):
    fn = os.path.basename(path)
    dm = DATE_RE.search(fn)
    date_str = f"{dm.group(1)}-{dm.group(2)}-{dm.group(3)}" if dm else None
    with pdfplumber.open(path) as pdf:
        text = "\n".join((p.extract_text() or "") for p in pdf.pages)
        thumbs = extract_thumbs(pdf, date_str or fn)
    secs = split_sections(text)
    notes, issues = parse_notes(secs.get("NOTES", ""))
    wm = WORKERS_RE.search(text)
    proj = PROJECT_RE.search(text)
    comp = COMPLETED_RE.search(text)
    photos = parse_photos(secs.get("PHOTOS", ""))
    visitors = parse_visitors(secs.get("VISITORS", ""))
    delays = secs.get("DELAYS", "").strip() or None
    weather = parse_weather(secs.get("OBSERVED WEATHER CONDITIONS", ""))
    manpower = parse_manpower(secs.get("MANPOWER", ""))

    # inspector: prefer "completed by", else manpower "Created By", else first note creator
    inspector = None
    if comp:
        inspector = comp.group(1).strip()
    elif manpower.get("created_by"):
        inspector = manpower["created_by"]
    else:
        nc = re.search(r"\n\s*\d+\s+([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)\s+(?:Yes|No)\s+", secs.get("NOTES", ""))
        if nc:
            inspector = nc.group(1).strip()

    work_performed = "\n\n".join(notes) if notes else None
    proj_full = proj.group(1).strip() if proj else None
    # address lines (between project line and phone)
    addr = None
    am = re.search(r"Project:.*\n(.*?)\nP:", text, re.S)
    if am:
        addr = " · ".join(l.strip() for l in am.group(1).split("\n") if l.strip())

    procore_data = {
        "source": "procore_daily_log",
        "company": (text.split("\n", 1)[0].strip() if text else None),
        "project_full": proj_full,
        "address": addr,
        "inspector": inspector,
        "completed_at": comp.group(2).strip() if comp else None,
        "total_hours": (wm and float(wm.group(2))) or manpower.get("total_hours"),
        "weather_observations": weather,
        "manpower": manpower,
        "photo_filenames": photos,
        "note_count": len(notes),
    }

    return {
        "file": fn,
        "report_date": date_str,
        "project_name": proj_full,
        "inspector_name": inspector,
        "workers_count": int(wm.group(1)) if wm else manpower.get("workers"),
        "total_hours": procore_data["total_hours"],
        "work_performed": work_performed,
        "issues_encountered": "\n\n".join(issues) if issues else None,
        "visitor_log": visitors,
        "delays": delays,
        "photo_filenames": photos,
        "procore_data": procore_data,
        "thumbs": thumbs,
    }


# ── Supabase (stdlib urllib) ──────────────────────────────────────────────────
def _req(method, url, key, data=None, headers=None, raw=False):
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    if headers:
        h.update(headers)
    body = data if raw else (json.dumps(data).encode() if data is not None else None)
    if data is not None and not raw:
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def apply_to_supabase(records, base, key, project_id, bucket="daily-report-pdfs", src=DEFAULT_SRC):
    # ensure bucket exists (ignore error if already there)
    _req("POST", f"{base}/storage/v1/bucket", key,
         {"id": bucket, "name": bucket, "public": True})
    updated = 0
    for rec in records:
        if not rec["report_date"]:
            continue
        # upload original PDF
        pdf_url = None
        pdf_path = os.path.join(src, rec["file"])
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                obj = f"{project_id}/{rec['report_date']}.pdf"
                st, _ = _req("POST", f"{base}/storage/v1/object/{bucket}/{obj}", key,
                             data=f.read(), raw=True,
                             headers={"Content-Type": "application/pdf", "x-upsert": "true"})
                if st in (200, 201):
                    pdf_url = f"{base}/storage/v1/object/public/{bucket}/{obj}"
        # upload thumbnails -> photo urls
        photo_urls = []
        for tp in rec["thumbs"]:
            with open(tp, "rb") as f:
                obj = f"{project_id}/{rec['report_date']}/{os.path.basename(tp)}"
                st, _ = _req("POST", f"{base}/storage/v1/object/{bucket}/{obj}", key,
                             data=f.read(), raw=True,
                             headers={"Content-Type": "image/png", "x-upsert": "true"})
                if st in (200, 201):
                    photo_urls.append(f"{base}/storage/v1/object/public/{bucket}/{obj}")
        # update the row (match project + date)
        patch = {
            # only overwrite text when we actually extracted notes — never clobber
            # an existing value on a genuinely-empty Procore log
            "work_performed": rec["work_performed"],
            "issues_encountered": rec["issues_encountered"],
            "workers_count": rec["workers_count"],
            "visitor_log": rec["visitor_log"],
            "delays": rec["delays"],
            "pdf_path": pdf_url,
        }
        if photo_urls:
            patch["photos"] = photo_urls
        patch = {k: v for k, v in patch.items() if v is not None}
        url = (f"{base}/rest/v1/daily_reports?project_id=eq.{project_id}"
               f"&report_date=eq.{rec['report_date']}")
        st, body = _req("PATCH", url, key, patch,
                        headers={"Prefer": "return=representation"})
        if st in (200, 204):
            n = len(json.loads(body)) if body and st == 200 else "?"
            updated += 1
            print(f"  ✓ {rec['report_date']}  rows={n}  photos={len(photo_urls)}  pdf={'yes' if pdf_url else 'no'}")
        else:
            print(f"  ✗ {rec['report_date']}  HTTP {st}  {body[:160]!r}")
    print(f"\nApplied updates for {updated}/{len(records)} reports.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--apply", action="store_true", help="write to Supabase")
    args = ap.parse_args()

    pdfs = sorted(glob.glob(os.path.join(args.src, "*.pdf")))
    if not pdfs:
        print(f"No PDFs in {args.src}"); sys.exit(1)
    os.makedirs(OUT_DIR, exist_ok=True)

    records = [parse_pdf(p) for p in pdfs]
    with open(os.path.join(OUT_DIR, "extracted.json"), "w") as f:
        json.dump(records, f, indent=2)

    # summary
    wp = sum(1 for r in records if r["work_performed"])
    th = sum(len(r["thumbs"]) for r in records)
    print(f"Parsed {len(records)} PDFs  ·  work_performed: {wp}  ·  thumbnails: {th}")
    print(f"JSON -> {os.path.join(OUT_DIR, 'extracted.json')}")
    print("\nSample (first record):")
    s = records[0]
    for k in ("report_date", "project_name", "inspector_name", "workers_count", "total_hours"):
        print(f"  {k}: {s[k]}")
    print("  work_performed:\n   ", (s["work_performed"] or "")[:400].replace("\n", "\n    "))
    print("  photo_filenames:", s["photo_filenames"][:5], f"(+{max(0,len(s['photo_filenames'])-5)} more)")
    print("  thumbnails:", len(s["thumbs"]))

    if args.apply:
        base = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        pid = os.environ.get("IMPORT_PROJECT_ID")
        if not (base and key and pid):
            print("\n[--apply] needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMPORT_PROJECT_ID env vars.")
            sys.exit(2)
        print(f"\nApplying to {base} (project {pid}) ...")
        apply_to_supabase(records, base.rstrip("/"), key, pid, src=args.src)


if __name__ == "__main__":
    main()
