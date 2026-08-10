#!/usr/bin/env python3
"""
Import the Glorieta Gardens Program of Work into ProjOS.

Reads docs/glorieta-program/data/Glorieta-ProjOS-Import.json and builds the
three-level hierarchy the application already understands
(program ▸ bucket ▸ project, via projects.parent_project_id):

    Glorieta Gardens                    program
      Stormwater Management             bucket   STM   15 projects
      Sewer Extension                   bucket   SWR    2 projects
      …

Two things make this safe to run against a live workspace:

**It adopts, it does not duplicate.** Three Glorieta projects already exist and
one of them — "Sewer Ext Project" — carries the prime contract and the whole
D'SHIN payment ledger. Re-creating it would strand that history against an
orphan. ADOPT maps an existing project onto its program key by id, so it keeps
every contract, invoice and payment already attached to it.

**It is idempotent.** Identity is `program_meta->>'project_key'`, backed by a
partial unique index, so a second run updates in place rather than inserting
duplicates.

Dry run is the default and prints the full plan. Nothing is written without
--apply.

    python3 scripts/import_glorieta_program.py            # plan only
    python3 scripts/import_glorieta_program.py --apply    # write it

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
"""
import argparse
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = "docs/glorieta-program/data/Glorieta-ProjOS-Import.json"
IMPORT_JSON = os.path.join(ROOT, SOURCE)

SB_URL = os.environ.get("SUPABASE_URL")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Existing projects to adopt rather than re-create, by program key. These were
# created before the program document existed and already carry live work.
#   SWR-01 → "Sewer Ext Project": the prime contract + D'SHIN ledger live here.
#   WTR-03 → "Water meters at Glorieta"
#   STM    → "Stormwater Management" is adopted as the bucket itself, which also
#            keeps its existing child ("Design and Modeling") inside the program.
ADOPT_PROJECT = {
    "SWR-01": "Sewer Ext Project",
    "WTR-03": "Water meters at Glorieta",
}
ADOPT_BUCKET = {
    "STM": "Stormwater Management",
}

# Source status strings → the projects.status vocabulary.
STATUS_MAP = {
    "First deliverable": "active",
    "In progress": "active",
    "Active": "active",
    "Active obligation": "active",
    "Scope approved": "active",
    "Not started": "planning",
    "Conditional": "planning",
    "For discussion": "planning",
    "To be demonstrated": "planning",
}


def rest(method, path, body=None, prefer=None):
    cmd = ["curl", "-sS", "-X", method, f"{SB_URL}/rest/v1/{path}",
           "-H", f"apikey: {SB_KEY}", "-H", f"Authorization: Bearer {SB_KEY}",
           "-H", "Content-Type: application/json", "-w", "\n__HTTP__%{http_code}"]
    if prefer:
        cmd += ["-H", f"Prefer: {prefer}"]
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    payload, _, code = out.rpartition("\n__HTTP__")
    if int(code or 0) >= 300:
        raise SystemExit(f"HTTP {code} {method} {path}\n{payload}")
    return json.loads(payload) if payload.strip() else None


def get(path):
    return rest("GET", path)


def insert(body):
    return rest("POST", "projects", body, "return=representation")[0]


def update(pid, body):
    return rest("PATCH", f"projects?id=eq.{pid}", body, "return=representation")[0]


def describe(project):
    """headline + context — the description a human reads on the project page."""
    parts = [project.get("headline", ""), project.get("context", "")]
    return "\n\n".join(p for p in parts if p).strip()


def scope_text(project):
    return "\n".join(f"• {line}" for line in project.get("scope", []))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="write to the database (default is a dry run)")
    args = ap.parse_args()

    if not SB_URL or not SB_KEY:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")

    doc = json.load(open(IMPORT_JSON))
    program, buckets, projects = doc["program"], doc["buckets"], doc["projects"]

    existing = get("projects?select=id,name,parent_project_id,program_meta&limit=500")
    by_name = {p["name"].strip(): p for p in existing}
    by_key = {
        (p.get("program_meta") or {}).get("project_key"): p
        for p in existing
        if (p.get("program_meta") or {}).get("project_key")
    }

    plan = []          # (action, label, detail)
    ids = {}           # program key → project id (resolved during apply)
    dry = not args.apply

    def resolve(key, name, kind, parent_key, payload, adopt_name=None):
        """Insert, update, or adopt one row; record the plan line either way."""
        found = by_key.get(key) or (by_name.get(adopt_name) if adopt_name else None)
        parent_id = ids.get(parent_key)
        body = dict(payload)
        if parent_key:
            body["parent_project_id"] = parent_id

        if found and not by_key.get(key):
            action, detail = "ADOPT", f"existing “{found['name'].strip()}” → {key}"
        elif found:
            action, detail = "UPDATE", f"{key}"
        else:
            action, detail = "CREATE", f"{key}"
        plan.append((action, f"{kind:<7} {name[:46]}", detail))

        if dry:
            ids[key] = found["id"] if found else f"<new:{key}>"
            return
        ids[key] = update(found["id"], body)["id"] if found else insert(body)["id"]

    # ── program ──────────────────────────────────────────────────────────────
    resolve(
        program["key"], program["name"], "program", None,
        {
            "name": "Glorieta Gardens",
            "description": f"{program['name']}\n\n{program['property']} · {program['address']}\n"
                           f"Owner: {program['owner']} · Advisor: {program['advisor']} · {program['contract_ref']}",
            "project_type": "client",
            "status": "active",
            "phase": "active",
            "program_meta": {
                "program_key": program["key"], "kind": "program",
                "objectives": program.get("objectives"),
                "first_deliverable": program.get("first_deliverable"),
                "source": SOURCE,
            },
        },
    )

    # ── buckets ──────────────────────────────────────────────────────────────
    for b in sorted(buckets, key=lambda x: x["seq"]):
        resolve(
            b["key"], b["name"], "bucket", program["key"],
            {
                "name": b["name"],
                "description": f"{b.get('tagline','')}\n\n{b.get('summary','')}".strip(),
                "project_type": "client",
                "status": "active",
                "phase": "active",
                "program_meta": {
                    "program_key": program["key"], "bucket_key": b["key"], "kind": "bucket",
                    "seq": b["seq"], "color": b.get("color"), "posture": b.get("posture"),
                    "source": SOURCE,
                },
            },
            adopt_name=ADOPT_BUCKET.get(b["key"]),
        )

    # ── the 31 projects ──────────────────────────────────────────────────────
    for p in projects:
        resolve(
            p["key"], p["name"], "project", p["bucket"],
            {
                "name": p["name"],
                "description": describe(p),
                "scope": scope_text(p),
                "project_type": "client",
                "status": STATUS_MAP.get(p["status"], "planning"),
                "phase": "planning",
                "program_meta": {
                    "program_key": program["key"], "bucket_key": p["bucket"],
                    "project_key": p["key"], "kind": "project",
                    "type": p.get("type"), "status_label": p.get("status"),
                    "flag": p.get("flag"), "headline": p.get("headline"),
                    "deliverables": p.get("deliverables"),
                    "commercial": p.get("commercial"),
                    "parties": p.get("parties"),
                    "regulatory_driver": p.get("regulatory_driver"),
                    "sequence": p.get("sequence"),
                    "source": SOURCE,
                },
            },
            adopt_name=ADOPT_PROJECT.get(p["key"]),
        )

    # ── dependency graph ─────────────────────────────────────────────────────
    # projects.depends_on_project_id holds one predecessor; the full graph stays
    # in program_meta.sequence. Applied last, once every key has an id.
    deps = [(p["key"], p["sequence"]["predecessors"][0])
            for p in projects
            if p.get("sequence", {}).get("predecessors")]
    for key, pred in deps:
        plan.append(("DEPEND", f"{'':7} {key}", f"depends on {pred}"))
        if not dry and ids.get(key) and ids.get(pred):
            update(ids[key], {"depends_on_project_id": ids[pred]})

    # ── report ───────────────────────────────────────────────────────────────
    width = max(len(a) for a, _, _ in plan)
    for action, label, detail in plan:
        print(f"  {action:<{width}}  {label}  {detail}")

    counts = {}
    for action, _, _ in plan:
        counts[action] = counts.get(action, 0) + 1
    print("\n" + "  ".join(f"{k}: {v}" for k, v in sorted(counts.items())))
    print(f"\n{'DRY RUN — nothing written. Re-run with --apply.' if dry else 'Applied.'}")


if __name__ == "__main__":
    main()
