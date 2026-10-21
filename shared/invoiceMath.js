/**
 * Shared invoice money maths.
 *
 * This module is imported by both the browser (for the live preview) and the
 * server (for the authoritative totals) so a preview can never disagree with
 * the generated document. It must stay free of node and browser APIs.
 *
 * Money is always handled in minor units (integers). Percentages are whole
 * numbers (18 => 18%).
 */

/**
 * Parses a decimal value into an exact scaled BigInt so that money maths never
 * touches floating point. `decimals` controls how many fractional digits are
 * preserved.
 */
export function decimalToScaledBigInt(value, decimals = 2) {
  const text = String(value ?? "0").trim();
  if (!text || text === "-") return 0n;
  const negative = text.startsWith("-");
  const cleaned = text.replace(/^-/, "");
  const [whole = "0", fraction = ""] = cleaned.split(".");
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const scale = 10n ** BigInt(decimals);
  const scaled = BigInt(whole || "0") * scale + BigInt(padded || "0");
  return negative ? -scaled : scaled;
}

/**
 * Converts a decimal value into minor units using exact half-up rounding so
 * that 19.99 becomes 1999 and never 1998.
 */
export function toMinor(value) {
  const scaled = decimalToScaledBigInt(value, 4);
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const base = absolute / 100n;
  const remainder = absolute % 100n;
  const rounded = remainder * 2n >= 100n ? base + 1n : base;
  return Number(negative ? -rounded : rounded);
}

export function fromMinor(minor) {
  return (Number(minor || 0) / 100).toFixed(2);
}

/**
 * Applies a percentage stored in basis points to a minor-unit amount.
 */
function applyBasisPoints(minor, basisPoints) {
  if (!basisPoints) return 0;
  const product = BigInt(minor) * BigInt(basisPoints);
  const quotient = product / 10000n;
  const remainder = product % 10000n;
  const rounded = remainder * 2n >= 10000n ? quotient + 1n : quotient;
  return Number(rounded);
}

function toBasisPoints(percent) {
  const scaled = decimalToScaledBigInt(percent, 2);
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  return Number(negative ? -absolute : absolute);
}

/**
 * Splits a discount across line items proportionally to their value. The
 * rounding remainder is placed on the lines with the largest fractional share
 * so that the allocated discount always equals the requested discount exactly.
 */
export function allocateDiscount(lineTotals, discountMinor) {
  const subtotal = lineTotals.reduce((sum, value) => sum + value, 0);
  if (discountMinor <= 0 || subtotal <= 0) return lineTotals.map(() => 0);

  const capped = Math.min(discountMinor, subtotal);
  const raw = lineTotals.map(value => (value / subtotal) * capped);
  const allocated = raw.map(value => Math.floor(value));
  let remainder = capped - allocated.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    allocated[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return allocated;
}

/**
 * Decides whether a GST invoice is intra-state (CGST + SGST) or inter-state
 * (IGST) by comparing the place of supply with the supplier's state.
 */
export function resolveGstTreatment(placeOfSupply, supplierState) {
  const normalise = value => String(value ?? "").trim().toLowerCase();
  const destination = normalise(placeOfSupply);
  const origin = normalise(supplierState);
  if (!destination || !origin) {
    return { isInterState: false, reason: "Place of supply was not supplied, so state tax was applied." };
  }
  if (destination === origin) {
    return { isInterState: false, reason: "Place of supply matches the state of supply." };
  }
  if (destination.includes(origin) || origin.includes(destination)) {
    return { isInterState: false, reason: "Place of supply matches the state of supply." };
  }
  return { isInterState: true, reason: "Place of supply is outside the state of supply, so integrated tax applies." };
}

/**
 * Computes every monetary value for an invoice or bill.
 *
 * @param {object} input Invoice input.
 * @param {object} context
 * @param {string} context.supplierState State of the issuing business.
 * @param {boolean} context.isInterState Force inter-state GST treatment.
 */
export function computeInvoiceTotals(input, context = {}) {
  const supplierState = context.supplierState ?? "";
  const quantityDecimals = 4;
  const lineTotals = input.lineItems.map(item => {
    const quantity = decimalToScaledBigInt(item.quantity, quantityDecimals);
    const unitPriceMinor = decimalToScaledBigInt(item.unitPrice, 2);
    return Number((quantity * unitPriceMinor) / 10n ** BigInt(quantityDecimals));
  });

  const subtotalMinor = lineTotals.reduce((sum, value) => sum + value, 0);

  const discountType = input.discount?.type ?? "none";
  const discountValue = input.discount?.value ?? 0;
  let requestedDiscount = 0;
  if (discountType === "percent") {
    requestedDiscount = applyBasisPoints(subtotalMinor, toBasisPoints(discountValue));
  } else if (discountType === "amount") {
    requestedDiscount = toMinor(discountValue);
  }
  const discountMinor = Math.max(0, Math.min(requestedDiscount, subtotalMinor));
  const discountAllocation = allocateDiscount(lineTotals, discountMinor);

  const taxMode = input.taxMode ?? "none";
  const defaultTaxRate = Number(input.taxRatePercent ?? 0);
  const interState = context.isInterState ?? resolveGstTreatment(input.party?.placeOfSupply, supplierState).isInterState;

  let taxMinor = 0;
  let cgstMinor = 0;
  let sgstMinor = 0;
  let igstMinor = 0;

  const lineItems = input.lineItems.map((item, index) => {
    const lineTotalMinor = lineTotals[index];
    const lineDiscountMinor = discountAllocation[index];
    const taxableMinor = lineTotalMinor - lineDiscountMinor;
    const rate = item.taxRatePercent === undefined || item.taxRatePercent === null
      ? defaultTaxRate
      : Number(item.taxRatePercent);
    const rateBasisPoints = toBasisPoints(rate);

    let lineCgst = 0;
    let lineSgst = 0;
    let lineIgst = 0;

    if (taxMode !== "none" && rate > 0) {
      if (taxMode === "gst") {
        if (interState) {
          lineIgst = applyBasisPoints(taxableMinor, rateBasisPoints);
        } else {
          lineCgst = applyBasisPoints(taxableMinor, Math.round(rateBasisPoints / 2));
          lineSgst = applyBasisPoints(taxableMinor, Math.round(rateBasisPoints / 2));
        }
      } else {
        lineIgst = applyBasisPoints(taxableMinor, rateBasisPoints);
      }
    }

    cgstMinor += lineCgst;
    sgstMinor += lineSgst;
    igstMinor += lineIgst;

    const lineTaxMinor = lineCgst + lineSgst + lineIgst;
    taxMinor += lineTaxMinor;

    return {
      description: item.description,
      hsnSac: item.hsnSac ?? "",
      unit: item.unit ?? "",
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      taxRatePercent: rate,
      lineTotalMinor,
      discountMinor: lineDiscountMinor,
      taxableMinor,
      cgstMinor: lineCgst,
      sgstMinor: lineSgst,
      igstMinor: lineIgst,
      taxMinor: lineTaxMinor,
      totalMinor: taxableMinor + lineTaxMinor,
    };
  });

  const totalMinor = subtotalMinor - discountMinor + taxMinor;

  return {
    lineItems,
    subtotalMinor,
    discountMinor,
    taxMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    totalMinor,
    taxMode,
    taxRatePercent: defaultTaxRate,
    isInterState: taxMode === "gst" ? interState : false,
  };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(value) {
  if (value < 20) return ONES[value];
  const tens = TENS[Math.floor(value / 10)];
  const ones = ONES[value % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function threeDigitWords(value) {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const head = hundreds ? `${ONES[hundreds]} Hundred` : "";
  if (!remainder) return head;
  return head ? `${head} ${twoDigitWords(remainder)}` : twoDigitWords(remainder);
}

/**
 * Converts an amount in minor units into words using the Indian numbering
 * system (Lakh / Crore), which is required on Indian tax invoices.
 */
export function amountInWords(minor, currency = "INR") {
  const absolute = Math.abs(Math.round(Number(minor || 0)));
  const rupees = Math.floor(absolute / 100);

  // Indian grouping: Crore | Lakh | Thousand | Hundreds-and-below
  const lastThree = rupees % 1000;
  const thousands = Math.floor(rupees / 1000) % 100;
  const lakhs = Math.floor(rupees / 100000) % 100;
  const crores = Math.floor(rupees / 10000000);

  const parts = [];
  if (crores) parts.push(`${threeDigitWords(crores)} Crore`);
  if (lakhs) parts.push(`${twoDigitWords(lakhs)} Lakh`);
  if (thousands) parts.push(`${twoDigitWords(thousands)} Thousand`);
  if (lastThree) parts.push(threeDigitWords(lastThree));

  const words = parts.length ? parts.join(" ") : "Zero";
  const currencyLabel = currency === "INR" ? "Rupees" : currency === "USD" ? "US Dollars" : currency;
  return `${currencyLabel} ${words} Only`.replace(/\s+/g, " ").trim();
}
