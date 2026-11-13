# Prava deployment guide

Use this guide to deploy the application to staging first. Integrations are not
automatically connected by deploying the app; each needs valid credentials and a
successful staging test. The canonical migration and operations instructions are in
[DEPLOYMENT.md](DEPLOYMENT.md).

---

## ⚡ Option 1: 1-Click Deploy on Render (Recommended & Simplest)

Render is the simplest cloud hosting platform for Prava. It automatically builds the Vite frontend and Node.js backend.

### Steps:
1. **Review and push the intended changes**. Do not stage the entire worktree blindly:
   ```bash
   git status --short
   git add <reviewed-files>
   git commit -m "Prepare deployment"
   git push origin main
   ```
   Never commit `.env` or production credentials.
2. **Log into [Render.com](https://render.com)** and click **New +** → **Web Service**.
3. **Connect your GitHub repository**.
4. Use the checked-in `render.yaml`. It configures:
   - **Environment**: `Node`
   - **Build Command**: `npm ci --include=dev --legacy-peer-deps && npm run build`
   - **Pre-deploy Command**: `npm run db:migrate`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/ready`
5. Provision a managed MySQL database. MySQL is required; Render's service definition
   does not provision one.
6. In Render's **Environment** tab, set `DATABASE_URL`, `APP_URL`, and `APP_ORIGIN` to
   the database connection string and exact public HTTPS origin. Render generates
   `JWT_SECRET` from the Blueprint. Set an `ADMIN_LOGIN_PASSWORD` and only the optional
   integration credentials you intend to use. Refer to [ENVIRONMENT.md](ENVIRONMENT.md)
   for the complete variable list. Enter secrets directly in Render; do not copy the
   local `.env` file.
7. Deploy to staging. The pre-deploy step applies checked-in migrations; deployment
   stops if they fail. Verify `/api/ready` returns 200 before accepting traffic.

### Plan payments and gift upgrades

Plan checkout requires persistent MySQL storage and these server-only environment variables:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Use Razorpay test credentials first and configure the webhook at
`https://<your-host>/api/billing/webhooks/razorpay` for `payment.captured`. Apply
schema changes using `npm run db:migrate`, not `npm run db:push`. In **Admin → Billing &
Plans**, configure a positive price and monthly/yearly period for each paid plan; the
amount is entered in the currency's minor unit (for INR, paise). Each checkout is a
one-time payment for the selected period (no automatic renewal). Google Pay may appear
as a UPI method when enabled for the merchant account and supported by the customer's
device and region.

---

## 🚂 Option 2: Deploy on Railway

Railway offers continuous deployment with zero downtime and built-in MySQL support.

### Steps:
1. **Log into [Railway.app](https://railway.app)**.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically pick up `railway.json` and `Procfile`.
5. Provision MySQL and set `DATABASE_URL` in the service variables; the database is
   required.
6. Set the required production variables and optional integration secrets directly in
   Railway's **Variables** tab. Never paste `.env` into the repository.
7. Configure a one-off/release step to run `npm run db:migrate` before starting the new
   version, and use `/api/ready` for readiness.

---

## 🐳 Option 3: Docker / VPS (Ubuntu, Debian, AWS EC2, DigitalOcean)

Run anywhere using the production Docker image.

### Steps:
1. Build the Docker container:
   ```bash
   docker build --target migrator -t prava-migrator .
   docker run --rm --env-file .env.production prava-migrator
   docker build -t prava-cloud:latest .
   ```
2. Run the container:
   ```bash
   docker run -d \
     --name prava \
     -p 3000:3000 \
     --env-file .env.production \
     prava-cloud:latest
   ```
3. Test the running container:
   ```bash
   curl -f http://localhost:3000/api/ready
   ```
   Keep `.env.production` out of source control. The `migrator` target runs migrations
   separately from the production runtime image.

---

## 🔑 Crucial Step for Google OAuth in Production

When your app is deployed to a live URL (e.g. `https://prava.onrender.com`):

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Select your OAuth 2.0 Client ID.
3. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   - `https://your-app-name.onrender.com`
4. Under **Authorized redirect URIs**, click **+ ADD URI** and add:
   - `https://your-app-name.onrender.com/api/auth/google/callback`
5. Click **Save**, then test sign-in on staging. Set `GOOGLE_CLIENT_ID` and
   `VITE_GOOGLE_CLIENT_ID` in the hosting provider; set server-side OAuth variables only
   if that flow is enabled.

---

## 🛡️ Cloud Verification Checklist

| Service | Required setup | Status |
| :--- | :--- | :--- |
| **Database** | Managed MySQL, migrations, drift check | Required; verify on staging |
| **Email & OTPs** | Verified SMTP credentials and sender | Optional until configured and tested |
| **Document storage** | Private Supabase bucket and server-side service key | Optional until configured and tested |
| **Tax knowledge RAG** | Weaviate endpoint and API key | Optional; connection must be tested |
| **Google sign-in** | Client IDs plus production origins/callback | Optional; verify on staging |
| **AI OCR / assistant** | Gemini key or reachable hosted model | Optional; provider calls must be tested |
| **Billing** | Razorpay keys and webhook | Optional; test mode first |
