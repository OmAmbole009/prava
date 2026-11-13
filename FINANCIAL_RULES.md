# Financial Rules and Calculation Scope

This document describes what Prava calculates, how it is validated, and what it
deliberately does not do. Financial arithmetic is deterministic application code
(`server/operations.js`, `server/finance.js`, `server/tdsEngine.js`,
`server/intelligenceEngine.js`). The AI assistant may explain results; it does not
perform or override final arithmetic.

## GST preparation

**Inputs:** documents attached to a GST task (sales and purchase invoices, credit and
debit notes, optional bank statements), each with an extraction and a review status.

**Computation (`calculateGstPreparation`):**

- taxable value, CGST, SGST and IGST are summed from reviewed extractions
- input tax credit is derived from eligible purchase documents
- net tax position = CGST + SGST + IGST − eligible ITC
- values are stored in minor units (paise) to avoid floating-point drift
- documents that are unreviewed, duplicated or internally inconsistent are counted in
  `documentsRequiringReview` rather than silently included

**Status:** a preparation is `needs_review` whenever any required checklist item is
incomplete, any document requires review, or there are no documents at all. Only then
can it become `prepared`. It can never become `submitted` without the approval and
provider path in [CA_WORKFLOW.md](CA_WORKFLOW.md).

**Reconciliation:** `buildGstReconciliationItems` flags duplicates (same GSTIN +
invoice number), missing identifiers, inconsistent totals and outstanding requirements.

### What is not implemented

- No GSTN / government API integration. GSTR-1 and GSTR-3B are **not** transmitted.
- No GSTR-2B download or matching against actual portal data; reconciliation is
  internal to uploaded evidence and labelled as such.
- No e-invoice IRN generation or e-way bill submission.
- No automatic determination of place of supply from a full GSTIN/state matrix; it is
  captured per document and reviewed.
- Rate tables are not a versioned statutory schedule. Tax components come from the
  document itself and are validated for internal arithmetic consistency, not against a
  statutory rate lookup. Treat any derived rate as informational.

## Income tax and TDS

`server/finance.js` and `server/tdsEngine.js` provide deterministic estimation for
supported entity/period combinations. Results are labelled as estimates. They are not
a filing computation and must be reviewed by a professional before use. Statutory
slabs, surcharge and cess change between assessment years; the code must be updated
deliberately for each year rather than inferred.

## Invoice studio

`server/invoiceBuilder.js` / `invoiceRenderer.js` compute line totals, discounts and
tax from explicit user input. Persisted invoices keep the inputs used, so a stored
invoice can be reproduced.

## Validation guarantees

- Amounts are validated for arithmetic consistency (subtotal + tax = total within a
  rounding tolerance). Inconsistency blocks approval and creates a review item.
- GSTIN and PAN formats are validated structurally. Format validity is **not** proof
  that a registration exists or is active.
- Dates are validated for format and plausible ordering.
- Missing values are surfaced as warnings; they are never replaced with invented
  figures.
- Approval binds an evidence fingerprint, so a calculation cannot change after review
  without invalidating the approval.

## Rounding

All persisted amounts are integers in minor units. Display rounding is presentation
only. Aggregations sum integers, so totals are reproducible.

## Rule provenance

Whenever a calculation is presented, its inputs and status travel with it. Where a
statutory rule is applied, the code path and the reviewed evidence are the source of
truth; Prava does not cite a regulation it has not encoded. Additions to statutory
rates or slabs require a code change, tests, and a professional review of the change.
