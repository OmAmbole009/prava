# CA Workflow

Prava's professional review is a recorded workflow, not a chat persona. AI prepares
and validates; a verified professional records an attributable decision; the business
owner separately authorises actions taken on their behalf.

## 1. Professional onboarding and verification

Access is granted by a Prava administrator (`grantCaAccessSchema`,
`POST /api/admin/*`), which records:

- full name, email, phone, firm, specialisation, bio
- ICAI membership number
- professional status: `active | suspended | revoked`
- the administrator who granted access and when

**Verification is manual.** Prava has no ICAI integration and does not claim one.
The membership number is recorded by an administrator after a documented manual check
of the certificate of practice. Until that check is recorded, the account must not be
treated as verified. Suspension or revocation immediately blocks portal sign-in and all
decision recording.

A platform administrator is **not** a CA. `submitCaDecision` requires an active
`caProfiles` row; an admin without one cannot record a professional decision.

## 2. Assignment

`caAssignments` links a professional to a business. Assignment is scoped by business,
records who assigned it and supports reassignment (`status: active | unassigned`).

`authorizeCaReview()` enforces, on every decision:

1. an active professional profile exists;
2. the profile status is `active`;
3. the task belongs to the stated business;
4. an active assignment exists for that business.

Cross-tenant review, review of unassigned clients, and review by suspended
professionals are rejected server-side.

## 3. Task preparation and pre-review checks

Before a task reaches a reviewer it accumulates:

- a requirement checklist (`taskRequirements`) with `complete | missing | needs_review | skipped`
- source documents and their extractions, including flagged review reasons
- a GST preparation with a transparent CGST/SGST/IGST/ITC breakdown
- reconciliation items (`matched | missing | duplicate | mismatch | needs_review`)
- open action items for missing information

A task cannot be prepared while required evidence is missing or an extraction still
needs review. Automated validation and human approval are separate stages.

## 4. Recording a decision

`POST /api/ca/submit-decision` (`submitCaDecision`):

1. Re-checks profile, assignment, business/task linkage and task status
   (`needs_review`, `ready_for_review`, `professional_review`, `prepared`,
   `submission_pending`, `blocked`).
2. Computes an **evidence fingerprint** (`server/caApproval.js`) over the task's
   documents, extractions and GST preparation.
3. Appends a `caAuditObservations` row containing decision, notes, certificate
   reference, reviewer, fingerprint and a snapshot of what was reviewed.
4. Applies only a legal lifecycle transition (`server/taskLifecycle.js`).

Decisions: `approved`, `needs_revision`, `rejected`.

## 5. Approval integrity

- Observations are **append-only**. A new approval never overwrites an old one.
- An approval binds the exact evidence fingerprint it was given.
- Any material change — a new document upload, a corrected extraction, a recalculated
  preparation — calls `invalidateCaApprovalsForTask`, which sets `invalidatedAt` and a
  reason on prior approvals. The record is preserved; only its validity changes.
- `getCurrentCaApproval()` returns the latest approval plus whether it still matches
  current evidence. A stale approval must not be presented as current.

## 6. After approval: authorisation and filing

Approval is not filing. The remainder of the path is deliberately gated:

1. A workspace administrator requests an authorised submission
   (`requestAuthorizedGstSubmission`); the requester cannot approve their own request.
2. A **different** workspace administrator approves it (`canIndependentlyApproveSubmission`).
3. Dispatch requires a configured, authorised provider (`beginAuthorizedGstProviderDispatch`).
4. `recordOfficialGstSubmission` stores the official reference only after a provider
   dispatch; `recordAuthorizedGstProviderFailure` returns the task to `prepared`.
5. `markGstSubmissionPending` is intentionally disabled — there is no direct handoff.

If no provider is configured, the task stops at "approved, awaiting authorised
dispatch". Prava never fabricates a filing or acknowledgement.

## 7. Where this appears in the product

Both sides read the same persisted records through dedicated endpoints:

| Endpoint | Audience | Returns |
| --- | --- | --- |
| `GET /api/tasks/:taskId/approval` | Business members | Current status, validity, evidence reference, reviewer, decision history, next action |
| `GET /api/tasks/approvals?businessId=` | Business members | Per-task approval status and counts |
| `GET /api/ca/approval-queue` | Assigned professionals | Workload across assigned workspaces, including invalidated approvals |
| `GET /api/ca/tasks/:taskId` | Assigned professionals | Source documents, extractions, requirements and the prepared working |

UI mapping (`server/caApproval.js`): `not_submitted`, `awaiting_ca_review`,
`under_ca_review`, `changes_requested`, `approved`, `approval_invalidated`,
`awaiting_client_authorization`, `authorized_for_execution`, `submitted`,
`completed`, `rejected`, `on_hold`. Each state is derived from stored rows only.

`approval_invalidated` deliberately outranks any downstream authorization state: if
the evidence behind an approval changes, a previously authorized submission reverts to
an invalidated status and execution actions are locked.

## 8. Audit trail

Every decision writes:

- reviewer user id and membership number at the time of review
- task id, business id and financial period
- reviewed document ids and evidence fingerprint
- decision, comments, certificate reference and timestamp
- invalidation state and reason, if later voided

`auditEvents` and `adminAuditEvents` record the surrounding operations (task creation,
document review, submission requests, approvals, provider dispatch, administrative
changes). Audit rows are not editable through ordinary application APIs.

## 9. Concurrent decisions and versioning

Every task carries a `version`. A reviewer acts on the version they inspected; the client
may send `expectedVersion`. The decision runs in a single transaction that locks the task
row, so:

- two simultaneous decisions produce exactly one committed decision (the other gets 409);
- a stale review cannot overwrite a newer one;
- an approval and a rejection cannot both land;
- the review request, task version and preparation status change atomically with the
  observation.

The database suite proves this with genuinely simultaneous requests against MySQL, and the
browser suite repeats it over HTTP.

## 10. What the fingerprint covers

The review fingerprint is a SHA-256 over substantive evidence only: document identity and
type, the extracted invoice number and total, and the prepared sales/CGST/SGST/IGST/ITC
figures. Row timestamps, statuses and preparation lifecycle values are deliberately
excluded, because recording a decision or advancing the task would otherwise invalidate
the approval that caused it. Uploading, replacing or correcting a document still changes
the fingerprint and invalidates the prior approval.
