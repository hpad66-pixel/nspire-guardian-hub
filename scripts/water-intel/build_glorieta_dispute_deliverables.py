from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Image as PdfImage
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "deliverables" / "r4-glorieta"
OUT.mkdir(parents=True, exist_ok=True)

DOCX_OUT = OUT / "r4-glorieta-buildings-7-8-billing-evidence-packet.docx"
PDF_OUT = OUT / "r4-glorieta-buildings-7-8-billing-evidence-packet.pdf"
DIAGRAM_OUT = OUT / "r4-glorieta-buildings-7-8-billing-comparison.png"
CORPUS_TS = ROOT / "src" / "lib" / "water-intel" / "glorietaCorpus.generated.ts"
UNIT_SOURCE = "/Users/apas/Downloads/Buildings & Unit #'s.pdf"

FOREST = "08271F"
GOLD = "D5AA52"
SAPPHIRE = "71A8CF"
ROSE = "E36B64"
LIMESTONE = "FBF8F1"
MIST = "EEF3F0"
INK = "1A1F1C"
MUTED = "5C6863"


@dataclass(frozen=True)
class Fact:
    label: str
    value: str
    note: str


@dataclass(frozen=True)
class Period:
    label: str
    dates: str
    charges: float | None
    gallons: int | None
    note: str
    color: str


@dataclass(frozen=True)
class PhaseTotal:
    bills: int
    charges: float
    gallons: int
    first: str | None
    last: str | None
    first_read: int | None
    last_read: int | None


@dataclass(frozen=True)
class AccountSummary:
    account: str
    label: str
    service_address: str
    meter: str
    unit_context: str
    pre: PhaseTotal
    vacancy: PhaseTotal
    post: PhaseTotal
    is_dispute: bool = False


@dataclass(frozen=True)
class MonthlyRecord:
    account: str
    label: str
    period: str
    gallons: int
    charges: float
    reads: str
    phase: str


def money(value: float) -> str:
    return f"${value:,.2f}"


def gallons(value: int) -> str:
    return f"{value:,} gal"


FACTS = {
    "property": "Glorieta Gardens",
    "client": "R4",
    "building_7_account": "1692380502",
    "building_7_meter": "1800224848",
    "building_7_label": "Building 7 / North",
    "building_7_units": "63 visible units from 07-W123 through 07-W345",
    "building_7_unit_note": "Building 7 unit source shows 63 visible units; 07-W230, 07-W244, 07-W330, and 07-W344 are not visible in the source list.",
    "building": "Building 8 / 13200 Alexandria Drive",
    "account": "2745714336",
    "meter": "61302354",
    "formal_rebill": 95017.57,
    "unpaid_balance": 113874.41,
    "indexed_dispute_charges": 100386.80,
    "indexed_water": 39229.56,
    "indexed_sewer": 55474.80,
    "indexed_gallons": 4764000,
    "dispute_period": "April 2024 through January 2026",
    "vacancy_period": "August 2023 through February 2025",
    "formal_dispute_date": "July 23, 2026",
    "source_files": 532,
    "canonical_records": 278,
    "dispute_bills": 22,
    "building_8_units": "58 visible units from 08-W103 through 08-W322",
    "building_8_unit_note": "Building 8 unit source shows 08-W103-08-W216 and 08-W217-08-W322; 08-W221 and 08-W321 are not visible in the source list.",
}

FOCUS_ACCOUNTS = {FACTS["building_7_account"], FACTS["account"]}

PERIODS = [
    Period(
        "Pre-vacancy reference",
        "Before August 2023",
        None,
        None,
        "No Building 8 pre-vacancy bills are in the current canonical evidence archive, so no pre-period dollar claim is stated.",
        "#94A3B8",
    ),
    Period(
        "Vacancy/rehab support",
        "April 2024 through February 2025",
        50131.93,
        2379000,
        "Indexed Building 8 charges while the building was within the red-tagged, vacant, or rehab timeline.",
        f"#{ROSE}",
    ),
    Period(
        "Post-rehab support",
        "March 2025 through January 2026",
        50254.87,
        2385000,
        "Indexed Building 8 charges after reoccupation activity began, included only because the dispute file runs through January 2026.",
        f"#{FOREST}",
    ),
]

MONTHLY = [
    ("Apr 2024", 216000, 4551.86),
    ("May 2024", 216000, 4551.86),
    ("Jun 2024", 216000, 4551.86),
    ("Jul 2024", 216000, 4551.86),
    ("Aug 2024", 216000, 4551.86),
    ("Sep 2024", 216000, 4551.86),
    ("Oct 2024", 216000, 4551.86),
    ("Nov 2024", 216000, 4551.86),
    ("Dec 2024", 217000, 4572.35),
    ("Jan 2025", 217000, 4572.35),
    ("Feb 2025", 217000, 4572.35),
    ("Mar 2025", 217000, 4572.35),
    ("Apr 2025", 217000, 4572.35),
    ("May 2025", 217000, 4572.35),
    ("Jun 2025", 217000, 4572.35),
    ("Jul 2025", 217000, 4572.35),
    ("Aug 2025", 217000, 4572.35),
    ("Sep 2025", 217000, 4572.35),
    ("Oct 2025", 217000, 4572.35),
    ("Nov 2025", 217000, 4572.35),
    ("Dec 2025", 216000, 4551.86),
    ("Jan 2026", 216000, 4551.86),
]


def load_corpus_records() -> list[dict]:
    text = CORPUS_TS.read_text()
    match = re.search(
        r"export const GLORIETA_CORPUS_BILLS: GlorietaCorpusBill\[\] = (\[.*?\]);\n\nexport const GLORIETA_CANONICAL_BILLS",
        text,
        re.S,
    )
    if not match:
        raise RuntimeError(f"Could not parse corpus records from {CORPUS_TS}")
    records = json.loads(match.group(1))
    return sorted(
        [
            record
            for record in records
            if record.get("isCanonical") and record.get("accountNumber") and record.get("periodStart")
        ],
        key=lambda record: (record.get("accountNumber", ""), record.get("periodStart", "")),
    )


def phase_for(period_start: str) -> str:
    if period_start < "2023-08-01":
        return "pre"
    if period_start <= "2025-02-28":
        return "vacancy"
    return "post"


def blank_phase() -> dict:
    return {
        "bills": 0,
        "charges": 0.0,
        "gallons": 0,
        "first": None,
        "last": None,
        "first_read": None,
        "last_read": None,
    }


def phase_total(data: dict) -> PhaseTotal:
    return PhaseTotal(
        bills=int(data["bills"]),
        charges=float(data["charges"]),
        gallons=int(data["gallons"]),
        first=data["first"],
        last=data["last"],
        first_read=data["first_read"],
        last_read=data["last_read"],
    )


def title_case_address(value: str | None) -> str:
    return str(value or "").title().replace(" Nw ", " NW ")


def build_account_summaries() -> list[AccountSummary]:
    accounts: dict[str, dict] = {}
    for bill in load_corpus_records():
        account = str(bill["accountNumber"])
        row = accounts.setdefault(
            account,
            {
                "account": account,
                "label": bill.get("buildingLabel") or title_case_address(bill.get("serviceAddress")) or account,
                "service_address": title_case_address(bill.get("serviceAddress")),
                "meter": str(bill.get("meterNumber") or ""),
                "phases": defaultdict(blank_phase),
            },
        )
        if not row["meter"] and bill.get("meterNumber"):
            row["meter"] = str(bill["meterNumber"])
        if not row["service_address"] and bill.get("serviceAddress"):
            row["service_address"] = title_case_address(bill.get("serviceAddress"))

        phase = row["phases"][phase_for(str(bill["periodStart"]))]
        phase["bills"] += 1
        phase["charges"] += float(bill.get("currentCharges") or bill.get("amountDue") or 0)
        phase["gallons"] += int(bill.get("consumptionGallons") or 0)
        if phase["first"] is None or str(bill["periodStart"]) < str(phase["first"]):
            phase["first"] = bill.get("periodStart")
            phase["first_read"] = bill.get("priorReading")
        if phase["last"] is None or str(bill.get("periodEnd") or "") > str(phase["last"]):
            phase["last"] = bill.get("periodEnd")
            phase["last_read"] = bill.get("currentReading")

    summaries: list[AccountSummary] = []
    for account, row in accounts.items():
        unit_context = ""
        if account == FACTS["building_7_account"]:
            unit_context = FACTS["building_7_units"]
        if account == FACTS["account"]:
            unit_context = FACTS["building_8_units"]
        summaries.append(
            AccountSummary(
                account=account,
                label=row["label"],
                service_address=row["service_address"],
                meter=row["meter"],
                unit_context=unit_context,
                pre=phase_total(row["phases"]["pre"]),
                vacancy=phase_total(row["phases"]["vacancy"]),
                post=phase_total(row["phases"]["post"]),
                is_dispute=account == FACTS["account"],
            ),
        )
    return sorted(summaries, key=lambda item: (not item.is_dispute, item.label, item.account))


ACCOUNT_SUMMARIES = build_account_summaries()
FOCUS_ORDER = {FACTS["building_7_account"]: 0, FACTS["account"]: 1}
FOCUS_SUMMARIES = sorted(
    [account for account in ACCOUNT_SUMMARIES if account.account in FOCUS_ACCOUNTS],
    key=lambda account: FOCUS_ORDER.get(account.account, 99),
)


def sum_phase(phase_name: str) -> PhaseTotal:
    phases = [getattr(account, phase_name) for account in FOCUS_SUMMARIES]
    return PhaseTotal(
        bills=sum(phase.bills for phase in phases),
        charges=sum(phase.charges for phase in phases),
        gallons=sum(phase.gallons for phase in phases),
        first=min([phase.first for phase in phases if phase.first] or [None]),
        last=max([phase.last for phase in phases if phase.last] or [None]),
        first_read=None,
        last_read=None,
    )


ALL_PHASES = {
    "pre": sum_phase("pre"),
    "vacancy": sum_phase("vacancy"),
    "post": sum_phase("post"),
}


def phase_label(period_start: str) -> str:
    phase = phase_for(period_start)
    if phase == "pre":
        return "Pre-vacancy"
    if phase == "vacancy":
        return "Vacancy/rehab"
    return "Post-rehab"


def build_monthly_records(account_number: str) -> list[MonthlyRecord]:
    records: list[MonthlyRecord] = []
    for bill in load_corpus_records():
        if str(bill.get("accountNumber")) != account_number:
            continue
        start = str(bill.get("periodStart") or "")
        end = str(bill.get("periodEnd") or "")
        reads = "Not shown"
        if bill.get("priorReading") is not None and bill.get("currentReading") is not None:
            reads = f"{int(bill['priorReading']):,} to {int(bill['currentReading']):,}"
        records.append(
            MonthlyRecord(
                account=account_number,
                label=bill.get("buildingLabel") or account_number,
                period=f"{start} to {end}",
                gallons=int(bill.get("consumptionGallons") or 0),
                charges=float(bill.get("currentCharges") or bill.get("amountDue") or 0),
                reads=reads,
                phase=phase_label(start),
            )
        )
    return sorted(records, key=lambda row: row.period)


BUILDING_7_MONTHLY = build_monthly_records(FACTS["building_7_account"])
BUILDING_8_MONTHLY = build_monthly_records(FACTS["account"])

LETTER_HTML = f"""
<h2>Formal request for corrected billing and credit</h2>
<p><strong>To:</strong> City of Opa-locka Public Works Department and Miami-Dade Water and Sewer Department</p>
<p><strong>Re:</strong> Glorieta Gardens - Account {FACTS['account']}, Meter {FACTS['meter']}, Building 8 / 13200 Alexandria Drive</p>
<p>Dear Public Works and WASD Billing Review Team,</p>
<p>We are requesting a corrected billing review and credit for the Building 8 water and sewer account at Glorieta Gardens. The disputed period covers the vacancy and rehabilitation window beginning in April 2024 and continuing through January 2026, when Building 8 was not operating as an occupied residential building.</p>
<p>The owner-side record shows that the account was billed using estimated usage of approximately 216,000 gallons per month during a period when ordinary residential consumption could not have occurred. The July 23, 2026 dispute letter identifies a {money(FACTS['formal_rebill'])} retroactive rebill and a {money(FACTS['unpaid_balance'])} unpaid balance. The available billing statement backup shows {gallons(FACTS['indexed_gallons'])} and {money(FACTS['indexed_dispute_charges'])} in current charges tied to Account {FACTS['account']} within the dispute window.</p>
<p>Our request is straightforward: please remove charges that are not supported by actual consumption, actual meter reads, or a reasonable service-location consumption basis for the period when the building was condemned, vacant, and under rehabilitation. Where actual reads are unavailable, please apply the corrected-billing principles in WASD's rules using actual consumption from a comparable service-location period or average anticipated consumption appropriate to a vacant building, not an occupied multifamily building.</p>
<p>We also request the meter-change work order, installation date, starting register reading, read history, estimate basis, adjustment worksheet, payment ledger, late charge ledger, and any internal investigation notes used to support the rebill.</p>
<p>Until the review is complete, please suspend any past-due classification, late charge escalation, collection action, discontinuance process, or adverse account action related to the disputed estimated amount.</p>
<p>Respectfully,</p>
<p><strong>R4</strong></p>
"""


class SimpleHtml(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.items: list[tuple[str, str]] = []
        self.current: list[str] = []
        self.tag = "p"

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"p", "h2"}:
            self.flush()
            self.tag = tag
        if tag == "br":
            self.current.append("\n")

    def handle_data(self, data: str) -> None:
        self.current.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"p", "h2"}:
            self.flush()
            self.tag = "p"

    def flush(self) -> None:
        text = "".join(self.current).strip()
        if text:
            self.items.append((self.tag, text))
        self.current = []


def parse_letter() -> list[tuple[str, str]]:
    parser = SimpleHtml()
    parser.feed(LETTER_HTML)
    parser.flush()
    return parser.items


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Avenir Next.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=1 if bold else 0)
        except Exception:
            continue
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, font_obj, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font_obj) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    font_obj,
    width: int,
    fill: str,
    line_gap: int,
    max_lines: int | None = None,
) -> int:
    x, y = xy
    lines = wrap(draw, text, font_obj, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        draw.text((x, y), line, fill=fill, font=font_obj)
        y += line_gap
    return y


def short_range(phase: PhaseTotal) -> str:
    if not phase.first:
        return "No indexed bills"
    return f"{phase.first} to {phase.last}"


def reading_range(phase: PhaseTotal) -> str:
    if phase.first_read is None or phase.last_read is None:
        return "No reading span"
    return f"Read {phase.first_read:,} to {phase.last_read:,}"


def phase_cell(phase: PhaseTotal) -> str:
    if phase.bills == 0:
        return "No indexed bills"
    return f"{money(phase.charges)}\n{gallons(phase.gallons)}\n{phase.bills} bills"


def phase_line(account: AccountSummary, key: str) -> tuple[str, PhaseTotal]:
    label = "Building 7" if account.account == FACTS["building_7_account"] else "Building 8"
    return label, getattr(account, key)


def draw_timeline() -> None:
    img = Image.new("RGB", (2200, 1320), f"#{LIMESTONE}")
    draw = ImageDraw.Draw(img)
    f_title = font(70, True)
    f_sub = font(31)
    f_label = font(34, True)
    f_small = font(24)
    f_tiny = font(21)
    f_num = font(38, True)
    f_num_small = font(31, True)
    f_mono = font(25, True)

    draw.rounded_rectangle([44, 44, 2156, 1276], radius=48, fill="white", outline="#D8D8D8", width=3)
    draw.rectangle([44, 44, 2156, 205], fill=f"#{FOREST}")
    draw.text((92, 82), "R4 Billing Evidence", fill="white", font=f_title)
    draw.text((96, 157), "Glorieta Gardens | Buildings 7 and 8 | Pre, vacancy/rehab, and post-rehab comparison", fill="#D7E2DD", font=f_sub)

    phases = [
        ("pre", "Pre-vacancy baseline", "Before August 2023", "#94A3B8"),
        ("vacancy", "Vacancy and rehab period", "August 2023 through February 2025", f"#{ROSE}"),
        ("post", "Post-rehab comparison", "March 2025 through latest indexed bills", f"#{FOREST}"),
    ]
    focus_accounts = sorted(FOCUS_SUMMARIES, key=lambda account: account.account)
    x0, x1 = 130, 2070
    y = 350
    segment_w = (x1 - x0) / 3
    draw.line([x0, y, x1, y], fill=f"#{FOREST}", width=10)
    for i, (key, label, dates, color) in enumerate(phases):
        sx = int(x0 + i * segment_w + 16)
        ex = int(x0 + (i + 1) * segment_w - 20)
        phase_total = ALL_PHASES[key]
        bracket_y = y - 116
        draw.line([sx + 8, bracket_y, ex - 8, bracket_y], fill=color, width=8)
        draw.line([sx + 8, bracket_y, sx + 8, bracket_y + 44], fill=color, width=8)
        draw.line([ex - 8, bracket_y, ex - 8, bracket_y + 44], fill=color, width=8)
        draw.rounded_rectangle([sx, y - 78, ex, y + 82], radius=30, fill=color)
        draw_wrapped_text(draw, label, (sx + 30, y - 55), f_label, ex - sx - 60, "white", 38, 2)
        draw_wrapped_text(draw, dates, (sx + 30, y + 22), f_small, ex - sx - 60, "white", 30, 2)

        draw.text((sx + 30, y + 124), "BUILDINGS 7 AND 8 TOTAL", fill=f"#{MUTED}", font=font(20, True))
        draw.text((sx + 30, y + 154), money(phase_total.charges), fill=color, font=f_num)
        draw.text((sx + 30, y + 200), f"{gallons(phase_total.gallons)} | {phase_total.bills} bills", fill=f"#{INK}", font=f_mono)

        lane_y = y + 272
        for lane_index, account in enumerate(focus_accounts):
            label, building_phase = phase_line(account, key)
            ly = lane_y + lane_index * 88
            draw.text((sx + 30, ly), f"{label.upper()} METER", fill=f"#{MUTED}", font=font(20, True))
            metric = "No indexed bills" if building_phase.bills == 0 else money(building_phase.charges)
            draw.text((sx + 30, ly + 28), metric, fill=color, font=f_num_small)
            detail = "Data gap in source backup" if building_phase.bills == 0 else f"{gallons(building_phase.gallons)} | {reading_range(building_phase)}"
            draw_wrapped_text(draw, detail, (sx + 30, ly + 66), f_tiny, ex - sx - 60, f"#{INK}", 25, 2)

    card_y = 925
    cards = [
        ("Building 8 rebill cited", money(FACTS["formal_rebill"])),
        ("Building 8 balance cited", money(FACTS["unpaid_balance"])),
        ("Building 8 support", money(FACTS["indexed_dispute_charges"])),
        ("Unit list QA", "B7 63 | B8 58"),
    ]
    card_w = 480
    for i, (label, value) in enumerate(cards):
        cx = 120 + i * (card_w + 28)
        draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + 132], radius=24, fill="#F3F6F4", outline="#DDE5E0", width=2)
        draw.text((cx + 24, card_y + 22), label.upper(), fill=f"#{MUTED}", font=font(20, True))
        draw.text((cx + 24, card_y + 58), value, fill=f"#{FOREST}", font=font(38, True))

    draw_wrapped_text(
        draw,
        f"Unit QA source: uploaded Buildings and Unit list. {FACTS['building_7_unit_note']} {FACTS['building_8_unit_note']} Requested resolution: correct or credit charges not supported by actual consumption, actual meter reads, or a reasonable vacant-building basis.",
        (124, 1102),
        f_small,
        1940,
        f"#{INK}",
        32,
        3,
    )
    img.save(DIAGRAM_OUT, quality=95)


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_border(cell, color: str = "D9D9D9") -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = tc_pr.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            tc_pr.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "6")
        element.set(qn("w:color"), color)


def style_run(run, size: float = 10.5, bold: bool = False, color: str = INK) -> None:
    run.font.name = "Inter"
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def add_doc_paragraph(doc: Document, text: str, style: str | None = None, size: float = 10.5, bold: bool = False) -> None:
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_after = Pt(7)
    p.paragraph_format.line_spacing = 1.08
    for idx, line in enumerate(text.split("\n")):
        if idx:
            p.add_run().add_break()
        run = p.add_run(line)
        style_run(run, size=size, bold=bold)


def add_fact_table(doc: Document, facts: Iterable[Fact]) -> None:
    table = doc.add_table(rows=1, cols=3)
    table.autofit = False
    widths = [Inches(1.8), Inches(1.65), Inches(3.55)]
    headers = ["Evidence item", "Value", "Why it matters"]
    for idx, text in enumerate(headers):
        cell = table.rows[0].cells[idx]
        cell.width = widths[idx]
        set_cell_shading(cell, FOREST)
        set_cell_border(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        style_run(run, size=9, bold=True, color="FFFFFF")
    for fact in facts:
        row = table.add_row()
        values = [fact.label, fact.value, fact.note]
        for idx, text in enumerate(values):
            cell = row.cells[idx]
            cell.width = widths[idx]
            set_cell_border(cell)
            if idx == 1:
                set_cell_shading(cell, "F4F8F6")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            run = p.add_run(text)
            style_run(run, size=9.2, bold=(idx == 1), color=FOREST if idx == 1 else INK)


def set_table_cell_text(cell, text: str, size: float = 8.2, bold: bool = False, color: str = INK, align=None) -> None:
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    if align is not None:
        p.alignment = align
    for idx, line in enumerate(text.split("\n")):
        if idx:
            p.add_run().add_break()
        run = p.add_run(line)
        style_run(run, size=size, bold=bold, color=color)


def add_account_phase_table(doc: Document) -> None:
    table = doc.add_table(rows=1, cols=5)
    table.autofit = False
    widths = [Inches(1.55), Inches(1.25), Inches(1.42), Inches(1.42), Inches(1.42)]
    headers = ["Building and meter", "Unit context", "Pre-vacancy\nbefore Aug 2023", "Vacancy and rehab\nAug 2023-Feb 2025", "Post-rehab\nMar 2025-latest"]
    for idx, header in enumerate(headers):
        cell = table.rows[0].cells[idx]
        cell.width = widths[idx]
        set_cell_shading(cell, FOREST)
        set_cell_border(cell)
        set_table_cell_text(cell, header, size=7.5, bold=True, color="FFFFFF", align=WD_ALIGN_PARAGRAPH.CENTER)

    for account in FOCUS_SUMMARIES:
        row = table.add_row()
        cells = row.cells
        values = [
            f"{account.label}\nAcct {account.account}\nMeter {account.meter or 'not shown'}",
            account.unit_context or account.service_address or "Address not shown",
            phase_cell(account.pre),
            phase_cell(account.vacancy),
            phase_cell(account.post),
        ]
        for idx, text in enumerate(values):
            cell = cells[idx]
            cell.width = widths[idx]
            set_cell_border(cell)
            if account.account == FACTS["account"]:
                set_cell_shading(cell, "FFF4EC" if idx < 2 else "FFF8E8")
            elif account.account == FACTS["building_7_account"]:
                set_cell_shading(cell, "F2F7F4" if idx < 2 else "F7FAF8")
            elif idx in {2, 3, 4}:
                set_cell_shading(cell, "F7FAF8")
            align = WD_ALIGN_PARAGRAPH.CENTER if idx >= 2 else WD_ALIGN_PARAGRAPH.LEFT
            set_table_cell_text(
                cell,
                text,
                size=6.7 if idx >= 2 else 6.5,
                bold=account.is_dispute or idx >= 2,
                color=FOREST if idx >= 2 else INK,
                align=align,
            )


def add_monthly_table(doc: Document) -> None:
    table = doc.add_table(rows=1, cols=4)
    headers = ["Period", "Gallons", "Current charges", "Phase"]
    widths = [Inches(1.4), Inches(1.4), Inches(1.4), Inches(2.9)]
    for idx, header in enumerate(headers):
        cell = table.rows[0].cells[idx]
        cell.width = widths[idx]
        set_cell_shading(cell, FOREST)
        set_cell_border(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(header)
        style_run(run, size=8.8, bold=True, color="FFFFFF")
    for label, gal, charge in MONTHLY:
        row = table.add_row()
        phase = "Vacancy/rehab" if label.endswith("2024") or label in {"Jan 2025", "Feb 2025"} else "Post-rehab"
        values = [label, gallons(gal), money(charge), phase]
        for idx, text in enumerate(values):
            cell = row.cells[idx]
            cell.width = widths[idx]
            set_cell_border(cell)
            if idx == 2:
                set_cell_shading(cell, "F8F3E6")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx < 3 else WD_ALIGN_PARAGRAPH.LEFT
            run = p.add_run(text)
            style_run(run, size=8.3, bold=(idx in {1, 2}), color=FOREST if idx in {1, 2} else INK)


def add_building_monthly_table(doc: Document, rows: list[MonthlyRecord]) -> None:
    table = doc.add_table(rows=1, cols=5)
    headers = ["Service period", "Gallons", "Current charges", "Meter reads", "Phase"]
    widths = [Inches(2.0), Inches(1.15), Inches(1.25), Inches(1.25), Inches(1.25)]
    for idx, header in enumerate(headers):
        cell = table.rows[0].cells[idx]
        cell.width = widths[idx]
        set_cell_shading(cell, FOREST)
        set_cell_border(cell)
        set_table_cell_text(cell, header, size=7.5, bold=True, color="FFFFFF", align=WD_ALIGN_PARAGRAPH.CENTER)
    for record in rows:
        row = table.add_row()
        values = [record.period, gallons(record.gallons), money(record.charges), record.reads, record.phase]
        for idx, text in enumerate(values):
            cell = row.cells[idx]
            cell.width = widths[idx]
            set_cell_border(cell)
            if idx in {1, 2}:
                set_cell_shading(cell, "F8F3E6")
            elif record.phase == "Vacancy/rehab":
                set_cell_shading(cell, "FFF8E8")
            elif record.phase == "Post-rehab":
                set_cell_shading(cell, "F7FAF8")
            align = WD_ALIGN_PARAGRAPH.CENTER if idx != 0 else WD_ALIGN_PARAGRAPH.LEFT
            set_table_cell_text(cell, text, size=6.6, bold=(idx in {1, 2}), color=FOREST if idx in {1, 2} else INK, align=align)


def build_docx() -> None:
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.55)
    section.bottom_margin = Inches(0.55)
    section.left_margin = Inches(0.62)
    section.right_margin = Inches(0.62)

    styles = doc.styles
    styles["Normal"].font.name = "Inter"
    styles["Normal"].font.size = Pt(10.5)
    styles["Title"].font.name = "Inter"
    styles["Title"].font.size = Pt(24)
    styles["Title"].font.bold = True
    styles["Title"].font.color.rgb = RGBColor.from_string("000000")
    styles["Heading 1"].font.name = "Inter"
    styles["Heading 1"].font.size = Pt(16)
    styles["Heading 1"].font.bold = True
    styles["Heading 1"].font.color.rgb = RGBColor.from_string("000000")

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Prepared for R4")
    style_run(run, 9.5, True, GOLD)

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run("Glorieta Gardens Buildings 7 and 8 Water Billing Evidence Packet")

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    style_run(subtitle.add_run("Pre-vacancy, vacancy and rehab, and post-rehab comparison"), 11.5, False, MUTED)

    doc.add_picture(str(DIAGRAM_OUT), width=Inches(7.05))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER

    add_doc_paragraph(
        doc,
        "Purpose: show the billing chronology in order, compare Building 7 and Building 8 before, during, and after the vacancy and rehabilitation period, and isolate the Building 8 billing evidence supporting the correction request.",
        size=10.2,
    )
    add_fact_table(
        doc,
        [
            Fact("Formal rebill cited", money(FACTS["formal_rebill"]), f"Cited in the {FACTS['formal_dispute_date']} dispute package."),
            Fact("Unpaid balance cited", money(FACTS["unpaid_balance"]), "Balance cited for the disputed Building 8 account."),
            Fact("Building 8 dispute support", money(FACTS["indexed_dispute_charges"]), f"Sum of {FACTS['dispute_bills']} Building 8 account-period records in the dispute window."),
            Fact("Building 8 gallons", gallons(FACTS["indexed_gallons"]), "Total Building 8 usage in the dispute support."),
            Fact("Indexed water charges", money(FACTS["indexed_water"]), "Water charge category extracted from available WASD statement backup."),
            Fact("Indexed sewer charges", money(FACTS["indexed_sewer"]), "Sewer charge category extracted from available WASD statement backup."),
        ],
    )

    doc.add_page_break()
    doc.add_heading("Buildings 7 and 8 by phase", level=1)
    add_doc_paragraph(
        doc,
        "The comparison below is limited to Building 7 and Building 8. The absence of pre-vacancy Building 8 bills is shown as a data gap, not filled with an assumed number.",
        size=10.2,
    )
    add_account_phase_table(doc)

    doc.add_page_break()
    doc.add_heading("Building 7 monthly meter chronology", level=1)
    add_doc_paragraph(
        doc,
        f"This table is limited to Account {FACTS['building_7_account']}, Meter {FACTS['building_7_meter']}. It shows the available Building 7 records in chronological order.",
        size=10.2,
    )
    add_building_monthly_table(doc, BUILDING_7_MONTHLY)

    doc.add_page_break()
    doc.add_heading("Building 8 monthly meter chronology", level=1)
    add_doc_paragraph(
        doc,
        "This table is limited to Account 2745714336, Meter 61302354. It shows the indexed monthly support used for the Building 8 dispute amount, in chronological order.",
        size=10.2,
    )
    add_building_monthly_table(doc, BUILDING_8_MONTHLY)

    doc.add_page_break()
    for tag, text in parse_letter():
        if tag == "h2":
            doc.add_heading(text.replace("Draft for review - ", ""), level=1)
        else:
            add_doc_paragraph(doc, text, size=10.5)

    for section in doc.sections:
        footer = section.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        footer_run = footer.add_run("Confidential analysis prepared for R4")
        style_run(footer_run, 8.2, False, MUTED)

    doc.save(DOCX_OUT)


def pdf_styles():
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=28, textColor=colors.HexColor(f"#{FOREST}")),
        "h1": ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=colors.black, spaceAfter=8),
        "body": ParagraphStyle("Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.8, leading=13.2, textColor=colors.HexColor(f"#{INK}")),
        "small": ParagraphStyle("Small", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=colors.HexColor(f"#{MUTED}")),
        "brand": ParagraphStyle("Brand", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.HexColor(f"#{GOLD}"), alignment=1),
    }


def pdf_fact_table(facts: Iterable[Fact]) -> Table:
    data = [["Evidence item", "Value", "Why it matters"]] + [[f.label, f.value, f.note] for f in facts]
    table = Table(data, colWidths=[1.55 * inch, 1.55 * inch, 3.55 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{FOREST}")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEADING", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D9D9D9")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
        ("FONTNAME", (1, 1), (1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 1), (1, -1), colors.HexColor(f"#{FOREST}")),
        ("BACKGROUND", (1, 1), (1, -1), colors.HexColor("#F4F8F6")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def pdf_account_phase_table(styles) -> Table:
    cell_style = ParagraphStyle(
        "Cell",
        parent=styles["small"],
        fontName="Helvetica",
        fontSize=6.7,
        leading=8.3,
        textColor=colors.HexColor(f"#{INK}"),
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor(f"#{FOREST}"),
    )
    header_style = ParagraphStyle(
        "HeaderCell",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=1,
    )
    data = [[
        Paragraph("Account and meter", header_style),
        Paragraph("Address or unit context", header_style),
        Paragraph("Pre-vacancy<br/>before Aug 2023", header_style),
        Paragraph("Vacancy and rehab<br/>Aug 2023-Feb 2025", header_style),
        Paragraph("Post-rehab<br/>Mar 2025-latest", header_style),
    ]]
    for account in FOCUS_SUMMARIES:
        data.append([
            Paragraph(f"<b>{account.label}</b><br/>Acct {account.account}<br/>Meter {account.meter or 'not shown'}", cell_style),
            Paragraph(account.unit_context or account.service_address or "Address not shown", cell_style),
            Paragraph(phase_cell(account.pre).replace("\n", "<br/>"), cell_bold),
            Paragraph(phase_cell(account.vacancy).replace("\n", "<br/>"), cell_bold),
            Paragraph(phase_cell(account.post).replace("\n", "<br/>"), cell_bold),
        ])
    table = Table(data, colWidths=[1.55 * inch, 1.25 * inch, 1.28 * inch, 1.28 * inch, 1.28 * inch], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{FOREST}")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9D9D9")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (2, 1), (-1, -1), "CENTER"),
    ]
    dispute_row = 1
    style.extend([
        ("BACKGROUND", (0, dispute_row), (-1, dispute_row), colors.HexColor("#F2F7F4")),
    ])
    if len(data) > 2:
        style.extend([
            ("BACKGROUND", (0, 2), (1, 2), colors.HexColor("#FFF4EC")),
            ("BACKGROUND", (2, 2), (-1, 2), colors.HexColor("#FFF8E8")),
        ])
    table.setStyle(TableStyle(style))
    return table


def pdf_monthly_table() -> Table:
    data = [["Period", "Gallons", "Current charges", "Phase"]]
    for label, gal, charge in MONTHLY:
        phase = "Vacancy/rehab" if label.endswith("2024") or label in {"Jan 2025", "Feb 2025"} else "Post-rehab"
        data.append([label, gallons(gal), money(charge), phase])
    table = Table(data, colWidths=[1.1 * inch, 1.3 * inch, 1.3 * inch, 2.8 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{FOREST}")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.8),
        ("LEADING", (0, 0), (-1, -1), 9.4),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9D9D9")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 1), (2, -1), "CENTER"),
        ("FONTNAME", (1, 1), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 1), (2, -1), colors.HexColor(f"#{FOREST}")),
        ("BACKGROUND", (2, 1), (2, -1), colors.HexColor("#F8F3E6")),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def pdf_building_monthly_table(rows: list[MonthlyRecord], styles) -> Table:
    cell_style = ParagraphStyle(
        "MonthlyCell",
        parent=styles["small"],
        fontName="Helvetica",
        fontSize=6.8,
        leading=8.2,
        textColor=colors.HexColor(f"#{INK}"),
    )
    header_style = ParagraphStyle(
        "MonthlyHeader",
        parent=cell_style,
        fontName="Helvetica-Bold",
        textColor=colors.white,
        alignment=1,
    )
    data = [[
        Paragraph("Service period", header_style),
        Paragraph("Gallons", header_style),
        Paragraph("Current charges", header_style),
        Paragraph("Meter reads", header_style),
        Paragraph("Phase", header_style),
    ]]
    for record in rows:
        data.append([
            Paragraph(record.period, cell_style),
            Paragraph(gallons(record.gallons), cell_style),
            Paragraph(money(record.charges), cell_style),
            Paragraph(record.reads, cell_style),
            Paragraph(record.phase, cell_style),
        ])
    table = Table(data, colWidths=[1.78 * inch, 1.12 * inch, 1.18 * inch, 1.18 * inch, 1.24 * inch], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(f"#{FOREST}")),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9D9D9")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("FONTNAME", (1, 1), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (1, 1), (2, -1), colors.HexColor(f"#{FOREST}")),
        ("BACKGROUND", (1, 1), (2, -1), colors.HexColor("#F8F3E6")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    table.setStyle(TableStyle(style))
    return table


def build_pdf() -> None:
    styles = pdf_styles()
    doc = SimpleDocTemplate(
        str(PDF_OUT),
        pagesize=letter,
        rightMargin=0.58 * inch,
        leftMargin=0.58 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )
    story = [
        Paragraph("Prepared for R4", styles["brand"]),
        Spacer(1, 8),
        Paragraph("Glorieta Gardens Buildings 7 and 8 Water Billing Evidence Packet", styles["title"]),
        Paragraph("Pre-vacancy, vacancy and rehab, and post-rehab comparison", styles["small"]),
        Spacer(1, 12),
        PdfImage(str(DIAGRAM_OUT), width=7.1 * inch, height=4.26 * inch),
        Spacer(1, 12),
        Paragraph("Purpose: show the billing chronology in order, compare Building 7 and Building 8 before, during, and after the vacancy and rehabilitation period, and isolate the Building 8 billing evidence supporting the correction request.", styles["body"]),
        Spacer(1, 10),
        pdf_fact_table([
            Fact("Formal rebill cited", money(FACTS["formal_rebill"]), f"Cited in the {FACTS['formal_dispute_date']} dispute package."),
            Fact("Unpaid balance cited", money(FACTS["unpaid_balance"]), "Balance cited for the disputed Building 8 account."),
            Fact("Building 8 dispute support", money(FACTS["indexed_dispute_charges"]), f"Sum of {FACTS['dispute_bills']} Building 8 account-period records in the dispute window."),
            Fact("Building 8 gallons", gallons(FACTS["indexed_gallons"]), "Total Building 8 usage in the dispute support."),
            Fact("Indexed water charges", money(FACTS["indexed_water"]), "Water charge category extracted from available WASD statement backup."),
            Fact("Indexed sewer charges", money(FACTS["indexed_sewer"]), "Sewer charge category extracted from available WASD statement backup."),
        ]),
        PageBreak(),
        Paragraph("Buildings 7 and 8 by phase", styles["h1"]),
        Paragraph("The comparison below is limited to Building 7 and Building 8. The absence of pre-vacancy Building 8 bills is shown as a data gap, not filled with an assumed number.", styles["body"]),
        Spacer(1, 8),
        pdf_account_phase_table(styles),
        PageBreak(),
        Paragraph("Building 7 monthly meter chronology", styles["h1"]),
        Paragraph(f"This table is limited to Account {FACTS['building_7_account']}, Meter {FACTS['building_7_meter']}. It shows the available Building 7 records in chronological order.", styles["body"]),
        Spacer(1, 8),
        pdf_building_monthly_table(BUILDING_7_MONTHLY, styles),
        PageBreak(),
        Paragraph("Building 8 monthly meter chronology", styles["h1"]),
        Paragraph("This table is limited to Account 2745714336, Meter 61302354. It shows the indexed monthly support used for the Building 8 dispute amount, in chronological order.", styles["body"]),
        Spacer(1, 8),
        pdf_building_monthly_table(BUILDING_8_MONTHLY, styles),
        PageBreak(),
    ]
    for tag, text in parse_letter():
        story.append(Paragraph(text.replace("\n", "<br/>"), styles["h1" if tag == "h2" else "body"]))
        story.append(Spacer(1, 5 if tag == "p" else 8))

    def footer(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor(f"#{MUTED}"))
        canvas.drawCentredString(4.25 * inch, 0.32 * inch, "Confidential analysis prepared for R4")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def main() -> None:
    draw_timeline()
    build_docx()
    build_pdf()
    print(DOCX_OUT)
    print(PDF_OUT)
    print(DIAGRAM_OUT)


if __name__ == "__main__":
    main()
