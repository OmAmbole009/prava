# Operations

## Health and monitoring

| Endpoint | Meaning |
| --- | --- |
| `GET /api/health` | Process is alive; returns uptime. Use for restart policy. |
| `GET /api/ready` | Database reachable; 503 when not. Use for load-balancer rotation. |

Monitor:

- HTTP 5xx rate and p95 latency on `/api/*`
- 429 rate (abuse or a too-tight limit)
- `/api/ready` failures
- Database connections, slow queries, disk usage
- Background notification/reminder failures
- Billing webhook failures (`paymentEvents` rows with no `processedAt`)

Every API error is logged with a request id that is also returned to the client, so a
user-reported reference can be traced without exposing internals.

## Logging

- Structured server logs go to stdout/stderr and are collected by the platform.
- Logs must not contain passwords, OTPs, tokens, full card data or document contents.
  If you find such a line, treat it as an incident and rotate the affected secret.
- Keep request ids in logs and in error responses; never log full request bodies for
  financial endpoints.

## Backups

- Daily automated MySQL snapshots + point-in-time recovery.
- Object storage versioning or scheduled bucket copies.
- Retain at least 30 days; align retention with legal and contractual obligations.
- Restore into staging quarterly and record the run. Verify row counts and a document
  download, not just that the dump imported.

## Restore procedure

1. Provision a new database and restore the most recent snapshot.
2. Point a staging deployment at it with production-shaped configuration but **staging
   credentials**.
3. Run `npx drizzle-kit migrate` and confirm the schema version.
4. Verify sign-in, one tenant's tasks, one document download and one CA decision read.
5. Only then repoint production, and rotate any credentials that may have been exposed.

## Secret rotation

| Secret | Effect of rotation |
| --- | --- |
| `JWT_SECRET` | All sessions invalidated; users must sign in again. |
| `DATABASE_URL` credentials | Requires coordinated DB user change and restart. |
| SMTP app password | OTP emails fail until updated. |
| Razorpay keys / webhook secret | Checkout and webhook verification fail until updated; verify with a test payment. |
| Supabase service role key | Uploads/downloads fail until updated. |

Rotate immediately after any suspected exposure, then review `adminAuditEvents` for
unexpected activity.

## Incident response

1. **Contain** — revoke sessions (`JWT_SECRET`), disable the affected CA/admin account
   (`status: suspended`), rotate the exposed credential.
2. **Assess** — use `auditEvents`, `adminAuditEvents`, `caAuditObservations` and
   `paymentEvents` to establish what changed, by whom and when.
3. **Preserve** — snapshot the database and logs before remediation. Audit rows are
   append-only; do not delete them.
4. **Remediate** — deploy a fix, re-run migrations if needed.
5. **Notify** — follow applicable legal/contractual breach-notification duties.
6. **Review** — add a regression test for the failure mode.

## Scaling notes

- The service is stateless; scale horizontally behind a proxy that sets
  `X-Forwarded-Proto`, because secure cookies and HSTS depend on it.
- **Move rate limiting to shared storage** when running more than one instance.
- Run reminder/notification jobs once, not per instance.
- Sizing is dominated by OCR and document processing; offload to a queue if volume grows.

## Scheduled maintenance

- Dependency review and `npm audit` monthly.
- Quarterly backup restore drill.
- Quarterly review of active CA profiles and assignments.
- Review stale approvals (`invalidatedAt`, fingerprint mismatches) and long-blocked tasks.

## Graceful shutdown and database health

- `/api/health` is liveness only; `/api/ready` executes `SELECT 1` and returns 503 when the
  database is unreachable. Point load balancers at `/api/ready`.
- `SIGTERM`/`SIGINT` closes the listener, drains in-flight requests for up to 15 seconds,
  closes the pool and exits. A second signal or the deadline forces exit 1 so restarts are
  not blocked.

## Approval integrity checks

- Task versions advance once per recorded decision. If a client reports repeated 409s,
  someone else is reviewing the same task — reload the evidence rather than retrying the
  stale decision.
- Invalidated approvals are expected after evidence corrections. They are not data loss:
  history is append-only and the invalidation reason is stored with the record.

## Notification delivery (known gap)

In-app notifications are written in the same transaction as the decision. Email is
best-effort and recorded as `suppressed` when SMTP is not configured. There is **no
background retry queue** for failed email; a stuck notification requires a manual resend
job. Add a retry worker before promising email SLAs.

## Restore testing

`/api/ready` proves connectivity, not recoverability. A restore has not been performed
against a real backup in this environment; schedule one and record the RTO/RPO you observe.
