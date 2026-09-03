#!/usr/bin/env python3
"""Idempotently import an existing site-walk photo batch into Field Accountability.

The source photographs remain unchanged. The importer uploads each original plus
a small display thumbnail, preserves EXIF date/GPS when present, and creates
owner-visible accountability groupings with AI text clearly stored as an
unapproved suggestion.

Dry run is the default. Production writes require ``--apply`` and server-side
Supabase credentials in the environment::

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
      python3 scripts/import_field_accountability_photos.py \
      --source-dir /path/to/photos --project-id <uuid>

The storage path and ``source_type`` values include ``--batch-key``, making a
rerun safe after a partial upload.
"""

from __future__ import annotations

import argparse
import io
import json
import mimetypes
import os
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import ExifTags, Image, ImageOps
import certifi


GROUPS = [
    (1209, 1224, "Gate hardware, grounds and common-area conditions", "grounds", "medium",
     "Entry-gate hardware, painted-base scuffing, walk and utility-cover context, sparse landscape beds, recreation areas, and general hardscape conditions.",
     "Confirm which gate, landscape zones, and common-area conditions require maintenance follow-through."),
    (1225, 1240, "Pavement, accessibility and exterior-envelope conditions", "accessibility", "high",
     "Cracked or delaminated exterior finish, thin turf, fresh asphalt interfaces, and an open pavement area holding water near accessible routes.",
     "Confirm the exact accessible route, opening depth, temporary protection, and permanent repair responsibility."),
    (1241, 1256, "Utility covers, drainage and active walk restoration", "grounds", "high",
     "Utility covers, deteriorated pavement around bollards, drainage and dumpster areas, accessible parking markings, and active sidewalk or landscape restoration.",
     "Confirm settlement, drainage, safe pedestrian protection, and whether final surface restoration is complete."),
    (1257, 1272, "Ponding, wall penetration and landscape restoration", "building_envelope", "high",
     "Water-filled pavement depressions, an uncovered exterior-wall penetration, bare soil, runoff near accessible stalls, and an exposed outlet at a building wall.",
     "Confirm water-entry risk, drainage cause, outlet purpose, and responsible trade."),
    (1273, 1288, "Walk edges, disturbed turf and construction cleanup", "grounds", "medium",
     "Disturbed turf and shallow trenching beside new walks, incomplete landscape restoration, pavement residue, accessible-ramp context, and exposed soil around bollards.",
     "Confirm final grading, sod restoration, cleanup, and accessible-route completion."),
    (1289, 1304, "Drainage outlets, temporary wall closure and stair conditions", "building_envelope", "high",
     "Ramp and grass interfaces, a downspout or outlet with bare soil, a temporary black-plastic wall closure beside a service door, stair surfaces, and new walk segments.",
     "Confirm permanent weather-tight closure, outlet drainage, stair condition, and remaining landscape restoration."),
    (1305, 1320, "Active work protection, wheel stops and ponding", "accessibility", "high",
     "Excavation and formwork near a mature tree, unfinished concrete shoulders, accessible parking interfaces, cracked wheel stops, ponding, and work-area housekeeping.",
     "Confirm barricades, safe access, wheel-stop repair, drainage correction, and closeout of the active work zone."),
    (1321, 1336, "Building 5 walks, lawn restoration and utilities", "grounds", "medium",
     "New asphalt-to-sidewalk transitions, broad disturbed lawn strips, active tree work, utility equipment, Building 5 context, and unfinished landscape edges at new walks.",
     "Confirm Building 5 locations, utility ownership, final grading, and turf restoration limits."),
    (1337, 1352, "Sidewalk-edge voids and linear settlement", "grounds", "high",
     "Thin or bare turf, linear soil depressions beside walks and buildings, and open soil voids immediately adjacent to a concrete sidewalk.",
     "Confirm void depth, possible undermining, temporary protection, drainage cause, and urgent repair responsibility."),
    (1353, 1361, "Entry closeout, perimeter security and gate controls", "security", "high",
     "Utility-enclosure and ramp restoration, wet lawn areas, recent paving work, a damaged perimeter-wall opening, exposed gate-device cabling, and entry closeout conditions.",
     "Confirm whether gate equipment is energized and secure, the required enclosure repair, and remaining entry closeout work."),
]

PHOTO_RE = re.compile(r"^IMG_(\d+)\.(?:JPE?G|PNG|WEBP)$", re.IGNORECASE)
GPS_INFO = ExifTags.IFD.GPSInfo
EXIF_INFO = ExifTags.IFD.Exif


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--uploader-email", default="hardeep@apas.ai")
    parser.add_argument("--batch-key", default="files-3-2026-08-31")
    parser.add_argument("--expected-count", type=int, default=153)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


class Supabase:
    def __init__(self, base: str, key: str):
        self.base = base.rstrip("/")
        self.key = key
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())

    def _request(self, method: str, url: str, body: bytes | None = None, headers: dict | None = None):
        request_headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            **(headers or {}),
        }
        req = urllib.request.Request(url, data=body, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=90, context=self.ssl_context) as response:
                payload = response.read()
                return json.loads(payload) if payload else None
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {exc.code} {method} {url}: {detail}") from exc

    def select(self, table: str, **params):
        query = urllib.parse.urlencode(params, safe="(),.*:")
        return self._request("GET", f"{self.base}/rest/v1/{table}?{query}")

    def insert(self, table: str, row: dict):
        result = self._request(
            "POST",
            f"{self.base}/rest/v1/{table}",
            json.dumps(row).encode(),
            {"Content-Type": "application/json", "Prefer": "return=representation"},
        )
        return result[0]

    def patch(self, table: str, filters: dict, row: dict):
        query = urllib.parse.urlencode(filters, safe="(),.*:")
        return self._request(
            "PATCH",
            f"{self.base}/rest/v1/{table}?{query}",
            json.dumps(row).encode(),
            {"Content-Type": "application/json", "Prefer": "return=representation"},
        )

    def upload(self, bucket: str, storage_path: str, payload: bytes, content_type: str):
        quoted = urllib.parse.quote(storage_path, safe="/")
        return self._request(
            "POST",
            f"{self.base}/storage/v1/object/{bucket}/{quoted}",
            payload,
            {"Content-Type": content_type, "x-upsert": "true"},
        )


def rational(value) -> float:
    return float(value.numerator) / float(value.denominator) if hasattr(value, "numerator") else float(value)


def coordinate(values, ref: str | None) -> float | None:
    if not values or len(values) < 3:
        return None
    result = rational(values[0]) + rational(values[1]) / 60 + rational(values[2]) / 3600
    return -result if ref in {"S", "W"} else result


def image_metadata(path: Path) -> tuple[datetime | None, float | None, float | None, dict]:
    with Image.open(path) as image:
        exif = image.getexif()
        gps = exif.get_ifd(GPS_INFO) if exif else {}
        nested = exif.get_ifd(EXIF_INFO) if exif else {}
        date_text = nested.get(36867) or nested.get(36868) or exif.get(306)
        offset_text = nested.get(36881) or nested.get(36882)
        taken = None
        if date_text:
            parsed = datetime.strptime(str(date_text), "%Y:%m:%d %H:%M:%S")
            if offset_text and re.match(r"^[+-]\d\d:\d\d$", str(offset_text)):
                sign = 1 if str(offset_text)[0] == "+" else -1
                hours, minutes = map(int, str(offset_text)[1:].split(":"))
                from datetime import timezone, timedelta
                parsed = parsed.replace(tzinfo=timezone(sign * timedelta(hours=hours, minutes=minutes)))
            else:
                parsed = parsed.replace(tzinfo=ZoneInfo("America/New_York"))
            taken = parsed
        lat = coordinate(gps.get(2), gps.get(1))
        lng = coordinate(gps.get(4), gps.get(3))
        metadata = {
            "source_filename": path.name,
            "capture_time_source": "exif" if taken else "file",
            "location_source": "exif" if lat is not None and lng is not None else "not_available",
            "camera_make": exif.get(271),
            "camera_model": exif.get(272),
        }
        return taken, lat, lng, {key: value for key, value in metadata.items() if value is not None}


def thumbnail(path: Path) -> bytes:
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((640, 640), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, "JPEG", quality=82, optimize=True)
        return output.getvalue()


def group_for(number: int):
    for group in GROUPS:
        if group[0] <= number <= group[1]:
            return group
    raise RuntimeError(f"No assessment group covers IMG_{number}")


def one(rows: list[dict], description: str) -> dict:
    if len(rows) != 1:
        raise RuntimeError(f"Expected one {description}; found {len(rows)}")
    return rows[0]


def main() -> int:
    args = parse_args()
    source_dir = args.source_dir.resolve()
    if not source_dir.is_dir():
        raise SystemExit(f"Photo directory does not exist: {source_dir}")
    files = sorted(
        (path for path in source_dir.iterdir() if path.is_file() and PHOTO_RE.match(path.name)),
        key=lambda path: int(PHOTO_RE.match(path.name).group(1)),
    )
    if len(files) != args.expected_count:
        raise SystemExit(f"Expected {args.expected_count} photographs; found {len(files)}")
    numbers = [int(PHOTO_RE.match(path.name).group(1)) for path in files]
    if numbers != list(range(numbers[0], numbers[-1] + 1)):
        raise SystemExit("The source photo sequence has gaps; stop and reconcile it before import")

    base = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    db = Supabase(base, key)

    project = one(db.select("projects", id=f"eq.{args.project_id}", select="id,name,property_id,client_id,created_by"), "project")
    uploader = one(db.select("profiles", email=f"ilike.{args.uploader_email}", select="user_id,full_name,email,workspace_id", limit=1), "uploader profile")
    if project.get("property_id"):
        property_row = one(db.select("properties", id=f"eq.{project['property_id']}", select="id,name,workspace_id"), "property")
        tenant_id = property_row["workspace_id"]
        property_id = property_row["id"]
    else:
        tenant_id = uploader["workspace_id"]
        property_id = None
    if tenant_id != uploader.get("workspace_id"):
        raise SystemExit("Uploader and target project are not in the same workspace")

    print(f"Target: {project['name']} ({project['id']})")
    print(f"Batch: {args.batch_key} · {len(files)} originals · {len(GROUPS)} accountability groups")
    print(f"Mode: {'APPLY' if args.apply else 'DRY RUN'}")
    if not args.apply:
        for start, end, title, category, severity, *_ in GROUPS:
            print(f"  IMG_{start}–IMG_{end}: {title} [{category}/{severity}]")
        return 0

    visited_at, *_ = image_metadata(files[0])
    visit_source = f"client-photo-import:{args.batch_key}"
    visits = db.select("field_visits", project_id=f"eq.{project['id']}", notes=f"like.*{visit_source}*", select="id")
    if visits:
        visit = visits[0]
    else:
        visit = db.insert("field_visits", {
            "tenant_id": tenant_id,
            "project_id": project["id"],
            "property_id": property_id,
            "title": "R4 owner site walk — August 31, 2026",
            "visit_type": "owner_walk",
            "visited_at": (visited_at or datetime(2026, 8, 31, 14, 30, tzinfo=ZoneInfo("America/New_York"))).isoformat(),
            "status": "triage",
            "notes": f"Imported from Files (3).zip · {visit_source} · originals preserved with EXIF metadata.",
            "created_by": uploader["user_id"],
        })

    items_by_range: dict[tuple[int, int], dict] = {}
    for start, end, title, category, severity, observation, question in GROUPS:
        source_type = f"client_photo_import:{args.batch_key}:{start}-{end}"
        existing = db.select("field_accountability_items", project_id=f"eq.{project['id']}", source_type=f"eq.{source_type}", select="id,title")
        item = existing[0] if existing else db.insert("field_accountability_items", {
            "tenant_id": tenant_id,
            "project_id": project["id"],
            "property_id": property_id,
            "visit_id": visit["id"],
            "title": title,
            "description": f"AI-assisted starting assessment: {observation} Human field review is required before assignment, diagnosis, acceptance, or closeout. Confirmation needed: {question}",
            "category": category,
            "severity": severity,
            "location_label": f"Glorieta Gardens · IMG_{start}–IMG_{end} · GPS preserved per photograph",
            "status": "needs_triage",
            "ball_in_court": "property_management",
            "owner_visible": True,
            "owner_verification_required": False,
            "source_type": source_type,
            "created_by": uploader["user_id"],
        })
        items_by_range[(start, end)] = item

    created = linked = existing_count = 0
    for index, path in enumerate(files, start=1):
        number = int(PHOTO_RE.match(path.name).group(1))
        start, end, title, category, severity, observation, question = group_for(number)
        item = items_by_range[(start, end)]
        storage_path = f"{tenant_id}/{project['id']}/field-imports/{args.batch_key}/{path.name}"
        thumb_path = storage_path.rsplit(".", 1)[0] + ".thumb.jpg"
        photos = db.select("photos", storage_path=f"eq.{storage_path}", select="id,storage_path,thumb_path")
        if photos:
            photo = photos[0]
            existing_count += 1
        else:
            original = path.read_bytes()
            db.upload("project-photos", storage_path, original, mimetypes.guess_type(path.name)[0] or "image/jpeg")
            db.upload("project-photos", thumb_path, thumbnail(path), "image/jpeg")
            taken, lat, lng, exif = image_metadata(path)
            exif["source_batch"] = args.batch_key
            photo = db.insert("photos", {
                "tenant_id": tenant_id,
                "project_id": project["id"],
                "uploader_id": uploader["user_id"],
                "storage_path": storage_path,
                "thumb_path": thumb_path,
                "taken_at": taken.isoformat() if taken else None,
                "lat": lat,
                "lng": lng,
                "exif": exif,
                "caption": None,
                "is_private": False,
            })
            created += 1

        suggestion = {
            "caption": f"{path.stem}: {observation}",
            "category": category,
            "severity": severity,
            "visible_location_clues": ["Glorieta Gardens", f"Source photograph {path.name}", "GPS preserved from source EXIF"],
            "clarification_questions": [question],
            "evidence_warning": "AI-assisted starting assessment only. Verify the visible condition, exact location, priority, and responsible party before action.",
            "observed": [observation],
            "inferred": [],
            "source_batch": args.batch_key,
            "human_approved": False,
        }
        links = db.select("field_accountability_photos", photo_id=f"eq.{photo['id']}", select="id,item_id")
        link_row = {
            "tenant_id": tenant_id,
            "project_id": project["id"],
            "visit_id": visit["id"],
            "item_id": item["id"],
            "photo_id": photo["id"],
            "evidence_type": "observation",
            "sort_order": number - start,
            "ai_suggestion": suggestion,
            "created_by": uploader["user_id"],
        }
        if links:
            db.patch("field_accountability_photos", {"id": f"eq.{links[0]['id']}"}, link_row)
        else:
            db.insert("field_accountability_photos", link_row)
            linked += 1
        print(f"[{index:03}/{len(files)}] {path.name}", flush=True)

    total = db.select("field_accountability_photos", project_id=f"eq.{project['id']}", select="id", limit=1000)
    print(f"Complete: {created} originals uploaded, {existing_count} reused, {linked} links created, {len(total)} project photographs visible.")
    if len(total) < args.expected_count:
        raise RuntimeError(f"Verification failed: expected at least {args.expected_count} project photographs, found {len(total)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("Import interrupted; rerun is safe.", file=sys.stderr)
        raise SystemExit(130)
