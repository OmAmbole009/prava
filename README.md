# Prava

Prava is a financial-operations and compliance workspace for Indian businesses. It
collects source documents, extracts financial data, prepares GST and income-tax
workings, and routes high-impact work through a recorded professional (CA) review
before anything can be filed.

Prava is **software**. It is not a law firm, accounting firm or tax authority, and it
does not guarantee compliance outcomes. Every calculation is an estimate until it has
been reviewed and authorised.

## What actually works today

- Email/mobile + OTP authentication, Google sign-in, admin and CA portal logins,
  password reset, session cookies and logout/session revocation.
- Multi-tenant business workspaces with membership roles and server-side tenant checks.
- Document intake (PDF/JPEG/PNG/WebP) with signature validation, OCR/extraction,
  field-level review and correction, duplicate detection and ledger posting.
- GST preparation tasks with requirement checklists, reconciliation items and a
  transparent CGST/SGST/IGST/ITC breakdown. Filing is only reachable through an
  independent workspace-admin approval plus a configured authorised provider; no
  government portal is connected.
- Income-tax, TDS, health-score, AR/AP and invoice-studio calculation modules.
- Professional (CA) review queue with evidence binding, approval invalidation and an
  append-only observation history.
- Billing plans with Razorpay verification (checkout stays locked until a verified
  provider event arrives; no invented transactions).
- In-app notifications, reminders and email templates.

## Stack

- React 19 + Vite 7 + Tailwind 4 (client)
- Express 4 (server), Zod validation
- Drizzle ORM + MySQL (production), JSON-file fallback (development only)
- Vitest for automated tests

## Getting started

```bash
npm install --legacy-peer-deps
cp .env.example .env        # then fill in local values
npm run dev                 # http://localhost:3000
```

Without `DATABASE_URL` the server runs in development in-memory mode and persists to
`.storage_cache/`. **Production refuses to start without `DATABASE_URL`, `JWT_SECRET`
and `APP_ORIGIN`/`APP_URL`.**

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Server + Vite dev middleware |
| `npm run build` | Build the client and bundle the server |
| `npm start` | Run the production bundle |
| `npm test` | Run the Vitest suite |
| `npm run db:push` | Generate and apply Drizzle migrations |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the system is put together
- [SECURITY.md](SECURITY.md) — security model and implemented controls
- [CA_WORKFLOW.md](CA_WORKFLOW.md) — professional review and approval lifecycle
- [FINANCIAL_RULES.md](FINANCIAL_RULES.md) — calculation scope and sources
- [DEPLOYMENT.md](DEPLOYMENT.md) — deployment, migrations and rollback
- [ENVIRONMENT.md](ENVIRONMENT.md) — every environment variable
- [TESTING.md](TESTING.md) — tests, how to run them, and known gaps
- [OPERATIONS.md](OPERATIONS.md) — monitoring, backups and incident response
- [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) — release checklist and blockers
