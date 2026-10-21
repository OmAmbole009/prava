import { PdfDocument, truncateText, wrapText } from "./invoicePdf.js";
import { amountInWords } from "./invoiceBuilder.js";

const MARGIN = 40;
const COLORS = {
  ink: [0.09, 0.11, 0.15],
  muted: [0.42, 0.46, 0.53],
  line: [0.82, 0.85, 0.89],
  band: [0.95, 0.96, 0.98],
  accent: [0.06, 0.35, 0.55],
};

const COLUMNS = [
  { key: "index", label: "#", width: 24, align: "left" },
  { key: "description", label: "Description", width: 138, align: "left" },
  { key: "hsnSac", label: "HSN/SAC", width: 46, align: "left" },
  { key: "quantity", label: "Qty", width: 42, align: "right" },
  { key: "unitPrice", label: "Rate", width: 70, align: "right" },
  { key: "taxableMinor", label: "Taxable", width: 72, align: "right" },
  { key: "taxMinor", label: "Tax", width: 62, align: "right" },
  { key: "totalMinor", label: "Total", width: 61, align: "right" },
];

function money(minor, currency) {
  const value = (Number(minor || 0) / 100).toFixed(2);
  return `${currency} ${value}`;
}

function plain(minor) {
  return (Number(minor || 0) / 100).toFixed(2);
}

/**
 * Formats a value that is already expressed in major units (a unit rate, for
 * example) so it lines up with the minor-unit money columns.
 */
function majorAmount(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function businessAddressLines(business) {
  return [
    business.addressLine1,
    [business.city, business.state, business.postalCode].filter(Boolean).join(", "),
    business.country,
  ].filter(Boolean);
}

function partyAddressLines(invoice) {
  return [
    invoice.partyAddressLine1,
    [invoice.partyCity, invoice.partyState, invoice.partyPostalCode].filter(Boolean).join(", "),
    invoice.partyCountry,
  ].filter(Boolean);
}

/**
 * Renders a business-created invoice or bill into a downloadable PDF.
 *
 * @param {object} params
 * @param {object} params.invoice Issued invoice record with computed line items.
 * @param {object} params.business Issuing business profile.
 * @param {string} params.generatedAt ISO timestamp for the audit footer.
 * @returns {Buffer}
 */
export function renderInvoicePdf({ invoice, business, generatedAt }) {
  const doc = new PdfDocument({ size: "A4", margin: MARGIN });
  const pageWidth = doc.width;
  const contentWidth = doc.contentWidth;
  const currency = invoice.currency || "USD";
  const isBill = invoice.documentKind === "bill";
  const title = isBill ? "BILL" : "TAX INVOICE";
  const counterpartyLabel = isBill ? "Billed By" : "Bill To";

  let pageNumber = 1;
  let y = MARGIN;

  const drawPageHeader = () => {
    pageNumber += 1;
    doc.addPage();
    y = MARGIN;
    doc.text(title, MARGIN, y, { size: 13, bold: true, color: COLORS.accent });
    doc.textRight(`${invoice.invoiceNumber}`, pageWidth - MARGIN, y, { size: 9, color: COLORS.muted });
    y += 22;
    doc.line(MARGIN, y, pageWidth - MARGIN, y, { color: COLORS.line });
    y += 16;
  };

  doc.addPage();

  // ── Header ────────────────────────────────────────────────────────────────
  doc.text(title, MARGIN, y + 4, { size: 20, bold: true, color: COLORS.ink });
  doc.textRight(isBill ? "Purchase / Expense Bill" : "Sales Invoice", pageWidth - MARGIN, y + 4, {
    size: 9,
    color: COLORS.muted,
  });
  y += 34;

  const headerTop = y;
  const leftX = MARGIN;
  const rightX = MARGIN + contentWidth * 0.56;
  const metaWidth = contentWidth * 0.44;
  const metaX = pageWidth - MARGIN - metaWidth;

  doc.text(truncateText(business.legalName || business.name || "Your Business", contentWidth * 0.52, 11, true), leftX, y, {
    size: 11,
    bold: true,
    color: COLORS.ink,
  });
  y += 14;
  for (const line of businessAddressLines(business)) {
    doc.text(truncateText(line, contentWidth * 0.52, 8.5), leftX, y, { size: 8.5, color: COLORS.muted });
    y += 11;
  }
  if (business.email) {
    doc.text(truncateText(business.email, contentWidth * 0.52, 8.5), leftX, y, { size: 8.5, color: COLORS.muted });
    y += 11;
  }
  if (business.phone) {
    doc.text(truncateText(business.phone, contentWidth * 0.52, 8.5), leftX, y, { size: 8.5, color: COLORS.muted });
    y += 11;
  }
  if (business.gstin) {
    doc.text(`GSTIN: ${business.gstin}`, leftX, y, { size: 8.5, bold: true, color: COLORS.ink });
    y += 11;
  }
  void rightX;

  // Meta box
  const metaRows = [
    ["Invoice No.", invoice.invoiceNumber],
    ["Invoice Date", formatDate(invoice.invoiceDate)],
  ];
  if (invoice.dueDate) metaRows.push(["Due Date", formatDate(invoice.dueDate)]);
  if (invoice.partyPlaceOfSupply) metaRows.push(["Place of Supply", invoice.partyPlaceOfSupply]);
  metaRows.push(["Status", String(invoice.status || "draft").toUpperCase()]);

  const metaBoxHeight = metaRows.length * 14 + 16;
  doc.rect(metaX, headerTop - 8, metaWidth, metaBoxHeight, { fill: COLORS.band, stroke: COLORS.line });
  let metaY = headerTop + 4;
  for (const [label, value] of metaRows) {
    doc.text(label, metaX + 10, metaY, { size: 8.5, color: COLORS.muted });
    doc.textRight(truncateText(value, metaWidth - 90, 9, true), metaX + metaWidth - 10, metaY, {
      size: 9,
      bold: true,
      color: COLORS.ink,
    });
    metaY += 14;
  }

  y = Math.max(y, headerTop - 8 + metaBoxHeight) + 18;
  doc.line(MARGIN, y, pageWidth - MARGIN, y, { color: COLORS.line });
  y += 18;

  // ── Counterparty ──────────────────────────────────────────────────────────
  doc.text(counterpartyLabel.toUpperCase(), MARGIN, y, { size: 8, bold: true, color: COLORS.accent });
  y += 14;
  doc.text(truncateText(invoice.partyName, contentWidth, 11, true), MARGIN, y, { size: 11, bold: true, color: COLORS.ink });
  y += 14;
  for (const line of partyAddressLines(invoice)) {
    doc.text(truncateText(line, contentWidth, 8.5), MARGIN, y, { size: 8.5, color: COLORS.muted });
    y += 11;
  }
  const partyMeta = [];
  if (invoice.partyTaxId) partyMeta.push(`Tax ID: ${invoice.partyTaxId}`);
  if (invoice.partyEmail) partyMeta.push(invoice.partyEmail);
  if (invoice.partyPhone) partyMeta.push(invoice.partyPhone);
  if (partyMeta.length) {
    doc.text(truncateText(partyMeta.join("   |   "), contentWidth, 8.5), MARGIN, y, { size: 8.5, color: COLORS.muted });
    y += 11;
  }
  y += 14;

  // ── Line items table ──────────────────────────────────────────────────────
  const drawTableHeader = () => {
    doc.rect(MARGIN, y - 10, contentWidth, 20, { fill: COLORS.band, stroke: COLORS.line });
    let columnX = MARGIN;
    for (const column of COLUMNS) {
      if (column.align === "right") {
        doc.textRight(column.label, columnX + column.width - 6, y, { size: 8, bold: true, color: COLORS.ink });
      } else {
        doc.text(column.label, columnX + 6, y, { size: 8, bold: true, color: COLORS.ink });
      }
      columnX += column.width;
    }
    y += 22;
  };

  drawTableHeader();

  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  lineItems.forEach((item, index) => {
    const descriptionLines = wrapText(item.description, COLUMNS[1].width - 12, 8.5, false, 3);
    // The unit and the tax rate sit on a muted sub-line under the description.
    const sublineParts = [];
    if (item.unit) sublineParts.push(String(item.unit));
    if (item.taxRatePercent) sublineParts.push(`${item.taxRatePercent}%`);
    const subline = sublineParts.join(" · ");
    const rowHeight = descriptionLines.length * 11 + (subline ? 19 : 10);
    if (y + rowHeight > doc.height - MARGIN - 150) {
      drawPageHeader();
      drawTableHeader();
    }

    let columnX = MARGIN;
    const cellTop = y;
    const baseline = y + 9;

    doc.text(String(index + 1), columnX + 6, baseline, { size: 8.5, color: COLORS.muted });
    columnX += COLUMNS[0].width;

    descriptionLines.forEach((line, lineIndex) => {
      doc.text(line, columnX + 6, cellTop + 9 + lineIndex * 11, { size: 8.5, color: COLORS.ink });
    });
    if (subline) {
      doc.text(subline, columnX + 6, cellTop + 9 + descriptionLines.length * 11, {
        size: 7.5,
        color: COLORS.muted,
      });
    }
    columnX += COLUMNS[1].width;

    doc.text(item.hsnSac || "-", columnX + 6, baseline, { size: 8.5, color: COLORS.ink });
    columnX += COLUMNS[2].width;

    doc.textRight(String(item.quantity ?? 0), columnX + COLUMNS[3].width - 6, baseline, { size: 8.5, color: COLORS.ink });
    columnX += COLUMNS[3].width;

    doc.textRight(majorAmount(item.unitPrice), columnX + COLUMNS[4].width - 6, baseline, {
      size: 8.5,
      color: COLORS.ink,
    });
    columnX += COLUMNS[4].width;

    doc.textRight(plain(item.taxableMinor), columnX + COLUMNS[5].width - 6, baseline, { size: 8.5, color: COLORS.ink });
    columnX += COLUMNS[5].width;

    doc.textRight(plain(item.taxMinor), columnX + COLUMNS[6].width - 6, baseline, { size: 8.5, color: COLORS.ink });
    columnX += COLUMNS[6].width;

    doc.textRight(plain(item.totalMinor), columnX + COLUMNS[7].width - 6, baseline, { size: 8.5, bold: true, color: COLORS.ink });

    y += rowHeight;
    doc.line(MARGIN, y - 5, pageWidth - MARGIN, y - 5, { color: COLORS.line });
  });

  y += 8;

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsWidth = 230;
  const totalsX = pageWidth - MARGIN - totalsWidth;
  const taxBreakdown = [];
  if (invoice.cgstMinor > 0) taxBreakdown.push(["CGST", invoice.cgstMinor]);
  if (invoice.sgstMinor > 0) taxBreakdown.push(["SGST", invoice.sgstMinor]);
  if (invoice.igstMinor > 0) taxBreakdown.push(["IGST", invoice.igstMinor]);
  if (!taxBreakdown.length && invoice.taxMinor > 0) taxBreakdown.push(["Tax", invoice.taxMinor]);

  const discountLabel =
    invoice.discountType === "percent" && invoice.discountValue
      ? `Discount (${invoice.discountValue}%)`
      : "Discount";

  const totalsRows = [
    ["Subtotal", plain(invoice.subtotalMinor)],
    ...(invoice.discountMinor > 0 ? [[discountLabel, `-${plain(invoice.discountMinor)}`]] : []),
    ...taxBreakdown.map(([label, value]) => [label, plain(value)]),
  ];

  const totalsHeight = totalsRows.length * 15 + 44;
  if (y + totalsHeight > doc.height - MARGIN - 90) {
    drawPageHeader();
  }

  const totalsTop = y;
  doc.rect(totalsX, totalsTop - 8, totalsWidth, totalsHeight, { fill: COLORS.band, stroke: COLORS.line });
  let totalsY = totalsTop + 4;
  for (const [label, value] of totalsRows) {
    doc.text(label, totalsX + 10, totalsY, { size: 9, color: COLORS.muted });
    doc.textRight(value, totalsX + totalsWidth - 10, totalsY, { size: 9, color: COLORS.ink });
    totalsY += 15;
  }
  doc.line(totalsX + 10, totalsY - 4, totalsX + totalsWidth - 10, totalsY - 4, { color: COLORS.line });
  totalsY += 6;
  doc.text("Total", totalsX + 10, totalsY, { size: 11, bold: true, color: COLORS.ink });
  doc.textRight(money(invoice.totalMinor, currency), totalsX + totalsWidth - 10, totalsY, {
    size: 11,
    bold: true,
    color: COLORS.ink,
  });
  totalsY += 18;
  if (invoice.amountPaidMinor > 0) {
    doc.text("Amount Paid", totalsX + 10, totalsY, { size: 9, color: COLORS.muted });
    doc.textRight(plain(invoice.amountPaidMinor), totalsX + totalsWidth - 10, totalsY, { size: 9, color: COLORS.ink });
    totalsY += 14;
    doc.text("Balance Due", totalsX + 10, totalsY, { size: 9, bold: true, color: COLORS.ink });
    doc.textRight(plain(invoice.totalMinor - invoice.amountPaidMinor), totalsX + totalsWidth - 10, totalsY, {
      size: 9,
      bold: true,
      color: COLORS.ink,
    });
    totalsY += 14;
  }

  // Amount in words
  const wordsY = totalsTop - 8 + totalsHeight + 6;
  const words = amountInWords(invoice.totalMinor, currency);
  const wordsLines = wrapText(`Amount in words: ${words}`, contentWidth, 8.5, false, 2);
  let wordsCursor = wordsY;
  for (const line of wordsLines) {
    doc.text(line, MARGIN, wordsCursor, { size: 8.5, color: COLORS.muted });
    wordsCursor += 11;
  }

  // ── Notes & terms ─────────────────────────────────────────────────────────
  let notesY = wordsCursor + 12;
  const blocks = [
    ["Notes", invoice.notes],
    ["Terms & Conditions", invoice.terms],
  ].filter(([, value]) => Boolean(value && String(value).trim()));

  for (const [label, value] of blocks) {
    const lines = wrapText(value, contentWidth - 90, 8.5, false, 6);
    if (notesY + lines.length * 11 + 16 > doc.height - MARGIN - 40) {
      drawPageHeader();
      notesY = y;
    }
    doc.text(label.toUpperCase(), MARGIN, notesY, { size: 8, bold: true, color: COLORS.accent });
    notesY += 13;
    for (const line of lines) {
      doc.text(line, MARGIN, notesY, { size: 8.5, color: COLORS.muted });
      notesY += 11;
    }
    notesY += 8;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = doc.height - MARGIN + 6;
  doc.line(MARGIN, footerY - 12, pageWidth - MARGIN, footerY - 12, { color: COLORS.line });
  doc.text("Computer generated by Prava. No signature required.", MARGIN, footerY, {
    size: 7.5,
    color: COLORS.muted,
  });
  doc.textRight(`Generated ${formatDate(generatedAt)}   |   Page ${pageNumber}`, pageWidth - MARGIN, footerY, {
    size: 7.5,
    color: COLORS.muted,
  });

  return doc.build();
}
