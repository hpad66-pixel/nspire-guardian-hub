# Session Log — Glorieta Gardens Program of Work

**Date:** 9 August 2026
**Participants:** Hardeep Anand (APAS Consulting) · Claude (Cowork)
**Output:** 6 HTML documents, 1 JSON + 1 CSV export, 3 generator source files
**Revisions in session:** Rev 1.0 → Rev 2.0 → Rev 2.1

This log exists so that a future session — or a future you — can pick this up without
re-litigating decisions already made. It records what was asked, what was decided, and
what was deliberately *not* done.

---

## 1. The original brief

Build a beautiful document — not an email — for an executive client (Chris Sullivan / R4),
covering all forward work at Glorieta Gardens. User-friendly and easy to understand, but
professional and to the point.

The organising idea, stated by Hardeep and carried through every revision:

> **Everything is a project. A project has a scope, a schedule and a budget.**

This matters most for the work that does *not* look like a project — a conveyance, a file
review, a compliance close-out. Those consume real effort, depend on outside parties, and
slip when nobody owns them. Framing them as projects is the point of the document.

Buckets as originally dictated: (1) sewer extension, (2) stormwater management,
(3) water systems, (4) ongoing services for Consent Order and regulatory compliance.
A fifth was added in build: APAS program management and ProjOS.

**Design direction:** use the typography and colours of `civic.apas.ai`.

---

## 2. Decisions made in Rev 1.0

| Decision | Reasoning |
|---|---|
| Five buckets, not four | The four technical buckets need a delivery layer. APAS PM + ProjOS became Bucket 05. |
| CCTV sequenced **before** survey | The surveyor then locates a network we already understand, instead of discovering one. Makes the survey a foundation document rather than a partial one. |
| Dredge material profiling **before** dredging | Avoids the worst case: material excavated, stockpiled on site, then rejected at the receiving facility. Also sets the disposal cost before the quantity is committed. |
| Hydraulic model as the program fulcrum | Every field project feeds it; every design project is scoped by it. It is the item that converts opinion about flooding into an answer. |
| Second retention area treated as a liability, not a rumour | Everybody references it, nobody has located it. The project either finds it or formally closes the question on the record. |
| Environmental framed as owner protection | Purpose is to know first and document first if a neighbour's plume has arrived — not to volunteer into an enforcement posture. |

Rev 1.0 carried Class 5 budget bands (±50%) and duration ranges in working weeks.
**Both were removed in Rev 2.0.** See below.

---

## 3. Rev 2.0 — the four instructions that reshaped the document

Hardeep's direction, verbatim in substance:

### 3.1 Take out the cost for every project. Just put TBD.
> *"I don't need any monies anywhere because I didn't give it to you."*

Every budget line now reads `TBD`. **One exception:** `WTR-01 Water & Sewer Records and
File Assessment` = `$3,000 — Lump Sum`, status **Scope approved**, because that scope was
already agreed with the client.

The master document states this openly rather than hiding it: several projects cannot be
priced responsibly until an earlier one establishes what is physically there, and quoting
before that point would be a guess dressed as an estimate.

### 3.2 Take off the weeks.
All durations removed. Replaced with a **Follows** field naming predecessors. Rationale
written into the qualifications: *durations on unscoped work are guesses, dependencies are
facts.* Each proposal carries its own schedule.

### 3.3 The Stormwater Management Plan is the first deliverable. It should be number one.
Stormwater moved from Bucket 02 to **Bucket 01**, and the Management Plan moved from
STM-14 (last) to **STM-01 (first)**, with a gold `FIRST DELIVERABLE` bar on its card.

To keep this honest as engineering — a management plan genuinely does need the
investigation results — it is framed as **issued in two parts**:

- **Issue A** — framework and roadmap: design basis, level of service, what is unknown,
  the investigation program required to close each gap, the sequence and dependency map.
  *Sellable and deliverable now.*
- **Issue B** — final governing document: incorporates the survey, geotechnical, modelling
  and design results as they arrive, with the complete record set.

This is the commercial play as well as the technical one: get paid to write the plan that
scopes everything else, and give every subsequent project a stated place inside a document.

### 3.4 Put a consulting hat on. I need to make money here.
> *"I will make 20% (10% + 10%) profit, but I also need to have some of the work that I can do."*

Added a full **Authorisation & Fees** section to the master, and four new fields to every
project card:

- **Authorisation** — `Proposal to be issued` / `Scope approved — proposal to follow` /
  `For discussion before anything is scoped`
- **Fee Basis** — lump sum / lump sum + cost-plus / cost-plus / monthly
- **APAS Role** — Self-perform / Managed / Hybrid
- **Budget** — TBD or the approved figure

The commercial model, as stated to the client:

| | |
|---|---|
| APAS self-performed | **Lump sum**, fixed fee stated in the proposal |
| Specialty subcontract | **Cost** — the price APAS contracts it for |
| Overhead | **+10%** — procurement, contracting, insurance and bonding admin, supervision, verification, payment control |
| Profit | **+10%** — APAS fee for carrying performance and schedule risk |
| Recurring services | **Monthly** under annual authorisation |

Self-perform work was deliberately loaded where the margin and the control are: the plan,
the records reviews, the DTM, the H&H model, the designs, compliance, program management.

**Authorisation mechanism:** one short proposal per project — scope, deliverables, fee,
terms, one or two pages. *The owner's signature on that proposal is the basis of the work.*
Nothing proceeds without one. Projects can be authorised individually and in any order the
dependencies allow.

### 3.5 The glossary requirement
> *"Put a tooltip for everything on why it is needed... simple English... Somehow put an
> explanation without being derogatory so that it's also knowledgeable to him."*

Built a 75-term clickable glossary. Every term renders with a dotted gold underline and a
superscript `?`; clicking opens a modal with three parts:

1. **In engineering terms** — the real definition, using the words the City, DERM, SFWMD
   and FDEP will use in their correspondence
2. **In plain terms** — the same thing said across a table
3. **Why it matters here** — on the terms that carry weight, tied to this property

**Tone rule, explicitly set:** never explain down. Assume an intelligent reader who simply
has not spent twenty years in a utility.

Retention pond was called out by name and gets all three panels — the stage-storage and
permitted-volume definition, the bathtub explanation with the point that sediment steals
capacity invisibly, and the note that nobody currently knows how much storage is left in
this one.

---

## 4. Rev 2.1 — non-revenue water

Added `WTR-06 Non-Revenue Water Assessment & Water Balance` as a **discussion item, not a
proposal**. Blue `FOR DISCUSSION` bar instead of gold; authorisation reads *"For discussion
before anything is scoped."* It surfaces automatically in a new **For discussion** section
on the master, headed *"One item I would like to talk through before proposing anything."*

The argument the section makes to R4:

- **Timing.** NRW analysis needs reliable input measurement, reliable use measurement, and
  separation of large unbilled uses. The property has none of the three today — but
  acquires all three inside this program (WTR-03 metering, WTR-05 irrigation well taking
  the largest unbilled use off the potable system). A baseline **now** plus a re-run
  **after** is worth materially more than either alone, because it shows how much of the
  loss the work already being paid for actually recovered.
- **It reduces an operating cost.** The only item in the program likely to do so rather
  than avoid a future one.

Scope outline: AWWA M36 water balance, apparent vs. real loss split, Infrastructure
Leakage Index, minimum night flow analysis, DMA evaluation, dollar value at City rates,
ongoing tracking in ProjOS. Ten supporting glossary terms added.

---

## 5. The program as it now stands — 31 projects

### Bucket 01 · Stormwater Management (15) — `#17A2B8`
`STM-01` Stormwater Management Plan **(FIRST DELIVERABLE)** →
`02` Records & file review → `03` CCTV inspection → `04` Topographic & utility survey →
`05` Geotechnical & permeability → `06` Retention pond survey →
`07` DTM & dredge volume → `08` Material characterization, profiling & disposal →
`09` Pond dredging → `10` Hydrologic & hydraulic model (5/25/100-yr) →
`11` Lift station → `12` Pond design → `13` Site regrading →
`14` Supplemental features / second retention area **(conditional)** →
`15` Stormwater Operations Plan

### Bucket 02 · Sewer Extension (2) — `#2E6BA6`
`SWR-01` Conveyance & close-out to City of Opa-Locka **(in progress)** ·
`SWR-02` Master effluent flow meter at the discharge point

### Bucket 03 · Water Systems (6) — `#2E8B57`
`WTR-01` Water & sewer records and file assessment **($3,000 LS — SCOPE APPROVED)** →
`02` Field verification & as-built → `03` Meter box program →
`04` Backflow prevention → `05` Irrigation well ·
`WTR-06` Non-revenue water **(FOR DISCUSSION)**

### Bucket 04 · Environmental & Regulatory (6) — `#7B4FBF`
`ENV-01` Adjacent property file review & plume assessment →
`02` Boundary monitoring wells → `03` Groundwater sampling →
`04` Findings report & regulatory strategy ·
`ENV-05` Consent Order close-out **(active)** · `ENV-06` Ongoing compliance **(active)**

### Bucket 05 · Program Management & ProjOS (2) — `#C8962E`
`PMO-01` Program & project management **(active)** ·
`PMO-02` ProjOS operating record **(to be demonstrated)**

### Critical path
`STM-01 → STM-02 → STM-03 → STM-04 → STM-05 → STM-10 → STM-13`

Plan, records, camera, survey, geotechnical, model, construction. Six comparatively small
projects stand between the owner and a defined, priceable scope on the largest physical
item in the program.

---

## 6. Design system

`civic.apas.ai` typography and colour, confirmed by Hardeep — **not scraped.**
The site is unreachable from the Cowork cloud sandbox (`ERR_CONNECTION_RESET`), and Google
Fonts is blocked there too, so headless screenshots render in fallback fonts. It displays
correctly on a normal machine.

```
--ivory      #FAF8F3   page canvas
--sand       #F3EFE6   alternating bands
--paper      #FFFFFF   cards
--rule       #E2DCCE   hairlines
--obsidian   #0D0D12   masthead, footer, dark bands, ink
--gold       #C8962E   primary accent
--gold-deep  #A87A1E   labels
--gold-light #E8C875   hero italic, highlights
```

Playfair Display 900/700 (display) · Inter 300–700 (body/UI) · JetBrains Mono (labels, data).

Bucket colours are listed with each bucket above. `FOR DISCUSSION` uses `#2E6BA6`.

---

## 7. Implementation notes for whoever picks this up

- **Regenerate, never hand-edit.** `build.py` overwrites all eight output files.
- **Glossary auto-linking** wraps the *first* occurrence of each term per project card.
  Single-pass regex, longest alias first, with a `used` set — this is what stops it
  re-matching inside markup it just injected. Don't refactor it into multiple passes.
- **The portfolio table is `table-layout: fixed`** with explicit `colgroup` widths.
  Status pills and budget cells need short labels or they overflow their column — that is
  what the `SHORT_STATUS` dict is for. Re-check the fit after adding any status value.
- **Project counts appear as words** in a few prose strings ("thirty-one projects").
  Grep for them when the count changes.
- **To flag something for discussion** rather than propose it: set
  `status="For discussion"`, `flag="FOR DISCUSSION"`, `flag_kind="discuss"`,
  `auth="DISCUSS"`. It will style itself and appear in the master's discussion section
  automatically.

---

## 8. Open items

- **Per-project proposals have not been written.** Every card in the document promises one.
  Start with `STM-01` (Stormwater Management Plan, Issue A) and `WTR-01` (the approved
  $3,000 records assessment) — those two are sendable immediately.
- **Non-revenue water conversation** with R4 has not happened yet.
- **ProjOS ingestion** — `data/Glorieta-ProjOS-Import.json` is built and validated
  (31 projects, acyclic dependency graph, 75 glossary terms) but nothing consumes it yet.
- **ProjOS live walkthrough** with R4 is recommended in the document and not yet scheduled.

## 9. Carried over from the sewer close-out work

Context from earlier sessions that these documents assume:

- **Parties.** Property owner: Glorieta Partners, Ltd. c/o R4 GGOL GP LLC. APAS Consulting
  LLC is Owner/Client under PC-01 and Prime Contractor under the Agreement — **never
  describe APAS as a general contractor.** D'Shin Plumbing LLC is the sewer subcontractor.
- **Conveyance roles.** Al Dettbahe PE is Engineer of Record. Felix is the surveyor/PSM.
  Greg Rand is a separate contractor holding the CCTV and field restoration scope.
  Legal, title and security items sit with R4 and owner's counsel.
- **Warranties.** Three twelve-month warranties by building group: Bldg 3 South + Bldg 4;
  Bldg 5 + Bldg 6; Bldg 3 North.
