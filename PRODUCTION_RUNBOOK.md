# Prava Production Operations Runbook

## Purpose and operating boundary

Prava is an India-first financial-operations workspace. It prepares, reconciles, and routes evidence for review; it does **not** invent financial values, represent a government filing as completed without an authorized submission provider, or replace professional judgement. The production operator must preserve those boundaries in every incident response, release, and customer communication.

| Area | Production position | Operator action |
|---|---|---|
| Document handling | Source evidence is retained and reviewable. | Never create sample customer documents, balances, transactions, or reviews in a live workspace. |
| GST workflows | Prepared and submission-pending are distinct from submitted. | Enable official submission only after an authorized provider integration and verification controls are active. |
| Payments | Razorpay remains credential-gated. | Do not expose checkout until live keys, webhook verification, and operational reconciliation are complete. |
| Professional review | Review requests are advisory workflow controls. | Do not present an automated result as professional advice or a completed statutory filing. |

## Health, readiness, and incident triage

The application exposes a liveness route at `GET /api/health` and a dependency-aware readiness route at `GET /api/ready`. Both responses include no sensitive values. The readiness route checks the persistence connection before returning `200`.

| Signal | Meaning | First response |
|---|---|---|
| `/api/health` fails | Application process is unavailable. | Check deployment/runtime logs and roll back to the most recent healthy checkpoint if recovery is not immediate. |
| `/api/ready` returns `503` | The process is live but cannot confirm database readiness. | Pause administrative writes, investigate database connectivity, and keep users informed through the recovery view. |
| `X-Request-Id` in an error response | Correlates a user-visible failure with server logs. | Record the identifier and timestamp before retrying or escalating. |
| Repeated `401`/`403` | Session or role boundary is working but access is absent. | Confirm the intended identity, role, and workspace membership; never bypass role checks. |

## Release procedure

1. Run `pnpm test`, `pnpm check`, and `pnpm build` from the project root.
2. Review all generated migration SQL. Apply only additive, reviewed migrations in dependency order and verify the schema afterward.
3. Smoke-test `/`, `/admin/login`, `/api/health`, `/api/ready`, a public missing asset, and an authenticated workspace route.
4. Validate desktop and mobile layouts, keyboard navigation, visible focus treatment, and the reduced-motion path.
5. Save a checkpoint before publishing. Use the platform’s **Publish** control only after the checkpoint is available.

## Authentication and administrator operations

The local administrator password is stored as a server-side secret or a salted credential hash after rotation; it is never placed in client code or audit metadata. Administrator actions create audit events. Invitations create an expiring link but do not create a user; acceptance requires authentication with the invited email.

> If administrator access is suspected to be compromised, rotate the password from **Access & audit**, revoke outstanding invitations, review the audit history, and remove unneeded workspace roles before resuming privileged changes.

## Data protection and recovery

Source documents are tenant-scoped. Do not download, move, or manually duplicate them during troubleshooting unless the user has explicitly authorized the exact operational step. Database changes should be additive whenever feasible. The database itself is not automatically recoverable; use checkpoints for application recovery and make schema changes only after review.

## Customer-facing recovery guidance

The application exposes a safe recovery screen for unexpected browser failures and does not display internal stack traces to customers. When responding to an incident, ask the customer for the visible request reference and the route they were using. Do not request passwords, raw financial documents, or full payment details through ordinary support messages.
