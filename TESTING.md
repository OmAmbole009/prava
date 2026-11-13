# Testing

## Running

```bash
npm test                 # full Vitest suite
npx vitest run server/caApproval.test.js   # a single file
npm run build            # production bundle (client + server)
```

## Current baseline

At the time of this change: **45 test files, 330 tests passing, 3 skipped** (~12s); the
skipped tests are the MySQL-only concurrency suite. `npm run build` succeeds for the client
and server bundles, `npm run test:mysql` passes against MySQL 8.0, and `npm run test:e2e`
passes 12 browser flows.

## What is covered

| Area | Representative files |
| --- | --- |
| Authentication, OTP, logout, password reset | `auth.endtoend.test.js`, `auth.enhanced.test.js`, `auth.logout.test.js`, `emailOtpAuth.comprehensive.test.js` |
| Admin/CA portal login and throttling | `adminLogin.test.js`, `adminSecurity.test.js`, `caManagement.test.js` |
| Tenant isolation and IDOR | `tenantIsolation.test.js`, `auth.endtoend.test.js` |
| Task lifecycle and approval validity | `taskLifecycle.test.js` (new) |
| CA authorization and evidence binding | `caApproval.test.js` |
| Approval status view, invalidation, CA evidence access | `approvalWorkflow.test.js` |
| Security headers, rate limits, origin guard, prod config | `securityHardening.test.js` (new) |
| Document intake and OCR validation | `ocrEvaluation.test.js`, `invoiceParser.test.js`, `storageUnavailableHandling.test.js` |
| GST preparation and reconciliation | `businessWorkflows.test.js`, `operations.test.js`, `gstAdmin.test.js` |
| Direct tax, TDS, AR/AP, health score | `finance.test.js`, `tdsEngine.test.js`, `arApEngine.test.js`, `healthScore.test.js` |
| Billing and entitlements | `entitlements.test.js`, `billingPayments` paths, `cleanBusinessAndUpload.test.js` |
| Invoices | `invoiceBuilder.test.js`, `invoiceRenderer.test.js`, `issuedInvoices*.test.js` |
| Production runtime | `productionRuntime.test.js`, `routingReliability.test.js`, `integrationReadiness.test.js` |

The suite runs against the in-memory persistence layer with `NODE_ENV=test`.

## What these tests newly assert

- A CA decision requires an active professional profile, an active assignment, a real
  task and a task/business match.
- An approval without a CA profile (for example a platform administrator) is rejected.
- Evidence fingerprints are deterministic and change when documents, extractions or the
  preparation change.
- Prior approvals are invalidated by material changes.
- Task status changes follow an explicit transition table; terminal states cannot
  re-open.
- Production refuses to start without `DATABASE_URL`, `JWT_SECRET` and an app origin.
- Rate limiting returns 429 with `Retry-After`; the origin guard blocks foreign
  origins while exempting webhooks and safe methods.
- Approval status derivation covers all twelve states, including invalidation
  outranking an already-authorized submission.
- A business owner sees the assigned professional and the evidence reference; an
  unassigned or unverified professional cannot open the task at all.
- Changing an extraction after approval makes the stored approval stale and the
  next action "resubmit for review".
- Execution authorization is refused while the backing approval is invalid.
- A re-approval becomes the current approval while the invalidated one stays in
  history.

## Known gaps

- **No database-backed integration tests in CI.** The suite exercises the in-memory
  path, so migrations and SQL-specific behaviour are not covered automatically. Run the
  suite against a disposable MySQL instance (`docker-compose up -d db`) before release.
- **No browser/E2E runner** (no Playwright/Cypress). The journeys in the product
  requirements are covered at the API/service level and manually, not by a headless
  browser in CI.
- **No malware-scanning test** because scanning is not implemented.
- External providers (GSTN, Razorpay, SMTP, Gemini) are tested through their boundaries
  and failure handling, not against live accounts.

## Adding tests

Prefer service-level tests for authorization and arithmetic, and route-level tests for
validation and status codes. Every new rule that protects money, approvals or tenant
data should ship with a negative test that proves the attack is rejected.

## Database and browser suites

```bash
# in-memory unit/integration suite (default)
npm test

# real MySQL: migrations, persistence and genuine concurrent decisions
# requires a disposable database with migrations applied
DATABASE_URL=mysql://root:...@127.0.0.1:3307/prava_test npm run test:mysql

# browser flows (seeds its own isolated workspace)
DATABASE_URL=mysql://root:...@127.0.0.1:3307/prava_test npm run test:e2e

# schema ↔ database agreement (tables, columns, nullability, enum values)
DATABASE_URL=mysql://... npm run db:drift
```

Playwright needs `npx playwright install chromium` once. The E2E setup seeds a workspace,
signs session cookies with the same JWT secret the server uses, and deletes the previous
run's rows first. It does not use a test-only login backdoor.

### Verified in this pass

- Fresh MySQL 8.0.46: 21 migrations, 37 tables, no drift, idempotent re-run.
- Upgrade from a database at `0014` through `0020`: clean, no drift.
- `approvalConcurrency.mysql.test.js`: two simultaneous decisions → one 200 and one 409,
  exactly one observation, task version advanced once.
- Playwright: owner status → approval → evidence change → invalidation → re-approval;
  CA queue inspection, change request and approval; unassigned CA, outsider, cross-tenant,
  expired session, concurrent HTTP decisions, duplicate authorization request, failed
  approval request, narrow viewport.
- Screenshots are written to `e2e/screenshots/` for layout review.

### Note on running everything with `DATABASE_URL`

Most unit suites seed the in-memory store and are not written for SQL. Setting
`DATABASE_URL` for the full Vitest run therefore fails those files; it is not a database
result. Use `test:mysql` and `test:e2e` for persistence behaviour.
