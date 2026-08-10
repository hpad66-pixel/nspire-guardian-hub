# Glorieta Gardens — Program of Work

Working folder for the Glorieta Gardens utility and environmental program produced for
**Glorieta Partners, Ltd. / R4 GGOL GP LLC** by **APAS Consulting LLC**.

Everything here was generated in a Cowork session on **9 August 2026** (Rev 2.1).
Read `SESSION-LOG.md` first — it carries the decisions, the rules and the reasoning
that the documents themselves do not state.

---

## What is in here

```
docs/glorieta-program/
├── README.md              ← you are here
├── SESSION-LOG.md         ← decisions, hard rules, open items. Read this first.
├── program/               ← the client-facing deliverables (6 self-contained HTML files)
│   ├── Glorieta-Gardens-Program-of-Work.html    MASTER — start here
│   ├── 01-Stormwater-Management.html            15 projects
│   ├── 02-Sewer-Extension.html                   2 projects
│   ├── 03-Water-Systems.html                     6 projects
│   ├── 04-Environmental-Regulatory.html          6 projects
│   └── 05-Program-Management-ProjOS.html         2 projects
├── data/                  ← structured export for ProjOS ingestion
│   ├── Glorieta-ProjOS-Import.json              full nested schema + glossary
│   └── Glorieta-ProjOS-Import.csv               flat, one row per project
└── source/                ← generator. Edit these, never the HTML.
    ├── register.py        program + bucket + project data
    ├── glossary.py        75 plain-English term definitions
    └── build.py           renders all 6 HTML + both data files
```

## The program in one paragraph

Five buckets, 31 discrete projects. Stormwater leads because the **Stormwater Management
Plan is the program's first deliverable** — written up front so every project after it is
a chapter of a plan rather than a standalone expense. Sewer is in close-out and needs a
discharge flow meter. Water needs its pipes located before anything else can be designed.
Environmental establishes whether the neighbouring junkyards are putting contamination
onto the property, and drives the Consent Order to written termination. The fifth bucket
is APAS program management and the ProjOS operating record.

## Rebuilding the documents

The HTML is generated. Do not hand-edit it — the next build will overwrite your changes.

```bash
cd source
python3 build.py          # writes all 8 files into ./out
```

`build.py` reads `register.py` (the project data) and `glossary.py` (the term definitions)
and emits the six HTML documents plus the JSON and CSV. It has no third-party dependencies.

To change project content, edit the relevant `dict(...)` in `register.py`.
To add or reword a glossary term, edit `glossary.py` — auto-linking picks it up everywhere.

## Non-negotiables when revising

These are client-driven and were stated explicitly. Do not reintroduce what was removed.

1. **No dollar amounts.** Every budget reads `TBD`. The single exception is
   `WTR-01` at `$3,000 — Lump Sum`, which has approved scope.
2. **No durations.** No weeks, no dates, no schedule. Sequence and predecessors only.
3. **Stormwater Management Plan stays as STM-01 and stays flagged FIRST DELIVERABLE.**
4. **Every technical term stays clickable** with the three-part pop-up: engineering
   definition, plain-English version, and — where it matters — why it matters here.
5. **One proposal per project.** Owner signature is the basis of the work.
   APAS self-performed work is lump sum; subcontracted work is cost + 10% overhead
   + 10% profit.

## Relationship to this repository

These documents describe the program that ProjOS is intended to operate. The
`data/Glorieta-ProjOS-Import.json` file is the intended seed: 31 projects with scope,
deliverables, dependencies, commercial terms and regulatory drivers, plus the glossary.
Nothing in this folder is imported by the application yet.

The original copies also live in
`OneDrive-RegOS/APAS Consulting/PROJECTS/Glorieta Sewer/Program of Work/`.
