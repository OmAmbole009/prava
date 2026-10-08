/**
 * Prava AR/AP Engine
 * Tracks Accounts Receivable (money customers owe) and
 * Accounts Payable (bills the business needs to pay).
 *
 * Works entirely from in-memory extracted invoice data.
 * No separate AR/AP database table required — derived from document extractions.
 */

import { determineApplicableTdsRule } from "./tdsEngine.js";

// ─── Aging Bucket Helpers ─────────────────────────────────────────────────────

/**
 * Returns days past due for an invoice (positive = overdue, negative = not yet due).
 */
function daysPastDue(dueDate) {
  if (!dueDate) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.floor((now - due) / 86400000);
}

function getAgingBucket(days) {
  if (days <= 0) return "current";
  if (days <= 30) return "1_to_30";
  if (days <= 60) return "31_to_60";
  if (days <= 90) return "61_to_90";
  return "over_90";
}

function agingBucketLabel(bucket) {
  const labels = {
    current: "Not yet due",
    "1_to_30": "1–30 days overdue",
    "31_to_60": "31–60 days overdue",
    "61_to_90": "61–90 days overdue",
    "over_90": "Over 90 days overdue",
  };
  return labels[bucket] || bucket;
}

/**
 * Estimate payment due date from invoice date.
 * Default: 30-day net terms unless business has configured otherwise.
 */
function estimateDueDate(invoiceDate, netDays = 30) {
  if (!invoiceDate) return null;
  const d = new Date(invoiceDate);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + netDays);
  return d;
}

// ─── Accounts Receivable ──────────────────────────────────────────────────────

/**
 * Builds accounts receivable from sales invoice extractions.
 * Groups by customer name, tracks per-invoice status.
 *
 * @param {Array} extractions - Array of { document, extraction }
 * @returns {object} AR summary
 */
export function buildAccountsReceivable(extractions) {
  const salesExtractions = (extractions || []).filter(e =>
    e.extraction?.invoiceType === "sales" &&
    (e.extraction?.totalMinor || 0) > 0
  );

  const customerMap = new Map();

  for (const item of salesExtractions) {
    const ext = item.extraction;
    const doc = item.document;
    const customerName = ext.buyerName || ext.vendorName || "Unknown Customer";
    const customerKey = customerName.toLowerCase().trim();

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        customerName,
        customerGstin: ext.buyerGstin || null,
        invoices: [],
        totalInvoicedMinor: 0,
        totalOutstandingMinor: 0,
      });
    }

    const customer = customerMap.get(customerKey);
    const invoiceDate = ext.invoiceDate ? new Date(ext.invoiceDate) : new Date(doc?.createdAt || Date.now());
    const dueDate = estimateDueDate(invoiceDate, 30);
    const dpd = dueDate ? daysPastDue(dueDate) : 0;
    const agingBucket = getAgingBucket(dpd);

    // For now: assume all sales invoices are outstanding (no payment recorded)
    // In a future version, payments would be matched against invoices
    const outstandingMinor = ext.totalMinor || 0;

    const invoice = {
      documentId: doc?.id,
      invoiceNumber: ext.invoiceNumber || `INV-${doc?.id}`,
      invoiceDate: invoiceDate.toISOString().slice(0, 10),
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      totalMinor: ext.totalMinor || 0,
      taxableValueMinor: ext.taxableValueMinor || 0,
      outstandingMinor,
      daysPastDue: dpd,
      agingBucket,
      agingBucketLabel: agingBucketLabel(agingBucket),
      status: dpd > 0 ? "overdue" : "outstanding",
      isOverdue: dpd > 0,
    };

    customer.invoices.push(invoice);
    customer.totalInvoicedMinor += (ext.totalMinor || 0);
    customer.totalOutstandingMinor += outstandingMinor;
  }

  // Build summary per customer
  const customers = Array.from(customerMap.values()).map(c => ({
    ...c,
    invoiceCount: c.invoices.length,
    overdueCount: c.invoices.filter(i => i.isOverdue).length,
    overdueMinor: c.invoices.filter(i => i.isOverdue).reduce((s, i) => s + i.outstandingMinor, 0),
    worstDaysOverdue: Math.max(0, ...c.invoices.map(i => i.daysPastDue)),
    isChronicLatePayer: c.invoices.filter(i => i.daysPastDue > 30).length >= 2,
  })).sort((a, b) => b.totalOutstandingMinor - a.totalOutstandingMinor);

  // Aging buckets totals
  const aging = {
    current: 0,
    "1_to_30": 0,
    "31_to_60": 0,
    "61_to_90": 0,
    "over_90": 0,
  };

  for (const c of customers) {
    for (const inv of c.invoices) {
      aging[inv.agingBucket] = (aging[inv.agingBucket] || 0) + inv.outstandingMinor;
    }
  }

  const totalOutstandingMinor = customers.reduce((s, c) => s + c.totalOutstandingMinor, 0);
  const totalOverdueMinor = customers.reduce((s, c) => s + c.overdueMinor, 0);
  const overdueCustomers = customers.filter(c => c.overdueCount > 0);
  const chronicLateCustomers = customers.filter(c => c.isChronicLatePayer);

  return {
    totalOutstandingMinor,
    totalOutstandingRupees: Math.round(totalOutstandingMinor / 100),
    totalOverdueMinor,
    totalOverdueRupees: Math.round(totalOverdueMinor / 100),
    customersCount: customers.length,
    overdueCustomersCount: overdueCustomers.length,
    aging,
    agingBuckets: aging,
    customers,

    // Plain-English summary
    summary: {
      plainEnglish: totalOutstandingMinor > 0
        ? `Customers owe you Rs ${Math.round(totalOutstandingMinor / 100).toLocaleString("en-IN")} in total.${totalOverdueMinor > 0 ? ` Rs ${Math.round(totalOverdueMinor / 100).toLocaleString("en-IN")} is overdue.` : ""}`
        : "No outstanding customer invoices found.",
      overdueAlert: totalOverdueMinor > 0
        ? `Rs ${Math.round(totalOverdueMinor / 100).toLocaleString("en-IN")} is overdue from ${overdueCustomers.length} customer${overdueCustomers.length !== 1 ? "s" : ""}.`
        : null,
      chronicLateAlert: chronicLateCustomers.length > 0
        ? `${chronicLateCustomers.map(c => c.customerName).join(", ")} ${chronicLateCustomers.length === 1 ? "has" : "have"} repeatedly paid late.`
        : null,
    },

    note: "Outstanding amounts are based on invoices uploaded to Prava. Mark invoices as paid to update these figures.",
  };
}

// ─── Accounts Payable ─────────────────────────────────────────────────────────

/**
 * Builds accounts payable from purchase invoice extractions.
 * Groups by vendor, tracks per-invoice status, flags TDS applicability.
 *
 * @param {Array} extractions - Array of { document, extraction }
 * @param {Array} tdsVendors - Array from TDS engine (vendorsWithTdsObligation)
 * @returns {object} AP summary
 */
export function buildAccountsPayable(extractions, tdsVendors = []) {
  const purchaseExtractions = (extractions || []).filter(e =>
    e.extraction?.invoiceType === "purchase" &&
    (e.extraction?.totalMinor || 0) > 0
  );

  const tdsVendorNames = new Set(
    tdsVendors.map(v => (v.vendorName || "").toLowerCase().trim())
  );

  const vendorMap = new Map();

  for (const item of purchaseExtractions) {
    const ext = item.extraction;
    const doc = item.document;
    const vendorName = ext.vendorName || "Unknown Vendor";
    const vendorKey = vendorName.toLowerCase().trim();
    const autoRule = determineApplicableTdsRule({ vendorName, amountMinor: ext.totalMinor || 0 });
    const isTdsApplicable = tdsVendorNames.has(vendorKey) || Boolean(autoRule);

    if (!vendorMap.has(vendorKey)) {
      vendorMap.set(vendorKey, {
        vendorName,
        vendorGstin: ext.gstin || null,
        hasTdsObligation: isTdsApplicable,
        tdsApplicable: isTdsApplicable,
        bills: [],
        totalBilledMinor: 0,
        totalOutstandingMinor: 0,
      });
    }

    const vendor = vendorMap.get(vendorKey);
    const invoiceDate = ext.invoiceDate ? new Date(ext.invoiceDate) : new Date(doc?.createdAt || Date.now());
    const dueDate = estimateDueDate(invoiceDate, 30);
    const dpd = dueDate ? daysPastDue(dueDate) : 0;
    const agingBucket = getAgingBucket(dpd);

    // Assume all purchase bills are outstanding (no payment recorded yet)
    const outstandingMinor = ext.totalMinor || 0;
    const gstOnBill = (ext.cgstMinor || 0) + (ext.sgstMinor || 0) + (ext.igstMinor || 0);

    const bill = {
      documentId: doc?.id,
      invoiceNumber: ext.invoiceNumber || `BILL-${doc?.id}`,
      invoiceDate: invoiceDate.toISOString().slice(0, 10),
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
      totalMinor: ext.totalMinor || 0,
      taxableValueMinor: ext.taxableValueMinor || 0,
      gstMinor: gstOnBill,
      outstandingMinor,
      daysPastDue: dpd,
      agingBucket,
      agingBucketLabel: agingBucketLabel(agingBucket),
      status: dpd > 0 ? "overdue" : "outstanding",
      isOverdue: dpd > 0,
      hasTdsFlag: isTdsApplicable,
    };

    vendor.bills.push(bill);
    vendor.totalBilledMinor += (ext.totalMinor || 0);
    vendor.totalOutstandingMinor += outstandingMinor;
  }

  const vendors = Array.from(vendorMap.values()).map(v => ({
    ...v,
    tdsApplicable: v.hasTdsObligation || v.tdsApplicable || false,
    billCount: v.bills.length,
    overdueCount: v.bills.filter(b => b.isOverdue).length,
    overdueMinor: v.bills.filter(b => b.isOverdue).reduce((s, b) => s + b.outstandingMinor, 0),
    totalGstMinor: v.bills.reduce((s, b) => s + b.gstMinor, 0),
    dueSoon: v.bills.filter(b => !b.isOverdue && b.daysPastDue > -8).length > 0,
  })).sort((a, b) => b.totalOutstandingMinor - a.totalOutstandingMinor);

  // Aging buckets
  const aging = {
    current: 0,
    "1_to_30": 0,
    "31_to_60": 0,
    "61_to_90": 0,
    "over_90": 0,
  };

  // Due this month (bills due within 30 days)
  let dueThisMonthMinor = 0;

  for (const v of vendors) {
    for (const bill of v.bills) {
      aging[bill.agingBucket] = (aging[bill.agingBucket] || 0) + bill.outstandingMinor;
      if (bill.daysPastDue >= -30 && !bill.isOverdue) {
        dueThisMonthMinor += bill.outstandingMinor;
      }
    }
  }

  const totalOutstandingMinor = vendors.reduce((s, v) => s + v.totalOutstandingMinor, 0);
  const totalOverdueMinor = vendors.reduce((s, v) => s + v.overdueMinor, 0);
  const vendorsWithTdsFlag = vendors.filter(v => v.hasTdsObligation);

  return {
    totalOutstandingMinor,
    totalOutstandingRupees: Math.round(totalOutstandingMinor / 100),
    totalOverdueMinor,
    totalOverdueRupees: Math.round(totalOverdueMinor / 100),
    dueThisMonthMinor,
    dueThisMonthRupees: Math.round(dueThisMonthMinor / 100),
    vendorsCount: vendors.length,
    overdueVendorsCount: vendors.filter(v => v.overdueCount > 0).length,
    tdsVendorsCount: vendorsWithTdsFlag.length,
    aging,
    vendors,

    summary: {
      plainEnglish: totalOutstandingMinor > 0
        ? `You have Rs ${Math.round(totalOutstandingMinor / 100).toLocaleString("en-IN")} in bills to pay.${dueThisMonthMinor > 0 ? ` Rs ${Math.round(dueThisMonthMinor / 100).toLocaleString("en-IN")} is due this month.` : ""}`
        : "No outstanding bills found.",
      overdueAlert: totalOverdueMinor > 0
        ? `Rs ${Math.round(totalOverdueMinor / 100).toLocaleString("en-IN")} in bills are overdue.`
        : null,
      tdsAlert: vendorsWithTdsFlag.length > 0
        ? `${vendorsWithTdsFlag.length} vendor${vendorsWithTdsFlag.length !== 1 ? "s" : ""} may require tax deduction before payment.`
        : null,
    },

    note: "Outstanding amounts are based on bills uploaded to Prava. Mark bills as paid to update these figures.",
  };
}

// ─── Combined AR/AP Dashboard ─────────────────────────────────────────────────

/**
 * Returns lightweight AR/AP figures for the dashboard.
 */
export function getArApDashboardSummary(extractions, tdsVendors = []) {
  const ar = buildAccountsReceivable(extractions);
  const ap = buildAccountsPayable(extractions, tdsVendors);

  const overdueCustomerCount = ar.customers.reduce((s, c) => s + (c.overdueCount > 0 ? 1 : 0), 0);

  const receivablesData = {
    totalMinor: ar.totalOutstandingMinor,
    totalOverdueMinor: ar.totalOverdueMinor,
    overdueCount: overdueCustomerCount,
    plainEnglish: ar.summary.plainEnglish,
    overdueAlert: ar.summary.overdueAlert,
  };

  const payablesData = {
    totalMinor: ap.totalOutstandingMinor,
    dueThisMonthMinor: ap.dueThisMonthMinor,
    totalOverdueMinor: ap.totalOverdueMinor,
    overdueCount: ap.overdueVendorsCount,
    plainEnglish: ap.summary.plainEnglish,
    overdueAlert: ap.summary.overdueAlert,
    tdsAlert: ap.summary.tdsAlert,
  };

  return {
    ar: receivablesData,
    ap: payablesData,
    receivables: receivablesData,
    payables: payablesData,
  };
}
