# Environment Variables

`.env.example` is the template. Never commit real values.

## Required in production

| Variable | Purpose | Notes |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | Must be `production`. |
| `DATABASE_URL` | MySQL connection | **Mandatory.** Must be a `mysql://.../database` URI; PostgreSQL URLs and Supabase project HTTPS URLs are not database connections for this application. Include TLS options where your provider requires them. |
| `JWT_SECRET` | Session signing | At least 32 characters of random data. Rotating it signs everyone out. |
| `APP_ORIGIN` (or `APP_URL`) | Public origin | Used for OAuth redirects, emailed links and cross-origin mutation checks. |
| `PORT` | Listen port | Defaults to 3000; Render sets 10000. |

The boot check is `assertProductionEnvironment()` in `server/_core/security.js`. It
reports every missing value at once and aborts startup.

## Authentication and email

| Variable | Purpose |
| --- | --- |
| `ADMIN_LOGIN_PASSWORD` | Bootstrap password for the super-administrator portal account |
| `OTP_EXPIRY_MINUTES` | OTP lifetime (default 5) |
| `OTP_RESEND_COOLDOWN_SECONDS` | Minimum gap between OTP sends (default 60) |
| `EMAIL_PROVIDER` | `gmail_api` (default when OAuth credentials exist) or `smtp` |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Gmail API over HTTPS; the refresh token must be granted by the sending account with the `gmail.send` scope |
| `GMAIL_SENDER` | Sending account, defaults to `ambole.rajesh@gmail.com` (mail identity only; the admin login is separate) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `EMAIL_FROM` | SMTP delivery, used when `EMAIL_PROVIDER=smtp` |
| `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` | Optional sender name/address for notification emails |
| `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Optional SMS delivery through Twilio |
| `SMS_API_KEY` | Optional Fast2SMS credential when `SMS_PROVIDER=fast2sms` |
| `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` | Google sign-in |
| `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Only for a server-side OAuth flow |

## Storage

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public key (only if required by your client flow) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Document upload/download. Never expose to the browser. |
| `SUPABASE_BUCKET` | Private bucket name (for example `prava-documents`) |

## Intelligence and OCR

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Cloud vision OCR and assistant |
| `OLLAMA_BASE_URL`, `OLLAMA_MODEL` | Optional Ollama endpoint and model; the endpoint must be reachable from the deployed server (localhost inside a cloud container is not your local machine) |
| `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `WEAVIATE_GRPC_URL` | Optional knowledge-base RAG |

These are optional. Without them the deterministic OCR parser and rules engines still
run; the assistant degrades rather than inventing data.

## Billing

| Variable | Purpose |
| --- | --- |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Checkout order creation |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification |

Without these, billing stays in an explicit non-production state: paid plans remain
locked and no transaction is fabricated.

## Optional / operational

| Variable | Purpose |
| --- | --- |
| `ALLOW_EPHEMERAL_STORAGE` | Development escape hatch only. Setting it to `true` in production is treated as a configuration error. |
| `PUBLIC_APP_URL` | Alternative name for the public origin |

## Development-only behaviour

With no `DATABASE_URL`, development and tests use in-memory stores persisted under
`.storage_cache/`. That directory is git-ignored and must never hold production data.
