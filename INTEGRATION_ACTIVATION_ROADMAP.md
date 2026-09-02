# Prava Integration Activation Roadmap

## Current delivery boundary

Prava’s financial-operations vertical slice is complete as a **prepare, review, and record** system. It does not initiate payments, submit government filings, or claim external acceptance. The integration order below preserves that boundary.

| Sequence | Integration milestone | Preconditions | Acceptance evidence |
| --- | --- | --- |
| 1 | **User-owned browser workflow check** | A business workspace and a real, non-sensitive source document supplied by an authorized user. | The Action Center opens a document-review item; an approval resolves that item; the GST task produces preparation and reconciliation states visible in the workspace. |
| 2 | **Razorpay secure configuration** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` supplied through the secure project settings; a live Razorpay subscription plan is configured. | Server creates provider-backed subscription records only from verified Razorpay responses; client never receives the secret. |
| 3 | **Verified payment webhook** | A public webhook endpoint, signature verification, idempotent `paymentEvents`, and provider event mapping. | Valid signed events update subscription/payment status exactly once; invalid signatures are rejected and logged. |
| 4 | **Billing activation review** | Sandbox and limited-production verification of creation, renewal, cancellation, and failed payment paths. | The administrator audit log, workspace entitlement state, and provider event history agree for every test case. |
| 5 | **Independent GST submission approval** | A fully prepared return, no unresolved evidence/review boundary, and a different workspace administrator to review it. | An audited request moves from `awaiting_review` to `approved`; requester self-approval is rejected; approval alone remains explicitly not filed. |
| 6 | **Authorized GST submission connector** | A legitimate authorized gateway or professional workflow, confirmed legal/compliance requirements, provider credentials, and a verifiable official receipt/reference. | Only a server-only provider dispatch can move an approved request to `dispatching`; `recordOfficialGstSubmission` accepts a reference only after that dispatch state. |
| 7 | **Verified Google Pay / UPI QR** | A verified merchant UPI destination, legal payee name, unique transaction references, and a bank/PSP API that verifies payment status server-side. | A QR is rendered only from the verified destination; a scan, redirect, or customer claim never activates a plan or marks an invoice paid. |
| 8 | **Post-integration monitoring** | Operational alerting, restricted admin access, retention policy, and incident runbook. | Reconciliation exceptions, failed webhooks, UPI-payment discrepancies, and submission errors are visible to authorized operators without exposing financial source data broadly. |

## Safety controls that remain mandatory

Every provider webhook must verify its signature before mutating a subscription. Every government-submission transition must carry an authoritative reference and be generated outside the client. An approved GST request must be independently reviewed before a provider dispatch can begin. A Google Pay or UPI QR must be backed by a verified merchant destination and server-side status check; it is never itself proof of payment. Source documents must remain tenant-scoped, and no record should be reclassified or filed solely on model output without review controls.

## Out of scope until explicitly authorized

No payment account, checkout link, UPI QR, webhook secret, GST gateway credential, or government portal session is configured by this delivery. The next implementation should begin only when the corresponding authorized credentials, merchant verification, and compliance decision are available.

## Readiness console

The administrator can now use **Integration readiness** to record non-secret metadata for the email sender, authorized GST provider, Razorpay account, and merchant UPI setup. These records are audited and never contain API keys, webhook secrets, passwords, or embedded URL credentials. A saved record is operational context only; it does not enable email delivery, checkout, QR rendering, provider dispatch, or filing.

The readiness state remains **not ready for activation** until both the corresponding server-only requirements and the required non-secret metadata are present. Email decision rows remain suppressed, Razorpay remains inactive, UPI remains without a QR, and GST remains preparation-only until verified integrations provide authoritative responses. The page intentionally does not provide a way to bypass these gates.
