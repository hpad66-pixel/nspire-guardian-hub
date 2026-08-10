# CLAUDE.md — docs/glorieta-program

> Standing context for Claude Code sessions working in this folder.
> This work originated in a Cowork (cloud) session on 9 Aug 2026. Conversations do not
> transfer between surfaces — these files are the handoff. Read `SESSION-LOG.md` for the
> full decision record; this file is the operational summary.

---

## What this is

The **Glorieta Gardens Program of Work** — a client-facing document set for
Glorieta Partners, Ltd. / R4 GGOL GP LLC, produced by APAS Consulting LLC.
Five buckets, 31 projects, covering stormwater, sewer, water, environmental/regulatory
compliance, and APAS program management.

It is **not application code.** Nothing here is imported by Procore Lite yet.
`data/Glorieta-ProjOS-Import.json` is the intended seed if/when ProjOS ingests it.

## Layout

```
docs/glorieta-program/
├── CLAUDE.md          ← this file
├── README.md          index + revision rules
├── SESSION-LOG.md     full decision record — read before revising anything
├── program/           6 generated HTML deliverables (DO NOT HAND-EDIT)
├── data/              ProjOS import: JSON + CSV
└── source/            register.py · glossary.py · build.py
```

## Build

```bash
cd docs/glorieta-program/source
python3 build.py            # writes 6 HTML + JSON + CSV into ./out
```

No third-party dependencies. `build.py` imports `register.py` (project data) and
`glossary.py` (75 term definitions) and renders everything. Verified working.

**The HTML in `program/` is generated output.** Editing it directly is always wrong —
the next build discards it. Change `register.py` or `glossary.py` instead.

After building, copy `source/out/*.html` over `program/` and `source/out/*.json|csv`
over `data/`.

---

## ⚠️ THE OPEN TASK — rebrand to civic.apas.ai

**This is the live request and it is blocked in the cloud, but NOT blocked here.**

Hardeep's instruction, verbatim: *"take a look at civic.apas.ai, and I want all these HTML
documents to be rebranded along the lines of civic.apas.ai. 100%. I don't like the
typography and the fonts of what you have here right now."*

The current typography — Playfair Display / Inter / JetBrains Mono with an ivory-obsidian-gold
palette — was built from a **verbal description**, never from the actual site. Hardeep has
now rejected it. It must be replaced with the real thing.

**Why Cowork could not do this and you can:** the Cowork cloud sandbox gets
`ERR_CONNECTION_RESET` on `civic.apas.ai`, its WebFetch tool strips `<style>` blocks and
`<link>` tags during markdown conversion, and the Chrome extension was not connected.
**You are running on Hardeep's Mac with normal network access.** Just fetch it:

```bash
curl -sL https://civic.apas.ai -o /tmp/civic.html
grep -oE '<link[^>]+stylesheet[^>]*>' /tmp/civic.html      # find linked CSS
grep -oE 'fonts\.(googleapis|gstatic)\.com[^"'"'"')]*' /tmp/civic.html
# then curl each stylesheet and read the real values
```

### What to extract

- **Font families actually loaded**, and which weights — check the Google Fonts / Adobe
  URL query string, not just the `font-family` declarations
- **Type scale** — sizes for h1/h2/h3/body/small, with `letter-spacing` and `line-height`
- **The full colour set** — every `:root` custom property, or the Tailwind config if it is
  a Tailwind site
- **Structural conventions** — border widths, radii, section padding rhythm, how eyebrow
  labels and section headings are treated, uppercase/tracking usage

### How to apply it

All styling lives in **one place**: the `CSS = """..."""` string near the top of
`source/build.py`, plus the `:root` block inside it. Replace the `@import` line and the
custom properties, then work through the component rules. Every one of the six documents
picks the change up on rebuild — there is no per-document styling.

Save what you find as `source/civic-tokens.md` so it never has to be re-derived.

---

## Non-negotiables — do not undo these

Client-driven and explicitly stated. Earlier revisions had them the other way; they were
changed on instruction.

1. **No dollar amounts anywhere.** Every budget field reads `TBD`.
   Sole exception: `WTR-01` = `$3,000 — Lump Sum`, status `Scope approved`.
   Reason: no figures were ever supplied, and invented ones must not reach the client.
2. **No durations.** No weeks, no dates, no schedule anywhere. Sequence and predecessors
   only — the `Follows` field. Each per-project proposal will carry its own schedule.
3. **`STM-01` Stormwater Management Plan stays first**, in Bucket 01, with the
   `FIRST DELIVERABLE` flag. It is written up front so every later project sits inside a
   plan rather than standing alone as an expense.
4. **Every technical term stays clickable**, with the three-part modal: engineering
   definition, plain-English version, and "why it matters here" where it applies.
   Tone rule: never explain down — assume an intelligent reader who has not spent twenty
   years in a utility.
5. **Commercial model stays as stated:** one short proposal per project, owner signature is
   the basis of the work; APAS self-performed work is lump sum; subcontracted work is
   cost + 10% overhead + 10% profit.

## Implementation notes

- **Glossary auto-linking** wraps the first occurrence of each term per project card.
  Single-pass regex, longest alias first, with a `used` set — that single pass is what
  prevents it re-matching inside markup it just injected. Do not split it into multiple
  passes.
- **The portfolio table is `table-layout: fixed`** with explicit `colgroup` widths. Status
  pills and budget cells need short labels or they overflow — that is what `SHORT_STATUS`
  is for. Re-check the fit after adding any status value.
- **Project counts appear spelled out** in prose ("thirty-one projects"). Grep when the
  count changes.
- **To flag an item for discussion** rather than propose it: `status="For discussion"`,
  `flag="FOR DISCUSSION"`, `flag_kind="discuss"`, `auth="DISCUSS"`. It styles itself and
  appears in the master's discussion section automatically. `WTR-06` is the example.

## Next up after the rebrand

Per-project proposals — short, signature-ready, one per project. Every card in the document
promises one and none exist yet. Start with `STM-01` (Stormwater Management Plan, Issue A)
and `WTR-01` (the approved $3,000 records assessment); both are sendable immediately.

## Duplicate copy

The same eight deliverables also sit in
`~/Library/CloudStorage/OneDrive-RegOS/APAS Consulting/PROJECTS/Glorieta Sewer/Program of Work/`.
Cowork's device bridge cannot delete, so that was a copy rather than a move. Decide which
location is canonical and retire the other.
