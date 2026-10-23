# 🚀 Prava Financial Cloud — Production Deployment Guide

This guide provides end-to-end instructions to deploy Prava online so all features (Authentication, Gmail SMTP OTPs, Supabase Document Vault, Weaviate Vector RAG, and AI Invoice OCR) work 100% online in the cloud.

---

## ⚡ Option 1: 1-Click Deploy on Render (Recommended & Simplest)

Render is the simplest cloud hosting platform for Prava. It automatically builds the Vite frontend and Node.js backend.

### Steps:
1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure cloud-ready deployment"
   git push origin main
   ```
2. **Log into [Render.com](https://render.com)** and click **New +** → **Web Service**.
3. **Connect your GitHub repository**.
4. Render will automatically detect `render.yaml` or you can manually configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
5. **Add Environment Variables** in Render's **Environment** tab (copy values from your `.env`):
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(A random 64-char string)*
   - `ADMIN_LOGIN_PASSWORD`: *(Your secure admin password from local .env)*
   - `EMAIL_PROVIDER`: `smtp`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_SECURE`: `false`
   - `SMTP_USER`: *(Your Gmail address from local .env)*
   - `SMTP_PASS`: *(Your 16-character Google App Password from local .env)*
   - `SMTP_FROM`: `"Prava Security" <your-email@gmail.com>`
   - `SUPABASE_URL`: *(Your Supabase URL from local .env)*
   - `SUPABASE_SERVICE_ROLE_KEY`: *(Your Supabase Service Role Key from local .env)*
   - `SUPABASE_BUCKET`: `prava-documents`
   - `WEAVIATE_URL`: *(Your Weaviate Cloud URL from local .env)*
   - `WEAVIATE_API_KEY`: *(Your Weaviate API Key from local .env)*
   - `GOOGLE_CLIENT_ID`: *(Your Google Client ID from local .env)*
   - `VITE_GOOGLE_CLIENT_ID`: *(Your Google Client ID from local .env)*
   - `GEMINI_API_KEY`: *(Your Google Gemini API key for online AI Vision OCR & Chatbot)*
   - `APP_URL`: `https://your-app-name.onrender.com`
6. Click **Deploy**. Once deployed, your site is live at `https://your-app-name.onrender.com`!

---

## 🚂 Option 2: Deploy on Railway

Railway offers continuous deployment with zero downtime and built-in MySQL support.

### Steps:
1. **Log into [Railway.app](https://railway.app)**.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically pick up `railway.json` and `Procfile`.
5. *(Optional Database)*: In your Railway project, click **New** → **Database** → **Add MySQL**. Railway will automatically create a `DATABASE_URL` environment variable!
6. In your web service's **Variables** tab, paste the environment variables from your `.env`.
7. Railway will deploy and provide you with a public URL (e.g. `https://prava-production.up.railway.app`).

---

## 🐳 Option 3: Docker / VPS (Ubuntu, Debian, AWS EC2, DigitalOcean)

Run anywhere using the production Docker image.

### Steps:
1. Build the Docker container:
   ```bash
   docker build -t prava-cloud:latest .
   ```
2. Run the container:
   ```bash
   docker run -d \
     --name prava \
     -p 3000:3000 \
     --env-file .env \
     prava-cloud:latest
   ```
3. Test the running container:
   ```bash
   curl http://localhost:3000/api/health
   # Returns: {"status":"ok","uptimeSeconds":12}
   ```

---

## 🔑 Crucial Step for Google OAuth in Production

When your app is deployed to a live URL (e.g. `https://prava.onrender.com`):

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Click on your OAuth 2.0 Client ID (`586322362717-...`).
3. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   - `https://your-app-name.onrender.com`
4. Under **Authorized redirect URIs**, click **+ ADD URI** and add:
   - `https://your-app-name.onrender.com/api/auth/google/callback`
5. Click **Save**. Google OAuth sign-in will now work seamlessly on your live production URL.

---

## 🛡️ Cloud Verification Checklist

| Service | Cloud Provider | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Document Storage** | Supabase Cloud | ✅ Ready | `prava-documents` bucket configured |
| **Email & OTPs** | Gmail SMTP | ✅ Ready | TLS Port 587 with App Password |
| **Tax Knowledge RAG** | Weaviate Cloud | ✅ Ready | AWS Frankfurt cluster active |
| **Single Sign-On** | Google OAuth 2.0 | ✅ Ready | Client ID configured |
| **Vision OCR & AI** | Google Gemini | ✅ Ready | Uses `gemini-2.5-flash` in cloud |
| **State Persistence** | MySQL or JSON Cache | ✅ Ready | Automatic switch to `DATABASE_URL` if present |
