/**
 * Minimal, dependency-free PDF writer.
 *
 * The project ships no PDF generation library, so invoices and bills are
 * rendered with a small PDF 1.4 writer that uses the standard Helvetica
 * Type1 fonts. Text is written in WinAnsiEncoding, so characters outside
 * WinAnsi are transliterated before they reach the content stream.
 */

const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  LETTER: { width: 612, height: 792 },
};

const HELVETICA_WIDTHS = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333,
  42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 48: 556, 49: 556, 50: 556, 51: 556,
  52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584,
  62: 584, 63: 556, 64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778,
  82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611, 91: 278,
  92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556,
  102: 278, 103: 556, 104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
  111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556, 118: 500, 119: 722,
  120: 500, 121: 500, 122: 500, 123: 334, 124: 260, 125: 334, 126: 584,
};

const HELVETICA_BOLD_WIDTHS = {
  32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238, 40: 333, 41: 333,
  42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 48: 556, 49: 556, 50: 556, 51: 556,
  52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584,
  62: 584, 63: 611, 64: 975, 65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778,
  82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611, 91: 333,
  92: 278, 93: 333, 94: 584, 95: 556, 96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556,
  102: 333, 103: 611, 104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611,
  111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611, 118: 556, 119: 778,
  120: 556, 121: 556, 122: 500, 123: 389, 124: 280, 125: 389, 126: 584,
};

const TRANSLITERATIONS = {
  "\u20b9": "Rs.", // Indian rupee sign
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2022": "-",
  "\u2026": "...",
  "\u00a0": " ",
  "\u20ac": "\u0080", // euro (WinAnsi 0x80)
  "\u2192": "->",
  "\u00d7": "x",
  "\u2713": "Yes",
  "\u2717": "No",
};

/**
 * Converts a JavaScript string into WinAnsi bytes with PDF string escaping
 * already applied.
 */
export function encodePdfText(value) {
  const source = String(value ?? "");
  let out = "";
  for (const char of source) {
    if (TRANSLITERATIONS[char] !== undefined) {
      out += TRANSLITERATIONS[char];
      continue;
    }
    const code = char.codePointAt(0);
    if (code === 10 || code === 13) {
      out += " ";
      continue;
    }
    if (code < 32) continue;
    if (code > 255) {
      out += "?";
      continue;
    }
    out += String.fromCharCode(code);
  }
  return out
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function measureTextWidth(value, size, bold = false) {
  const table = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  const text = String(value ?? "");
  let total = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    total += table[code] ?? 556;
  }
  return (total / 1000) * size;
}

/**
 * Truncates text to fit the given width, appending an ellipsis when it is cut.
 */
export function truncateText(value, maxWidth, size, bold = false) {
  const text = String(value ?? "");
  if (maxWidth <= 0) return "";
  if (measureTextWidth(text, size, bold) <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}...`;
    if (measureTextWidth(candidate, size, bold) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return `${text.slice(0, low).trimEnd()}...`;
}

/**
 * Wraps text into a maximum number of lines given a maximum width.
 */
export function wrapText(value, maxWidth, size, bold = false, maxLines = 3) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureTextWidth(candidate, size, bold) <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) lines[maxLines - 1] = truncateText(lines[maxLines - 1], maxWidth, size, bold);
  }
  return lines;
}

function formatNumber(value, decimals = 2) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return (0).toFixed(decimals);
  return numeric.toFixed(decimals);
}

export class PdfDocument {
  constructor({ size = "A4", margin = 36 } = {}) {
    const dimensions = PAGE_SIZES[size] ?? PAGE_SIZES.A4;
    this.width = dimensions.width;
    this.height = dimensions.height;
    this.margin = margin;
    this.pages = [];
    this.current = null;
  }

  addPage() {
    this.current = [];
    this.pages.push(this.current);
    return this.current;
  }

  get contentWidth() {
    return this.width - this.margin * 2;
  }

  #toPdfY(y) {
    return this.height - y;
  }

  /**
   * @param {object} options
   * @param {number} options.x Left edge in top-left coordinates.
   * @param {number} options.y Baseline position in top-left coordinates.
   */
  text(value, x, y, options = {}) {
    if (!this.current) this.addPage();
    const {
      size = 10,
      bold = false,
      color = [0, 0, 0],
    } = options;
    const font = bold ? "/F2" : "/F1";
    const [r, g, b] = color;
    const encoded = encodePdfText(value);
    this.current.push(
      `${r} ${g} ${b} rg`,
      `BT ${font} ${formatNumber(size, 2)} Tf 1 0 0 1 ${formatNumber(x, 2)} ${formatNumber(this.#toPdfY(y), 2)} Tm (${encoded}) Tj ET`,
    );
  }

  textRight(value, rightX, y, options = {}) {
    const { size = 10, bold = false } = options;
    const width = measureTextWidth(value, size, bold);
    this.text(value, rightX - width, y, options);
  }

  textCenter(value, centerX, y, options = {}) {
    const { size = 10, bold = false } = options;
    const width = measureTextWidth(value, size, bold);
    this.text(value, centerX - width / 2, y, options);
  }

  line(x1, y1, x2, y2, options = {}) {
    if (!this.current) this.addPage();
    const { width = 0.7, color = [0.75, 0.78, 0.82] } = options;
    const [r, g, b] = color;
    this.current.push(
      `${r} ${g} ${b} RG`,
      `${formatNumber(width, 2)} w`,
      `${formatNumber(x1, 2)} ${formatNumber(this.#toPdfY(y1), 2)} m ${formatNumber(x2, 2)} ${formatNumber(this.#toPdfY(y2), 2)} l S`,
    );
  }

  rect(x, y, width, height, options = {}) {
    if (!this.current) this.addPage();
    const { fill = null, stroke = null, lineWidth = 0.7 } = options;
    const commands = [];
    if (fill) commands.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
    if (stroke) commands.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`, `${formatNumber(lineWidth, 2)} w`);
    commands.push(
      `${formatNumber(x, 2)} ${formatNumber(this.#toPdfY(y + height), 2)} ${formatNumber(width, 2)} ${formatNumber(height, 2)} re`,
      fill && stroke ? "B" : fill ? "f" : "S",
    );
    this.current.push(...commands);
  }

  build() {
    if (!this.pages.length) this.addPage();
    const objects = [];
    const pageCount = this.pages.length;
    const firstPageObject = 4;
    const fontRegularObject = firstPageObject + pageCount * 2;
    const fontBoldObject = fontRegularObject + 1;
    const contentsStart = fontBoldObject + 1;

    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects.push("<< /Type /Pages /Kids [PLACEHOLDER] /Count 1 >>");

    const pageRefs = [];
    for (let index = 0; index < pageCount; index += 1) {
      pageRefs.push(`${firstPageObject + index * 2} 0 R`);
    }
    objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageCount} >>`;

    for (let index = 0; index < pageCount; index += 1) {
      const pageObjectNumber = firstPageObject + index * 2;
      const contentObjectNumber = pageObjectNumber + 1;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatNumber(this.width, 2)} ${formatNumber(this.height, 2)}] ` +
          `/Resources << /Font << /F1 ${fontRegularObject} 0 R /F2 ${fontBoldObject} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
      );
      const stream = this.pages[index].join("\n");
      objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    }

    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    void contentsStart;

    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    let body = "";
    const offsets = [];
    for (let index = 0; index < objects.length; index += 1) {
      offsets.push(Buffer.byteLength(header + body, "latin1"));
      body += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(header + body, "latin1");
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    const trailer =
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(header + body + xref + trailer, "latin1");
  }
}

export { formatNumber };
