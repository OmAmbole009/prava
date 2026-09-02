# Prava SaaS Foundation — Delivery Handoff

## Delivered foundation

The current checkpoint establishes the base for a multi-tenant AI finance product: a public product experience, authenticated workspace onboarding, business membership isolation, a protected dashboard shell, and a verified-only financial-summary model. The dashboard intentionally avoids fabricated balances. It will show financial signals only after a trusted server-side process writes a verified summary.

## Recommended delivery sequence

| Stage | Module | Scope and success criterion |
| --- | --- | --- |
| 1 | **Document intake and review** | Secure S3 document upload, metadata extraction, queued processing, and a human-reviewable document status. A user can upload an invoice and see its source, extraction status, and validation result in their own workspace only. |
| 2 | **Ledger and reconciliation core** | Accounts, journal entries, categorized transactions, and reconciliation states. Every financial summary is traceable to approved records; no direct end-user totals entry is introduced. |
| 3 | **Verified summary pipeline** | Connect the ledger computation to `recordVerifiedFinancialSummary`. Once verified records exist, the dashboard presents revenue, expenses, cash, GST position, receivables, and payables for a selected period. |
| 4 | **GST workspace** | Registration context, period readiness, document mismatch flags, preparation checklist, and a clear “guidance only” boundary. No filing is represented as complete without an approved professional workflow. |
| 5 | **Invoices, receivables, and payables** | Invoice drafting, sending, status tracking, reminders, customer/vendor records, and aging. The first reporting workflows should be driven by these operational records. |
| 6 | **Grounded assistant** | Tool-backed questions over approved workspace records, citations to the supporting entries/documents, refusal behavior for unsupported conclusions, and specialist handoff for sensitive compliance questions. |
| 7 | **Subscription and administration** | India-first plan definitions, billing provider integration, workspace roles, audit events, and an internal operations dashboard. Payment activation should follow provider selection and a separate confirmation. |

## Engineering guardrails for the next stage

Every new business record must carry a `businessId` and be read through member-scoped queries. User-uploaded file bytes must remain in S3 rather than database columns. Financial calculations should operate on minor currency units and be persisted only after validation. A future assistant must be restricted to approved procedures and must never write, file, or submit on a user’s behalf without an explicit confirmation flow.

## Existing validation baseline

The project currently passes the automated unit suite, TypeScript checking, and a production build. Browser-level sign-in, protected dashboard access, and session revocation on logout have been checked. The public keyboard path has been exercised, while regression tests enforce accessibility contracts for the public and protected screens.
