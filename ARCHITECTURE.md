# Architecture

## Runtime shape

A single Node.js process serves both the SPA and the JSON API.

```
browser ──▶ Express (server/_core/index.js)
              ├─ /api/health, /api/ready
              ├─ /api/*  (server/routes/*)  ──▶ server/operations.js, gst*.js, ca*.js …
              ├─ /api/storage/* (signed storage proxy)
              └─ Vite middleware (dev) or dist/public (production)
```

`package.json` builds the client with Vite into `dist/public` and bundles the server
entry with esbuild into `dist/index.js`. `npm start` runs the bundle with
`NODE_ENV=production`.

## Request pipeline

1. `productionRuntimeMiddleware` — request id, baseline headers, `no-store` on API.
2. `securityHeadersMiddleware` — CSP, frame denial, nosniff, referrer policy.
3. JSON/urlencoded body parsing (50 MB ceiling; the upload route enforces 15 MB per document).
4. Rate limiters — tight window on credential endpoints, broad ceiling on the API.
5. `createOriginGuard` — rejects cross-origin cookie-authenticated mutations; payment
   webhooks are exempt.
6. `/api` router → `authenticate` middleware populates `req.user` from the session JWT.
7. Route-level `requireUser` / `requireCa` / `requireAdmin` guards.
8. Service layer (`operations.js`, `caManagement.js`, `gstFiling.js`, …) performs
   tenant checks and writes to the database.

## Persistence

`server/db.js` returns a Drizzle MySQL client when `DATABASE_URL` is set.

- **Production:** `DATABASE_URL` is mandatory. `assertProductionEnvironment()` runs at
  boot and `getDb()` throws rather than silently falling back.
- **Development/tests:** when `DATABASE_URL` is absent, modules use in-memory arrays
  persisted to `.storage_cache/*.json`. This exists purely to make local work and the
  test suite fast; it is not a production store.

Schema: `drizzle/schema.js` (MySQL). Migrations: `drizzle/*.sql` with
`drizzle/meta/_journal.json`.

Core tables: `users`, `businesses`, `businessMembers`, `businessInvitations`,
`documents`, `documentExtractions`, `operationalTasks`, `taskRequirements`,
`gstPreparations`, `gstSubmissionRequests`, `reconciliationItems`, `accountingEntries`,
`actionItems`, `reviewRequests`, `auditEvents`, `caProfiles`, `caAssignments`,
`caAuditObservations`, plus billing tables (`plans`, `subscriptions`, `payments`,
`paymentEvents`, `billingInvoices`).

## Modules

| Area | Files |
| --- | --- |
| Auth | `server/controllers/auth.controller.js`, `server/otpService.js`, `server/adminLogin.js`, `server/caAuth.js`, `server/services/googleAuth.service.js` |
| Tenancy | `requireMember` in `server/operations.js`, membership joins in `server/db.js` |
| Tasks | `server/operations.js`, `server/taskLifecycle.js` |
| GST | `server/operations.js` (preparation), `server/gstFiling.js`, `server/gstInvoiceParser.js`, `server/gstAdmin.js` |
| Direct tax | `server/finance.js`, `server/tdsEngine.js`, `server/intelligenceEngine.js` |
| Documents/OCR | `server/operations.js`, `server/services/ocrService.js`, `server/storage.js`, `server/supabaseStorage.js` |
| CA review | `server/caManagement.js`, `server/caApproval.js`, `server/caEngine.js`, `server/caRag.js` |
| Billing | `server/entitlements.js`, `server/billingPayments.js`, `server/routes/billing.js` |
| Admin | `server/routes/admin.js`, `server/adminSecurity.js` |
| Audit | `auditEvents`, `adminAuditEvents`, `caAuditObservations` |

## Client

`client/src/main.jsx` chooses between the marketing app (`App.jsx` → `Home`) and the
workspace shell (`workspace.jsx` → `WorkspaceApp`) based on the URL path. Both are
wrapped in `DisclaimerGate`, which requires a first-visit acknowledgement of Prava's
scope. Workspace pages live in `client/src/pages/*`; the API client is
`client/src/lib/api.js`.

## Trust boundaries

- The browser is untrusted: role checks are re-evaluated server-side on every request.
- Uploaded documents and OCR output are untrusted input. They inform calculations but
  never set approval state or authorise a filing.
- The LLM/assistant is advisory. It cannot change task status, approvals or filings.
- Filing integrations are outbound boundaries. Without a configured provider the
  workflow stops at "approved, awaiting authorised dispatch".
