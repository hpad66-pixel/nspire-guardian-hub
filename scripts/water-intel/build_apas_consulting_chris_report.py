from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

from build_glorieta_dispute_deliverables import (
    ALL_PHASES,
    BUILDING_7_MONTHLY,
    BUILDING_8_MONTHLY,
    FACTS,
    FOCUS_SUMMARIES,
    gallons,
    money,
)


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "deliverables" / "r4-glorieta"
OUT.mkdir(parents=True, exist_ok=True)

DOCX_OUT = OUT / "apas-consulting-letter-report-to-chris-sullivan-glorieta-gardens.docx"

GREEN = "082B23"
GOLD = "DFBD67"
PALE = "F4FAF6"
PALE_GOLD = "FBF5E6"
INK = "173A32"
MUTED = "60746C"
LIGHT_BORDER = "D9D9D9"


def safe_text(text: str) -> str:
    return text.replace("—", " ").replace("–", " ").replace("-", " ")


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_border(cell, color: str = LIGHT_BORDER) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = tc_pr.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            tc_pr.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "6")
        element.set(qn("w:color"), color)


def set_cell_padding(cell, value: int = 120) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.find(qn("w:tcMar"))
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for edge in ("top", "left", "bottom", "right"):
        node = tc_mar.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = tr_pr.find(qn("w:tblHeader"))
    if tbl_header is None:
        tbl_header = OxmlElement("w:tblHeader")
        tr_pr.append(tbl_header)
    tbl_header.set(qn("w:val"), "true")


def keep_row_together(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = tr_pr.find(qn("w:cantSplit"))
    if cant_split is None:
        cant_split = OxmlElement("w:cantSplit")
        tr_pr.append(cant_split)


def remove_paragraph_border(paragraph) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = p_pr.find(qn("w:pBdr"))
    if p_bdr is not None:
        p_pr.remove(p_bdr)


def remove_style_border(style) -> None:
    p_pr = style._element.find(qn("w:pPr"))
    if p_pr is None:
        return
    p_bdr = p_pr.find(qn("w:pBdr"))
    if p_bdr is not None:
        p_pr.remove(p_bdr)


def style_run(run, size: float = 10.8, bold: bool = False, color: str = INK) -> None:
    run.font.name = "Georgia"
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)


def para(doc: Document, text: str = "", size: float = 10.8, bold: bool = False, color: str = INK, style: str | None = None):
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_after = Pt(7)
    p.paragraph_format.line_spacing = 1.12
    run = p.add_run(safe_text(text))
    style_run(run, size=size, bold=bold, color=color)
    return p


def heading(doc: Document, text: str, level: int = 1):
    p = doc.add_heading("", level=level)
    p.paragraph_format.space_before = Pt(9 if level == 1 else 5)
    p.paragraph_format.space_after = Pt(5)
    run = p.add_run(safe_text(text))
    style_run(run, size=15.5 if level == 1 else 12.5, bold=True, color="000000")
    return p


def bullet(doc: Document, text: str) -> None:
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.08
    run = p.add_run(safe_text(text))
    style_run(run, size=10.5)


def header(doc: Document) -> None:
    section = doc.sections[0]
    section.header_distance = Inches(0.25)
    hdr = section.header
    table = hdr.add_table(rows=1, cols=2, width=Inches(7.1))
    table.autofit = False
    table.columns[0].width = Inches(3.2)
    table.columns[1].width = Inches(3.9)
    left, right = table.rows[0].cells
    for cell in (left, right):
        set_cell_border(cell, "FFFFFF")
        set_cell_padding(cell, 20)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p = left.paragraphs[0]
    run = p.add_run("APAS CONSULTING")
    style_run(run, size=15, bold=True, color=GREEN)
    p2 = left.add_paragraph()
    run = p2.add_run("Professional services letter report")
    style_run(run, size=8.7, bold=False, color=MUTED)
    p3 = right.paragraphs[0]
    p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p3.add_run("3256 NW 83 Way\nPembroke Pines Florida 33024\nhardeep@apas.ai")
    style_run(run, size=8.5, bold=False, color=MUTED)


def footer(doc: Document) -> None:
    for section in doc.sections:
        p = section.footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run("APAS Consulting LLC confidential client work product")
        style_run(run, size=8, color=MUTED)


def make_table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[float], compact: bool = False) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.autofit = False
    repeat_table_header(table.rows[0])
    keep_row_together(table.rows[0])
    for idx, header_text in enumerate(headers):
        cell = table.rows[0].cells[idx]
        cell.width = Inches(widths[idx])
        set_cell_shading(cell, GREEN)
        set_cell_border(cell)
        set_cell_padding(cell, 80 if compact else 140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(safe_text(header_text))
        style_run(run, size=8.2 if compact else 9.2, bold=True, color="FFFFFF")
    for row_index, values in enumerate(rows):
        row = table.add_row()
        keep_row_together(row)
        for idx, value in enumerate(values):
            cell = row.cells[idx]
            cell.width = Inches(widths[idx])
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_border(cell)
            set_cell_padding(cell, 70 if compact else 130)
            if idx == 1:
                set_cell_shading(cell, PALE_GOLD)
            elif row_index % 2:
                set_cell_shading(cell, "FAFCFB")
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx in {1, 2, 3} else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(safe_text(value))
            style_run(run, size=7.65 if compact else 9.0, bold=idx == 1, color=GREEN if idx == 1 else INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(1 if compact else 3)


def phase_cell(phase) -> str:
    if phase.bills == 0:
        return "No indexed bills"
    return f"{money(phase.charges)}\n{gallons(phase.gallons)}\n{phase.bills} bills"


def add_phase_table(doc: Document) -> None:
    rows = []
    for item in FOCUS_SUMMARIES:
        rows.append(
            [
                f"{item.label}\nAccount {item.account}\nMeter {item.meter or 'not shown'}",
                phase_cell(item.pre),
                phase_cell(item.vacancy),
                phase_cell(item.post),
                item.unit_context or item.service_address or "Address not shown",
            ]
        )
    make_table(
        doc,
        ["Building", "Before vacancy", "Vacancy and rehab", "Current operations", "Unit context"],
        rows,
        [1.55, 1.25, 1.35, 1.35, 1.6],
        compact=True,
    )


def add_monthly_summary(doc: Document, title: str, rows) -> None:
    heading(doc, title, level=2)
    table_rows = []
    for row in rows:
        table_rows.append([row.period, gallons(row.gallons), money(row.charges), row.reads, row.phase])
    make_table(
        doc,
        ["Service period", "Gallons", "Charges", "Reads", "Phase"],
        table_rows,
        [1.75, 1.05, 1.05, 1.2, 1.4],
        compact=True,
    )


def build() -> None:
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.78)
    section.bottom_margin = Inches(0.62)
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)
    header(doc)
    footer(doc)

    styles = doc.styles
    styles["Normal"].font.name = "Georgia"
    styles["Normal"].font.size = Pt(10.8)
    styles["Title"].font.name = "Georgia"
    styles["Title"].font.size = Pt(21)
    styles["Title"].font.bold = True
    styles["Title"].font.color.rgb = RGBColor.from_string("000000")
    remove_style_border(styles["Title"])

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(4)
    title.add_run("Glorieta Gardens Water Billing Review Letter Report")
    remove_paragraph_border(title)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(14)
    run = subtitle.add_run("Prepared for Chris Sullivan")
    style_run(run, size=11.2, color=MUTED)

    para(doc, "September 18 2026", size=10.2)
    para(doc, "Chris Sullivan\nR4 Capital\n780 Third Avenue\nNew York New York 11017", size=10.2)
    para(doc, "Re Glorieta Gardens water billing review for Buildings 7 and 8", size=10.6, bold=True)
    para(doc, "Dear Chris,", size=10.8)

    para(
        doc,
        "APAS Consulting completed a focused review of the Glorieta Gardens water billing materials that were provided for the recent billing dispute. The work covered the available water and sewer billing evidence, the supporting bill records, the account and meter information, the building level comparison, and the operating periods that matter for management review. The work gave special attention to Building 8 because that is the account tied to the formal rebill and unpaid balance. Building 7 was reviewed as a comparison building within the same property.",
    )
    para(
        doc,
        "The main result is straightforward. The formal record cites a retroactive rebill of "
        f"{money(FACTS['formal_rebill'])} and an unpaid Building 8 balance of {money(FACTS['unpaid_balance'])}. "
        f"The indexed billing support for Building 8 shows {money(FACTS['indexed_dispute_charges'])} in charges and "
        f"{gallons(FACTS['indexed_gallons'])} across {FACTS['dispute_bills']} account period records during the dispute support window. "
        "That amount is the practical center of the billing issue because it is in the same order of magnitude as the account balance being disputed.",
    )

    heading(doc, "Executive summary")
    para(
        doc,
        "We built a clean evidence set from the water billing files, converted the bill details into a structured record, separated the records by account and meter, and compared the relevant periods in plain English. The result is a repeatable review system. It can support the current billing dispute, refresh the dashboard when new invoices arrive, and show how water and sewer costs are moving against operations.",
    )
    para(
        doc,
        "For Building 8, the most important point is that the available records support a dispute narrative around charges that were billed during a period connected to vacancy, rehabilitation, and reoccupation questions. The analysis does not ask the City or the water agency to accept a guessed number. It shows the record, the charges, the gallons, the meter account, and the period.",
    )
    para(
        doc,
        "For Building 7, the records provide a useful comparison point because Building 7 has indexed activity across all three periods. Building 8 has no indexed before vacancy bills in the current evidence archive, so the report shows that as a source gap instead of filling the gap with an assumption.",
    )
    para(
        doc,
        "The review produced three practical outputs. First, it produced a normalized billing record with account, meter, service period, gallons, charges, and phase. Second, it produced a management view comparing Building 7 and Building 8 across the before vacancy, vacancy and rehabilitation, and current operating periods. Third, it produced a monthly continuation path so the same dashboard can stay current as invoices come in.",
    )

    doc.add_page_break()
    heading(doc, "Core numbers")

    make_table(
        doc,
        ["Item", "Number", "What it means"],
        [
            ["Formal retroactive rebill cited", money(FACTS["formal_rebill"]), "The rebill number cited in the dispute record"],
            ["Formal unpaid balance cited", money(FACTS["unpaid_balance"]), "The balance connected to the disputed Building 8 account"],
            ["Building 8 indexed dispute support", money(FACTS["indexed_dispute_charges"]), f"The sum of {FACTS['dispute_bills']} Building 8 account period records in the support window"],
            ["Building 8 indexed gallons", gallons(FACTS["indexed_gallons"]), "The total gallons tied to the indexed Building 8 support"],
            ["Indexed water charges", money(FACTS["indexed_water"]), "The water portion visible in the available statement backup"],
            ["Indexed sewer charges", money(FACTS["indexed_sewer"]), "The sewer portion visible in the available statement backup"],
            ["Evidence archive reviewed", f"{FACTS['source_files']} source files", "The broader billing file collection available for the review"],
            ["Canonical billing records", f"{FACTS['canonical_records']} records", "The normalized bill records used for dashboard and report analysis"],
        ],
        [2.0, 1.45, 3.45],
    )

    heading(doc, "What we did")
    bullet(doc, "Organized the water meter billing files into a reviewable evidence set.")
    bullet(doc, "Extracted bill level data into a structured billing record so the numbers can be checked and reused.")
    bullet(doc, "Separated Building 7 and Building 8 because those are the buildings connected to the vacancy and dispute discussion.")
    bullet(doc, "Compared each building across the before vacancy period, the vacancy and rehabilitation period, and the current operating period.")
    bullet(doc, "Prepared a clean evidence packet, a Word version, a PDF version, and a dashboard view that can be used for discussion and follow through.")
    bullet(doc, "Drafted the city facing correction request language so the billing issue can be presented with facts, dates, account numbers, meter numbers, charges, and gallons.")
    bullet(doc, "Set up a repeatable monthly structure so future invoices can be added to the same record instead of starting the analysis over each time.")

    heading(doc, "Period comparison")
    para(
        doc,
        "The table below is the core operating view. It keeps the comparison simple. Building 7 has records in all three periods. Building 8 has no indexed before vacancy bills in the current archive, which is why the Building 8 before vacancy cell is shown as no indexed bills.",
    )
    add_phase_table(doc)

    heading(doc, "Combined period totals")
    make_table(
        doc,
        ["Period", "Charges", "Gallons", "Bill records"],
        [
            ["Before vacancy", money(ALL_PHASES["pre"].charges), gallons(ALL_PHASES["pre"].gallons), f"{ALL_PHASES['pre'].bills} bills"],
            ["Vacancy and rehab", money(ALL_PHASES["vacancy"].charges), gallons(ALL_PHASES["vacancy"].gallons), f"{ALL_PHASES['vacancy'].bills} bills"],
            ["Current operations", money(ALL_PHASES["post"].charges), gallons(ALL_PHASES["post"].gallons), f"{ALL_PHASES['post'].bills} bills"],
        ],
        [2.0, 1.45, 1.6, 1.5],
    )

    heading(doc, "Takeaways")
    bullet(doc, f"The Building 8 dispute is best explained around the documented {money(FACTS['formal_rebill'])} rebill, the {money(FACTS['unpaid_balance'])} balance, and the {money(FACTS['indexed_dispute_charges'])} of indexed support.")
    bullet(doc, "The strongest presentation is factual. It should show the account, meter, time period, gallons, charges, and why the building status matters.")
    bullet(doc, "The review should avoid overstated claims. Where the archive has a gap, the report should call it a gap rather than replace it with a guessed number.")
    bullet(doc, "The City or water agency should be asked to explain the estimate basis, the meter history, any meter change work order, and the adjustment worksheet behind the rebill.")
    bullet(doc, "The recurring value is operational. Once this structure is in place, monthly invoices can update the same dashboard and show whether usage, cost, and dispute exposure are improving or getting worse.")
    bullet(doc, "The bottom line benefit is early visibility. A monthly review can show rising costs, unusual usage, billing changes, and possible operating issues before they become a large unresolved balance.")

    doc.add_page_break()
    heading(doc, "Action items")
    bullet(doc, "Use the letter and evidence packet to support a corrected billing review and credit request for Building 8.")
    bullet(doc, "Ask for the account ledger, meter history, meter change documentation, estimate basis, adjustment worksheet, and investigation notes.")
    bullet(doc, "Ask the property management team to send the monthly water and sewer invoices as soon as they are received.")
    bullet(doc, "Continue the same analysis every month so R4 can track trends, compare usage by building, and see operating impact on the bottom line.")
    bullet(doc, "Review the dashboard each month for unusual movement in gallons, charges, balances, and account status.")
    bullet(doc, "Use the monthly dashboard to connect billing movement to operations decisions, repair priorities, vacancy recovery, and cash flow planning.")

    heading(doc, "Monthly continuation program")
    para(
        doc,
        "Now that the system is set up, the simplest way to keep the work valuable is for the Glorieta Gardens property management team to send the monthly invoices to APAS Consulting as soon as they arrive. APAS can then update the billing record, refresh the dashboard, and summarize the movement in usage, charges, balance exposure, and potential revenue impact.",
    )
    para(
        doc,
        "This creates a recurring operating control. Instead of reviewing a large billing issue after the fact, R4 can see the trend month by month, identify unusual water or sewer charges early, and connect billing movement to property operations. That helps protect cash flow, supports budget decisions, and gives management a clearer view of whether corrective actions are improving the property economics.",
    )

    heading(doc, "Detailed monthly record")
    para(doc, "The monthly records below are included so Chris and the property team can see exactly where the figures came from.")
    add_monthly_summary(doc, "Building 7 monthly record", BUILDING_7_MONTHLY)
    add_monthly_summary(doc, "Building 8 monthly record", BUILDING_8_MONTHLY)

    heading(doc, "Closing")
    para(
        doc,
        "The immediate goal is to support the current billing dispute with a clear factual record. The longer term goal is to turn monthly utility bills into a repeatable operating control for Glorieta Gardens. APAS Consulting can continue maintaining this view as invoices come in and can provide a short monthly update showing trends, exceptions, and bottom line impact.",
    )
    para(doc, "Respectfully,", size=10.8)
    para(doc, "APAS Consulting LLC", size=10.8, bold=True)

    doc.save(DOCX_OUT)
    print(DOCX_OUT)


if __name__ == "__main__":
    build()
