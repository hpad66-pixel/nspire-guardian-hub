from __future__ import annotations

import os
import subprocess
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SOURCE_INVOICE = Path("/Users/apas/Downloads/invoice_3140.pdf")
OUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs" / "dshin-invoice-3140"

DISCREPANCY_PDF = OUT_DIR / "dshin-invoice-3140-discrepancy-line-by-line.pdf"
REDLINE_PDF = OUT_DIR / "dshin-invoice-3140-redlined-correction.pdf"
CORRECTED_INVOICE_PDF = OUT_DIR / "dshin-invoice-3140-corrected-invoice.pdf"

CORRECTED_TOTAL = Decimal("616650.69")
PAID_TO_DATE = Decimal("565479.39")
GROSS_REMAINING = Decimal("51171.30")
GROSS_RETAINAGE_5 = Decimal("30832.53")
RETAINAGE_RELEASE_NOW = Decimal("15416.27")
RETAINAGE_HELD = Decimal("15416.27")
PAYABLE_NOW = Decimal("35755.03")

FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
FONT = "Helvetica"
if FONT_PATH.exists():
    pdfmetrics.registerFont(TTFont("ArialUnicode", str(FONT_PATH)))
    FONT = "ArialUnicode"


@dataclass(frozen=True)
class InvoiceLine:
    no: str
    description: str
    asked: Decimal
    corrected: Decimal
    status: str
    note: str

    @property
    def variance(self) -> Decimal:
        return self.corrected - self.asked


def money(value: Decimal | int | float) -> str:
    value = Decimal(str(value))
    sign = "-" if value < 0 else ""
    value = abs(value)
    return f"{sign}${value:,.2f}"


def build_lines() -> list[InvoiceLine]:
    return [
        InvoiceLine("1", "Furnish 2 additional manholes / 8 manholes onsite", Decimal("5000.00"), Decimal("5000.00"), "✓ OK", "Accepted as part of the $429,000 original D'SHIN base."),
        InvoiceLine("2", 'Furnish and install 1,000 LF of 8" SDR-26', Decimal("120000.00"), Decimal("120000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("3", 'Furnish and install 650 LF of 6" SDR-26 with cleanouts', Decimal("74100.00"), Decimal("74100.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("4", "Density tests", Decimal("9561.00"), Decimal("9561.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("5", "MOT with flagmen / barricades rental", Decimal("24000.00"), Decimal("24000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("6", "Haul out excess fill up to 30 loads", Decimal("15000.00"), Decimal("15000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("7", "12-inch limerock and asphalt restoration", Decimal("30000.00"), Decimal("30000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("8", "Surveyor - topo, layout, and as-builts", Decimal("8500.00"), Decimal("8500.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("9", "Dewatering and shoring", Decimal("26400.00"), Decimal("26400.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("10", "Install sewer manhole", Decimal("60000.00"), Decimal("60000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("11", "Customer notes / exclusions", Decimal("0.00"), Decimal("0.00"), "✓ OK", "No dollar impact."),
        InvoiceLine("12", "Sawcut asphalt and hazardous material disposal", Decimal("4439.00"), Decimal("4439.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("13", "Safety officer", Decimal("24000.00"), Decimal("24000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("14", "10% commencement charge", Decimal("0.00"), Decimal("0.00"), "✓ OK", "No dollar impact."),
        InvoiceLine("15", "Temporary fences", Decimal("18000.00"), Decimal("18000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("16", "Sod replacement and sidewalk restoration allowance", Decimal("10000.00"), Decimal("10000.00"), "✓ OK", "Accepted in original base scope."),
        InvoiceLine("17", 'Deduction of 8" pipe', Decimal("-12000.00"), Decimal("-12126.00"), "CORRECT", "Use 101.05 LF x $120.00, not 100 LF."),
        InvoiceLine("18", 'Deduction of 6" pipe', Decimal("-34884.00"), Decimal("-34941.00"), "CORRECT", "Use 306.50 LF x $114.00, not 306 LF."),
        InvoiceLine("19", 'Additional 8" pipe or larger', Decimal("8400.00"), Decimal("0.00"), "REMOVE", "Not part of the approved D'SHIN final reconciliation as a separate line."),
        InvoiceLine("20", 'Additional 4" pipe', Decimal("18040.00"), Decimal("18040.00"), "✓ APPROVED", "Approved change-order work; keep as one separate line item and do not duplicate it inside the bundled change-order row."),
        InvoiceLine("21", "Change orders", Decimal("213117.00"), Decimal("216677.69"), "CORRECT", "Use accepted CCO set totaling $216,677.69, excluding the separately listed approved 4-inch pipe line."),
    ]


def build_discrepancy_pdf() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Small", parent=styles["Normal"], fontName=FONT, fontSize=8, leading=10))
    styles.add(ParagraphStyle(name="Cell", parent=styles["Normal"], fontName=FONT, fontSize=7.2, leading=8.5))
    styles.add(ParagraphStyle(name="CellBold", parent=styles["Normal"], fontName=FONT, fontSize=7.2, leading=8.5))
    styles.add(ParagraphStyle(name="TitleCenter", parent=styles["Title"], alignment=TA_CENTER, fontName=FONT, fontSize=17, leading=20))
    styles.add(ParagraphStyle(name="Note", parent=styles["Normal"], fontName=FONT, fontSize=9, leading=11, textColor=colors.HexColor("#3a3328")))

    doc = SimpleDocTemplate(
        str(DISCREPANCY_PDF),
        pagesize=landscape(letter),
        rightMargin=0.35 * inch,
        leftMargin=0.35 * inch,
        topMargin=0.35 * inch,
        bottomMargin=0.35 * inch,
    )

    story = [
        Paragraph("D'SHIN Plumbing Invoice #3140 - Line-by-Line Discrepancy Review", styles["TitleCenter"]),
        Spacer(1, 0.08 * inch),
        Paragraph(
            "Purpose: mark each invoice row against the finalized D'SHIN reconciliation and show the corrected invoice math.",
            styles["Note"],
        ),
        Spacer(1, 0.12 * inch),
    ]

    summary = [
        ["Measure", "D'SHIN Invoice #3140", "Corrected / Finalized Position", "Difference"],
        ["Invoice total", "$621,673.00", "$616,650.69", "-$5,022.31"],
        ["Paid to date", "$565,479.30", "$565,479.39", "+$0.09 credit to paid ledger"],
        ["Gross remaining earned value", "$56,193.70", "$51,171.30", "-$5,022.40"],
        ["5% retainage on corrected total", "$0.00 shown", "$30,832.53", "2.5% release now = $15,416.27"],
        ["Retainage still held", "$0.00 shown", "$15,416.27", "-$15,416.27 payable now"],
        ["Payable now", "$56,193.70", "$35,755.03", "-$20,438.67"],
    ]
    summary_table = Table(summary, colWidths=[2.1 * inch, 1.55 * inch, 2.05 * inch, 2.05 * inch])
    summary_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2f4f4f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#b8b2a7")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fbfaf7")),
                ("BACKGROUND", (0, 6), (-1, 6), colors.HexColor("#fff1f1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story += [summary_table, Spacer(1, 0.15 * inch)]

    rows = [["#", "Invoice line", "D'SHIN asks", "Status", "Should be", "Delta", "Correction / basis"]]
    for line in build_lines():
        rows.append(
            [
                line.no,
                Paragraph(line.description, styles["Cell"]),
                money(line.asked),
                line.status,
                money(line.corrected),
                money(line.variance),
                Paragraph(line.note, styles["Cell"]),
            ]
        )

    table = Table(rows, colWidths=[0.32 * inch, 2.55 * inch, 0.9 * inch, 0.78 * inch, 0.9 * inch, 0.9 * inch, 2.25 * inch], repeatRows=1)
    style_cmds = [
        ("FONTNAME", (0, 0), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 7.1),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2933")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c7c0b8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (2, 1), (5, -1), "RIGHT"),
        ("ALIGN", (3, 1), (3, -1), "CENTER"),
    ]
    for row_idx, line in enumerate(build_lines(), start=1):
        if line.status.startswith("✓"):
            style_cmds.append(("BACKGROUND", (0, row_idx), (-1, row_idx), colors.HexColor("#f4fbf5")))
            style_cmds.append(("TEXTCOLOR", (3, row_idx), (3, row_idx), colors.HexColor("#0b6b43")))
        elif line.status == "REMOVE":
            style_cmds.append(("BACKGROUND", (0, row_idx), (-1, row_idx), colors.HexColor("#fff0f0")))
            style_cmds.append(("TEXTCOLOR", (3, row_idx), (3, row_idx), colors.HexColor("#a61b1b")))
        else:
            style_cmds.append(("BACKGROUND", (0, row_idx), (-1, row_idx), colors.HexColor("#fff8e6")))
            style_cmds.append(("TEXTCOLOR", (3, row_idx), (3, row_idx), colors.HexColor("#8a4b00")))
    table.setStyle(TableStyle(style_cmds))
    story += [table, Spacer(1, 0.1 * inch)]
    story.append(
        Paragraph(
            "Correction required: D'SHIN should reissue the invoice at $616,650.69 total, show paid to date as $565,479.39, show 5% retainage of $30,832.53, release 2.5% now ($15,416.27), retain $15,416.27, and request $35,755.03 payable now.",
            styles["Note"],
        )
    )
    doc.build(story)


def render_invoice_pages() -> list[Path]:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    prefix = TMP_DIR / "invoice-3140-page"
    subprocess.run(
        [
            "/Users/apas/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/pdftoppm",
            "-png",
            "-r",
            "160",
            str(SOURCE_INVOICE),
            str(prefix),
        ],
        check=True,
    )
    return [TMP_DIR / f"invoice-3140-page-{i}.png" for i in range(1, 4)]


def draw_stamp(c: canvas.Canvas, text: str) -> None:
    c.saveState()
    c.setFillColor(colors.HexColor("#9f1d1d"))
    c.setStrokeColor(colors.HexColor("#9f1d1d"))
    c.setLineWidth(1.2)
    c.roundRect(28, 748, 556, 24, 4, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(306, 755, text)
    c.restoreState()


def check(c: canvas.Canvas, x: float, y: float, label: str = "OK") -> None:
    c.saveState()
    c.setFont(FONT, 9)
    c.setFillColor(colors.HexColor("#0b6b43"))
    c.drawString(x, y, f"✓ {label}")
    c.restoreState()


def red_note(c: canvas.Canvas, x: float, y: float, text: str, width: float = 190) -> None:
    c.saveState()
    c.setFillColor(colors.HexColor("#fff1f1"))
    c.setStrokeColor(colors.HexColor("#b42318"))
    c.roundRect(x - 4, y - 4, width, 28, 4, stroke=1, fill=1)
    c.setFillColor(colors.HexColor("#861b1b"))
    c.setFont("Helvetica-Bold", 7.6)
    for i, part in enumerate(text.split("\n")):
        c.drawString(x, y + 14 - i * 10, part)
    c.restoreState()


def strike(c: canvas.Canvas, x0: float, y: float, x1: float) -> None:
    c.saveState()
    c.setStrokeColor(colors.HexColor("#b42318"))
    c.setLineWidth(1.4)
    c.line(x0, y, x1, y)
    c.restoreState()


def draw_page_image(c: canvas.Canvas, image_path: Path) -> None:
    reader = ImageReader(str(image_path))
    c.drawImage(reader, 0, 0, width=612, height=792, preserveAspectRatio=False, mask="auto")


def build_redline_pdf() -> None:
    pages = render_invoice_pages()
    page_w, page_h = landscape(letter)
    img_scale = 0.72
    img_x = 24
    img_y = 20
    img_w = 612 * img_scale
    img_h = 792 * img_scale

    def sx(x: float) -> float:
        return img_x + x * img_scale

    def sy(y: float) -> float:
        return img_y + y * img_scale

    def draw_landscape_page(image_path: Path, stamp: str) -> None:
        reader = ImageReader(str(image_path))
        c.drawImage(reader, img_x, img_y, width=img_w, height=img_h, preserveAspectRatio=False, mask="auto")
        c.saveState()
        c.setFillColor(colors.HexColor("#9f1d1d"))
        c.setStrokeColor(colors.HexColor("#9f1d1d"))
        c.setLineWidth(1.2)
        c.roundRect(24, page_h - 42, page_w - 48, 25, 4, stroke=1, fill=0)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(page_w / 2, page_h - 34, stamp)
        c.restoreState()

    def side_note(y: float, title: str, body: str, color: str = "#861b1b") -> None:
        x = 492
        width = 270
        height = 48
        c.saveState()
        c.setFillColor(colors.HexColor("#fff7f7") if color == "#861b1b" else colors.HexColor("#f4fbf5"))
        c.setStrokeColor(colors.HexColor("#b42318") if color == "#861b1b" else colors.HexColor("#0b6b43"))
        c.roundRect(x, y, width, height, 5, stroke=1, fill=1)
        c.setFillColor(colors.HexColor(color))
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x + 8, y + height - 15, title)
        c.setFont("Helvetica", 8)
        for i, part in enumerate(body.split("\n")):
            c.drawString(x + 8, y + height - 28 - i * 10, part)
        c.restoreState()

    def leader(x0: float, y0: float, x1: float, y1: float) -> None:
        c.saveState()
        c.setStrokeColor(colors.HexColor("#b42318"))
        c.setLineWidth(0.8)
        c.line(sx(x0), sy(y0), x1, y1)
        c.restoreState()

    c = canvas.Canvas(str(REDLINE_PDF), pagesize=landscape(letter))

    # Page 1: original base rows are accepted.
    draw_landscape_page(pages[0], "REDLINE REVIEW - BASE CONTRACT ROWS CHECKED")
    side_note(500, "Page 1 checked", "Base-scope rows reconcile to the\n$429,000 original D'SHIN base.", "#0b6b43")
    for y in [519, 486, 444, 390, 348, 303, 261, 207, 162]:
        check(c, sx(14), sy(y - 5), "")
    c.showPage()

    # Page 2: show accepted base rows and redline rows needing correction.
    draw_landscape_page(pages[1], "REDLINE REVIEW - CORRECT THESE LINE ITEMS")
    for y in [672, 630, 552, 510, 477, 447, 393]:
        check(c, sx(14), sy(y - 5), "")

    # 8-inch deduction.
    strike(c, sx(452), sy(348), sx(527))
    side_note(500, 'Correct 8" deduction', "101.05 LF x $120.00 = -$12,126.00")
    leader(527, 348, 492, 524)

    # 6-inch deduction.
    strike(c, sx(452), sy(318), sx(527))
    side_note(438, 'Correct 6" deduction', "306.50 LF x $114.00 = -$34,941.00")
    leader(527, 318, 492, 462)

    # Unsupported additional pipe charges.
    strike(c, sx(454), sy(285), sx(526))
    side_note(376, 'Remove separate 8" charge', "Not in approved final reconciliation.\nCorrected value = $0.00")
    leader(526, 285, 492, 400)
    c.saveState()
    c.setStrokeColor(colors.HexColor("#0b6b43"))
    c.setLineWidth(1.1)
    c.roundRect(sx(70), sy(245), 370, 30, 4, stroke=1, fill=0)
    c.restoreState()
    side_note(314, 'Keep approved 4" pipe line', "Approved change order as one separate line.\nDo not duplicate it in bundled CCO.", "#0b6b43")
    leader(526, 252, 492, 338)

    # Change orders correction.
    strike(c, sx(442), sy(222), sx(527))
    side_note(252, "Correct approved CCO total", "$216,677.69 accepted CCO set.\nExcludes separate approved 4-inch pipe.")
    leader(527, 222, 492, 276)
    c.showPage()

    # Page 3: totals.
    draw_landscape_page(pages[2], "REDLINE REVIEW - CORRECTED FINAL BALANCE")
    strike(c, sx(414), sy(693), sx(520))
    side_note(500, "Correct invoice total", "$616,650.69")
    leader(520, 693, 492, 524)
    strike(c, sx(414), sy(672), sx(520))
    side_note(438, "Correct paid ledger", "$565,479.39")
    leader(520, 672, 492, 462)
    strike(c, sx(414), sy(651), sx(520))
    side_note(376, "Correct gross remaining", "$51,171.30")
    leader(520, 651, 492, 400)
    side_note(314, "Retainage release / hold", "5% = $30,832.53; release 2.5% now.\nRemaining held = $15,416.27")
    side_note(252, "Correct payable now", "$35,755.03")
    c.setFillColor(colors.HexColor("#861b1b"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(492, 226, "Invoice balance must not be paid as submitted.")
    c.drawString(492, 214, "Reissue with retained balance separated.")
    c.showPage()
    c.save()


def build_corrected_invoice_pdf() -> None:
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleCenter2", parent=styles["Title"], alignment=TA_CENTER, fontName=FONT, fontSize=17, leading=20))
    styles.add(ParagraphStyle(name="InvoiceCell", parent=styles["Normal"], fontName=FONT, fontSize=8, leading=9.5))
    styles.add(ParagraphStyle(name="InvoiceNote", parent=styles["Normal"], fontName=FONT, fontSize=9, leading=11, textColor=colors.HexColor("#3a3328")))

    doc = SimpleDocTemplate(
        str(CORRECTED_INVOICE_PDF),
        pagesize=letter,
        rightMargin=0.45 * inch,
        leftMargin=0.45 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.4 * inch,
    )

    story = [
        Paragraph("D'SHIN Plumbing Invoice #3140 - Corrected Invoice Math", styles["TitleCenter2"]),
        Spacer(1, 0.08 * inch),
        Paragraph("Corrected for approved 4-inch pipe as a separate line item, corrected deductions, accepted change-order total, and 50% retainage release.", styles["InvoiceNote"]),
        Spacer(1, 0.12 * inch),
    ]

    rows = [["#", "Description", "Qty", "Unit price", "Corrected total"]]
    clean_rows = [
        ("1", "Furnish 2 additional manholes / 8 manholes onsite", "2", "$2,500.00", "$5,000.00"),
        ("2", 'Furnish and install 1,000 LF of 8" SDR-26', "1,000", "$120.00", "$120,000.00"),
        ("3", 'Furnish and install 650 LF of 6" SDR-26 with cleanouts', "650", "$114.00", "$74,100.00"),
        ("4", "Density tests", "15", "$637.40", "$9,561.00"),
        ("5", "MOT with flagmen / barricades rental", "120", "$200.00", "$24,000.00"),
        ("6", "Haul out excess fill up to 30 loads", "30", "$500.00", "$15,000.00"),
        ("7", "12-inch limerock and asphalt restoration", "600", "$50.00", "$30,000.00"),
        ("8", "Surveyor - topo, layout, and as-builts", "1", "$8,500.00", "$8,500.00"),
        ("9", "Dewatering and shoring", "120", "$220.00", "$26,400.00"),
        ("10", "Install sewer manhole", "10", "$6,000.00", "$60,000.00"),
        ("11", "Sawcut asphalt and hazardous material disposal", "1", "$4,439.00", "$4,439.00"),
        ("12", "Safety officer", "120", "$200.00", "$24,000.00"),
        ("13", "Temporary fences", "120", "$150.00", "$18,000.00"),
        ("14", "Sod replacement and sidewalk restoration allowance", "1", "$10,000.00", "$10,000.00"),
        ("15", 'Deduction of 8" pipe - corrected to 101.05 LF', "101.05", "-$120.00", "-$12,126.00"),
        ("16", 'Deduction of 6" pipe - corrected to 306.50 LF', "306.50", "-$114.00", "-$34,941.00"),
        ("17", 'Approved additional 4" pipe - separate line, not duplicated', "164", "$110.00", "$18,040.00"),
        ("18", "Accepted change-order bundle - excluding separate 4-inch pipe line", "1", "$216,677.69", "$216,677.69"),
    ]
    for row in clean_rows:
        rows.append([row[0], Paragraph(row[1], styles["InvoiceCell"]), row[2], row[3], row[4]])

    table = Table(rows, colWidths=[0.35 * inch, 3.2 * inch, 0.75 * inch, 1.05 * inch, 1.25 * inch], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT),
                ("FONTSIZE", (0, 0), (-1, -1), 7.6),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2933")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#c7c0b8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fbfaf7")),
                ("BACKGROUND", (0, 15), (-1, 16), colors.HexColor("#fff8e6")),
                ("BACKGROUND", (0, 17), (-1, 17), colors.HexColor("#f4fbf5")),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.13 * inch))

    totals = [
        ["Corrected invoice total", money(CORRECTED_TOTAL)],
        ["Paid to date - live ledger", money(PAID_TO_DATE)],
        ["Gross remaining earned value", money(GROSS_REMAINING)],
        ["5% retainage on corrected total", money(GROSS_RETAINAGE_5)],
        ["2.5% retainage released now", money(RETAINAGE_RELEASE_NOW)],
        ["2.5% retainage still held", money(RETAINAGE_HELD)],
        ["Correct payable now", money(PAYABLE_NOW)],
    ]
    totals_table = Table(totals, colWidths=[3.5 * inch, 1.6 * inch])
    totals_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), FONT),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#b8b2a7")),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7f6f2")),
                ("BACKGROUND", (0, 6), (-1, 6), colors.HexColor("#fff1f1")),
                ("FONTNAME", (0, 6), (-1, 6), "Helvetica-Bold"),
            ]
        )
    )
    story.append(totals_table)
    story.append(Spacer(1, 0.08 * inch))
    story.append(
        Paragraph(
            "Formula: corrected total minus paid ledger minus remaining 2.5% retainage held = payable now. The 4-inch pipe appears once as its own approved line item and is not duplicated inside the bundled change-order line.",
            styles["InvoiceNote"],
        )
    )
    doc.build(story)


def main() -> None:
    build_discrepancy_pdf()
    build_redline_pdf()
    build_corrected_invoice_pdf()
    print(DISCREPANCY_PDF)
    print(REDLINE_PDF)
    print(CORRECTED_INVOICE_PDF)


if __name__ == "__main__":
    main()
