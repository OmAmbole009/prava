# Deployment

The application is a single Node.js service with a static SPA build. Any host that can
run `npm start` behind HTTPS works. `npm run build` uses Vite and other development
dependencies to create `dist/public` and `dist/index.js`. The production server serves
the built static files without importing Vite; Vite and `vite.config.js` are loaded
dynamically only by the development-only `setupVite()` path.

## Preconditions

Provide at minimum `NODE_ENV=production`, a MySQL `DATABASE_URL`, `JWT_SECRET` (32+
characters) and `APP_ORIGIN`/`APP_URL`. The server rejects non-MySQL database URLs
before accepting traffic.

## 1. Database

```bash
# development: generate SQL from drizzle/schema.js, then apply
npm run db:push

# production: apply checked-in migrations only
npm run db:migrate
```

Migrations are ordered SQL files in `drizzle/` tracked by `drizzle/meta/_journal.json`.
Run them against a snapshot or staging database first. Do not generate schema changes
from production data.

Never edit an applied migration. Add a new one.

The runtime driver, Drizzle schema, and all checked-in migrations use MySQL. Set
`DATABASE_URL` to the managed MySQL provider's connection URI
(`mysql://user:password@host:3306/database`), not to a Supabase project HTTPS URL or
a PostgreSQL connection URI. Supabase Storage variables are separate and do not provide
the relational database connection. If production data currently lives in PostgreSQL,
back it up and perform a deliberate data migration into MySQL before switching the
application; do not simply replace the URL or drop the existing database.

## 2. Environment

Set secrets in the hosting provider, not in the image or repository. Use different
credentials for staging and production. See [ENVIRONMENT.md](ENVIRONMENT.md).

## 3. Build and run

```bash
npm ci --include=dev --legacy-peer-deps
npm run build
npm start
```

The explicit `--include=dev` is required during build because Vite, its plugins, and
Drizzle Kit are development dependencies. The final Docker runtime installs production
dependencies only; it does not need Vite or its plugins.

### Docker

```bash
# Run migrations as a one-off job before deploying the application image.
docker build --target migrator -t prava-migrator .
docker run --rm --env-file .env.production prava-migrator

docker build -t prava:latest .
docker run -d --name prava -p 3000:3000 --env-file .env.production prava:latest
curl -f http://localhost:3000/api/ready
```

The `migrator` target contains the migration CLI and SQL files; the final runtime image
contains only production dependencies and built assets. `.dockerignore` excludes local
environment files and `.storage_cache`.

### Render

`render.yaml` installs the build dependencies, applies checked-in migrations in
`preDeployCommand`, and uses `/api/ready` as its health check. Supply `DATABASE_URL`,
`APP_URL`/`APP_ORIGIN`, and credentials for the integrations you intend to enable in
Render's environment settings. Render runs migrations before starting the new service;
a failed migration prevents that deploy from proceeding. The pre-deploy migration and
runtime both read the same `DATABASE_URL` setting.

### Railway / VPS

`railway.json` and `Procfile` are present. Provision MySQL (it is required), provide the
same production variables, and configure a release/one-off migration step to run
`npm run db:migrate` before starting the new version. Terminate TLS at the proxy and
forward `X-Forwarded-Proto`.

## 4. Health checks

- `GET /api/health` — process liveness (no database dependency)
- `GET /api/ready` — readiness; returns 503 when the database is unreachable

Point the platform health check at `/api/ready` where dependency failure should remove
the instance from rotation, and `/api/health` where it should only restart a dead
process.

## 5. Post-deploy verification

1. `/api/health` returns 200 and logs show no configuration error.
2. A sign-in completes, including the OTP step.
3. An authenticated dashboard request returns tenant data only for that tenant.
4. A document upload reaches `needs_review`/`extracted`.
5. A CA decision is rejected for an unassigned professional (negative check).
6. `Cache-Control: no-store` and CSP headers are present on API and HTML responses.
7. Dependency health (`/api/ready`) is 200.

Do not treat a successful build as a successful deployment.

## 6. Rollback

- Redeploy the previous image/tag or previous commit. The runtime is stateless.
- Migrations are additive; rolling back code while keeping new nullable columns is safe.
- If a migration must be reversed, write a forward "down" migration that drops only the
  added columns/index — do not delete data.
- Rotate `JWT_SECRET` only deliberately: it ends all sessions.

## 7. Backups and restore

- Enable automated daily MySQL snapshots plus point-in-time recovery where available.
- Back up the object-storage bucket (or enable versioning) on the same schedule.
- Test restore quarterly into a staging database and record the date in the operations
  log. A backup that has never been restored is not a backup.

## 8. Scheduled work

Reminder and notification jobs are driven by the application (`server/routes/reminders.js`,
`server/operations.js`). If you run more than one instance, schedule them once (a
separate worker or a leader-only cron) to avoid duplicate emails.

## 9. Integrations requiring credentials

GST filing, Google sign-in, SMTP, Supabase, Razorpay, Gemini/Ollama and Weaviate all
need credentials or manual onboarding. Until configured, the corresponding feature
stays in its documented non-production state and must not be presented as connected.

## 8. Migrations 0015–0020 (required)

These are not optional schema tweaks:

| Migration | Purpose |
| --- | --- |
| `0015_ca_core_tables` | Creates `caProfiles`, `caCredentials`, `caAssignments`, `caAuditObservations` — previously only in the schema |
| `0016_ca_evidence_binding` | Adds fingerprint/invalidation columns and indexes (guarded, safe on pushed databases) |
| `0017_approval_concurrency_and_indexes` | Adds `operationalTasks.version` and the evidence indexes |
| `0018_missing_ca_and_otp_tables` | Creates `otpChallenges` so OTP sign-in works |
| `0019_user_local_auth_columns` | Adds `users.phone`, `passwordHash`, `passwordSalt` |
| `0020_user_role_ca_enum` | Allows `users.role = 'ca'` |

Order matters: the CA tables must exist before the evidence-binding and index migrations.
Apply with `npm run db:migrate` (never destructive), then verify:

```bash
# Set DATABASE_URL in your environment/secret manager before running this check.
npm run db:drift
curl -fsS https://your-host/api/ready
```

The drift check must print "No schema drift detected." Check the command exit code and
migration count rather than relying on the last console line.

### MySQL integration tests

Use a dedicated disposable MySQL database with a name ending in `_test`. These tests
are explicitly gated so they cannot accidentally run against the production database:

```bash
MYSQL_INTEGRATION_TESTS=1 DATABASE_URL=mysql://.../prava_test npm run test:mysql
```

The suite exercises MySQL-backed registration, password lookup/login, database-backed
OTP verification, business membership persistence, CA approval concurrency and GST
workflow persistence. Apply the checked-in migrations to the test database first with
`npm run db:migrate`.

## 9. Graceful shutdown

The server handles `SIGTERM`/`SIGINT`: it stops accepting connections, waits for in-flight
requests (15s deadline), then closes the MySQL pool. Give the platform a termination grace
period of at least 20 seconds.
