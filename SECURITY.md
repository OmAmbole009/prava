# Security Model

Prava handles confidential business and financial information. This document describes
the controls that exist in the code, and the gaps that remain.

## Authentication

- Email or mobile + password, followed by a one-time code (`server/otpService.js`).
  OTPs are stored hashed with a salt, expire, are attempt-limited and are
  single-use; resend cooldowns prevent flooding.
- Passwords are hashed with `scrypt` (64-byte derived key, per-user 16-byte salt) and
  compared with `timingSafeEqual`. No plaintext password is stored or returned.
- Password reset uses a single-use, expiring OTP flow; the new password must meet the
  strength policy and differ from the current one.
- Google OAuth is supported when configured; the OAuth `state` nonce is bound to a
  one-time cookie (`server/_core/oauth.js`).
- Admin and CA portals have dedicated login endpoints with per-IP attempt throttling
  (`server/adminLogin.js`, `server/caAuth.js`).
- Sessions are signed JWTs delivered as `httpOnly` cookies
  (`server/_core/cookies.js`): `sameSite=lax` over HTTP, `sameSite=none; secure` over
  HTTPS. Logout clears the cookie and revokes the session server-side.
- CA sessions are rejected immediately when the professional profile is suspended or
  revoked.

**Not implemented:** optional TOTP/WebAuthn two-factor authentication. CA and admin
2FA is recommended before handling real client data.

## Authorization and tenancy

- `authenticate` populates `req.user`; `requireUser`, `requireCa` and `requireAdmin`
  guard routes. Frontend rendering is never the control.
- Business-scoped queries join `businessMembers` and assert the caller's membership
  (`requireMember`), so a task, document, action item or reconciliation row cannot be
  fetched across tenants.
- CA decisions re-verify profile status, assignment and task→business linkage
  (`authorizeCaReview`).
- A platform administrator cannot record a professional decision without a CA profile.
- A submission requester cannot approve their own request
  (`canIndependentlyApproveSubmission`).

## Transport, headers and browser hardening

`server/_core/security.js`, applied in `server/_core/index.js`:

- Content-Security-Policy (`default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`, Google OAuth/fonts allow-listed;
  `unsafe-eval` only in development for Vite HMR)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy`,
  restrictive `Permissions-Policy`
- HSTS when the request is HTTPS; `Cache-Control: no-store` on all API responses
- `X-Powered-By` disabled; `trust proxy` enabled so protocol/IP are derived correctly
  behind a reverse proxy

### CSRF

Because session cookies are used, state-changing requests are protected in depth:

1. `createOriginGuard` rejects `POST/PUT/PATCH/DELETE` whose `Origin` is neither the
   request host nor a configured `APP_ORIGIN`/`APP_URL`. Payment webhooks are exempt
   (they are verified by signature instead). Requests without an `Origin` header
   (server-to-server clients) are allowed and must authenticate with a session.
2. `sameSite` cookies limit cross-site sending.
3. Mutations are JSON-only; there are no HTML form posts to the API.

## Rate limiting and abuse protection

- Credential endpoints: 30 requests / 15 min / IP.
- Document and invoice routes: 120 / min / IP.
- Whole API: 600 / min / IP.
- `RateLimit-*` and `Retry-After` headers are returned; 429 responses are structured.
- Login endpoints additionally apply per-account/per-IP failure windows.

The limiter is in-process memory. **A multi-instance deployment must move this to
shared storage** (Redis or the edge proxy) or limits apply per instance.

## Input validation and injection

- Every route parses input with Zod schemas (types, lengths, enums, numeric bounds).
- Database access goes through Drizzle ORM with bound parameters — no string-built SQL.
- Outputs are JSON; React escapes rendered text. No `dangerouslySetInnerHTML` is used
  for user content.
- File names are sanitised before storage-key construction, preventing traversal.
- Uploads are capped at 15 MB per document and restricted to PDF/JPEG/PNG/WebP with
  MIME + magic-byte checks; uploads are stored, never executed.
- Request bodies are capped at 50 MB.

## Secrets

- No credentials belong in source control; `.env` is git-ignored and `.env.example`
  holds placeholders only.
- Configure secrets through the hosting provider's secret store.
- Rotate `JWT_SECRET` (invalidates sessions), database credentials, SMTP app password,
  Razorpay keys/webhook secret, Supabase service role key and AI provider keys on a
  schedule and immediately after suspected exposure.

## Data protection

- Production requires MySQL (`DATABASE_URL`); the JSON-file fallback is refused at boot.
  Encrypt the database volume/storage at rest and require TLS in the connection string.
- Documents live in object storage behind a signed-URL proxy; buckets should be private.
  Signed URLs are short-lived.
- API responses containing tenant data are `no-store`.
- Error responses expose only a generic message plus a request id; stack traces are
  logged server-side, never returned.

## Audit

Security-relevant events (login, CA decisions, document review, submission requests,
provider dispatch, administrative CA changes, billing events) are written to
`auditEvents` / `adminAuditEvents` / `caAuditObservations`. Professional observations
are append-only and carry an evidence fingerprint; invalidation marks validity rather
than deleting history.

## Known gaps

- No malware scanning of uploads (a ClamAV/object-scanning hook is the recommended next
  step before accepting untrusted third-party documents at scale).
- No TOTP/WebAuthn 2FA.
- Rate limiting is per instance.
- No automated dependency CVE gate in CI; run `npm audit` and pin/upgrade deliberately.
- Email verification exists as an OTP challenge; there is no long-lived
  "email verified" badge on the profile.

See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for release blockers.

## Concurrency and decision integrity

Professional decisions are serialised by a database transaction that locks the task row
(`SELECT ... FOR UPDATE`). `operationalTasks.version` is an optimistic concurrency token:
the reviewer may send `expectedVersion`, and a request is rejected with 409 when the task
changed after inspection. Only one decision can commit per version; the observation, task
version, review-request status and preparation status commit together or roll back
together. The development store serialises decisions per task so local mode cannot
double-approve.

## Tenant isolation parity

The development store now applies the same boundary as MySQL: access requires either the
workspace owner or an active membership row. There is no shared-demo or administrator
bypass, and task reads, document reads and action-item resolution all run the check. This
closed a gap where local mode could read another business's records.

## Dependency posture

`npm audit --omit=dev` reports 9 advisories (6 low, 2 moderate, 1 high) after this pass.
Fixed here: `proxy-addr` (critical — IP spoofing through IPv4-mapped IPv6, relevant because
rate limiting keys on client IP), `dompurify` (critical — DOM XSS), `body-parser` (high —
DoS), `zod` (high — memory exhaustion), `follow-redirects` (high — header leakage).
Remaining: `drizzle-orm` 0.44.x has an identifier-escaping advisory whose fix is a breaking
upgrade; it must be scheduled with a re-run of the database suites. No secrets are involved
in any of these.
