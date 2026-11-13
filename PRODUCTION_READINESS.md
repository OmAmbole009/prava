# Production Readiness

Status legend: ✅ implemented and verified in this repository · ⚠️ implemented but not
exercised in this environment · ⛔ requires external credentials or manual work · ❌ not
implemented.

## Verified in this session

- ✅ `npm test` — **45 files, 330 tests passing, 3 skipped** (the MySQL-only file skips
  without `DATABASE_URL`).
- ✅ MySQL 8.0.46, disposable Docker instance: **21 migrations applied from empty**, 37
  tables, `npm run db:drift` reports **no schema drift**.
- ✅ Upgrade path: a database migrated only through `0014` upgrades cleanly through
  `0020`; re-running `drizzle-kit migrate` is a no-op.
- ✅ `npm run test:mysql` — real-database persistence and concurrency suites pass.
- ✅ `npm run test:e2e` — **12 Playwright tests passing** against a real server + MySQL.
- ✅ `NODE_ENV=production npm run build` — client and server bundles build.
- ✅ `npm audit --omit=dev` — reduced from 14 to **9 (6 low, 2 moderate, 1 high)**; the
  critical `proxy-addr` and `dompurify` advisories are fixed.
- ✅ Production configuration fail-fast, CSP/headers, rate limiting, origin guard — unit
  tested.
- ✅ CA authorization, evidence binding, invalidation and concurrency — unit + database +
  browser tested.

## Application

| Item | Status |
| --- | --- |
| Persistent MySQL schema and migrations | ✅ 21 migrations, fresh install and upgrade verified |
| Schema and database agree | ✅ `npm run db:drift` compares every table/column/enum |
| Production refuses ephemeral storage | ✅ |
| Multi-tenant authorization on business routes | ✅ in-memory and SQL paths; browser tested |
| CA review with attributable audit trail | ✅ |
| Approval bound to reviewed evidence | ✅ fingerprint of documents, extractions, figures |
| Concurrent decisions | ✅ row lock + task `version`, verified with simultaneous requests |
| Approval invalidation on material change | ✅ upload/correction invalidates; re-review creates a new decision |
| Authorization separated from filing | ✅ distinct states; no acknowledgement is fabricated |
| GST preparation and reconciliation | ✅ internally consistent; ⛔ no GSTN integration |
| Income tax / TDS estimation | ✅ labelled estimates |
| Document upload validation (type, size, magic bytes) | ✅ |
| Malware scanning of uploads | ❌ |
| Billing with server-side verification | ✅ boundary; ⛔ needs Razorpay credentials |
| Email delivery | ✅ templates + SMTP transport; ⛔ needs SMTP credentials |
| Two-factor authentication for CA/admin | ❌ |
| Browser E2E automation | ✅ Playwright, 12 flows |

## Deployment

| Item | Status |
| --- | --- |
| Dockerfile (multi-stage, healthcheck) | ✅ |
| Render / Railway configs | ✅ |
| Local MySQL via Docker Compose | ✅ `docker-compose.yml` |
| GitHub Actions CI (install, test, build) | ✅ |
| Migration, rollback, backup docs | ✅ |
| Real staging deployment performed | ❌ not performed here |

## Reliability changes in this pass

1. **Concurrency.** `submitCaDecision` runs in one transaction and locks the task row
   (`SELECT ... FOR UPDATE`). A `version` column is the optimistic token: a decision may
   carry `expectedVersion` and is rejected with 409 when the task moved on. Observation,
   review request, task version and preparation status commit together or not at all. The
   development store serialises decisions per task.
2. **Tenant isolation.** The in-memory store now uses the same rules as SQL: explicit
   owner or active membership, no shared-demo or admin bypass, task/document/action reads
   all go through the membership check.
3. **Migration truth.** Five tables (`otpChallenges`, `caProfiles`, `caCredentials`,
   `caAssignments`, `caAuditObservations`) and three `users` columns existed only in
   `drizzle/schema.js`. They are now created by migrations `0015`–`0020`, and
   `users.role` accepts the `ca` value the schema declares.
4. **Fingerprint scope.** The evidence fingerprint covers substantive evidence only
   (document identity, extracted invoice number and total, prepared figures). Recording a
   decision or advancing a lifecycle state no longer invalidates itself.
5. **Queue correctness.** Business and CA approval lists load review/submission state in
   the same batch as documents and observations, so statuses match what the task page
   shows. `getBusinessApprovalOverview` and `getCaApprovalQueue` perform a constant number
   of queries, accept `limit`/`offset`, and sort deterministically (invalidated and
   awaiting work first for the reviewer).
6. **Operations.** Graceful SIGTERM/SIGINT shutdown drains requests and closes the pool;
   `/api/ready` checks the database; plan seeding is idempotent under concurrent requests.

## Required before handling live client data

1. Deploy to a staging environment with managed MySQL and confirm `/api/ready`, sign-in,
   approval and authorization flows there.
2. Set production secrets in the host's secret manager (never in git).
3. Configure SMTP and verify OTP delivery to a real inbox.
4. Configure private object storage with the service-role key kept server-side.
5. Complete and document the **manual CA verification** procedure for every
   professional; do not present unverified accounts as verified.
6. Enable 2FA for CA and administrator accounts (not implemented).
7. Resolve the remaining `drizzle-orm` advisory by upgrading to the patched line and
   re-running the database suites.
8. Run a restore from a real backup and record the result.
9. Move rate limiting and job state to shared storage before running more than one
   instance.
10. Have a qualified professional review the GST and direct-tax workflows end to end, and
    obtain legal review of the disclaimer, privacy and retention copy.

## Honest limitations of the current product

- **No filing provider.** `authorized_for_execution` records an authorization, not a
  filing. No provider acknowledgement is produced or invented.
- **The full Vitest suite is not dual-mode.** Most unit suites seed the in-memory store and
  are not meaningful against MySQL. Database behaviour is covered by the dedicated
  integration suite (`test:mysql`) and the browser suite; running the whole suite with
  `DATABASE_URL` set fails for those in-memory-oriented files and should not be treated as
  a database result.
- **Notification delivery is not retried in the background.** In-app notifications are
  written transactionally with the decision; email is best-effort and marked `suppressed`
  when SMTP is unavailable.
- **In-memory mode is for development only.** It serialises and enforces tenancy, but it is
  not durable and must never serve production traffic.
- **No load test.** Concurrency correctness is proven; throughput under production load is
  not measured.
