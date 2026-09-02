# 🚄 Railway Deployment Guide

Deploy the full EmailPro stack (Backend API + Worker + MySQL + Redis + Frontend) to Railway for free.

---

## Step 1 — Create a Railway Account

1. Go to → https://railway.app
2. Sign up with your GitHub account
3. Create a **New Project**

---

## Step 2 — Deploy MySQL Database

1. Inside your Railway project, click **"+ New Service"**
2. Choose **"Database" → MySQL**
3. Railway will provision a MySQL 8 instance
4. Click the MySQL service → go to **"Variables"** tab
5. Note the `MYSQL_URL` or individual vars (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`)

---

## Step 3 — Deploy Redis

1. Click **"+ New Service"** → **"Database" → Redis**
2. Railway will provision Redis
3. Note the `REDIS_URL` from the Redis service Variables tab

---

## Step 4 — Deploy Backend API

1. Click **"+ New Service"** → **"GitHub Repo"**
2. Select your repo → set **Root Directory** to `backend`
3. Railway auto-detects Node.js and uses `node server.js`
4. Go to **Variables** tab and add ALL of these:

```
PORT=5000
NODE_ENV=production

# Use values from Railway MySQL service
DB_HOST=<from Railway MySQL>
DB_PORT=3306
DB_USER=<from Railway MySQL>
DB_PASSWORD=<from Railway MySQL>
DB_NAME=railway

# Use values from Railway Redis service
REDIS_HOST=<from Railway Redis>
REDIS_PORT=6379
REDIS_PASSWORD=<from Railway Redis (if set)>

# Your JWT secret (any random string)
JWT_SECRET=your_super_secret_production_key_here

# Your SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youremail@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM_NAME=EmailPro
SMTP_FROM_EMAIL=youremail@gmail.com

# Rate limits
EMAILS_PER_MINUTE=10
WORKER_CONCURRENCY=2
MAX_RETRIES=3
JOB_BACKOFF_DELAY=2000

# Frontend URL (add after deploying frontend)
FRONTEND_URL=https://your-frontend.railway.app
```

5. Click **Deploy** → wait for green status
6. Go to **Settings** → copy your Backend public URL (e.g. `https://emailpro-backend.railway.app`)

---

## Step 5 — Deploy Email Worker

1. Click **"+ New Service"** → same GitHub Repo
2. Set **Root Directory** to `backend`
3. **Override Start Command** to: `node workers/emailWorker.js`
4. Add the **exact same environment variables** as the Backend API service (Steps 4)
5. Deploy — this runs the BullMQ worker as a separate process

---

## Step 6 — Run Database Schema

After backend deploys successfully, the `initializeDatabase()` function in `server.js` automatically creates all tables on first startup. ✅ No manual SQL needed.

---

## Step 7 — Deploy Frontend

1. Click **"+ New Service"** → same GitHub Repo
2. Set **Root Directory** to `frontend`
3. Set **Build Command**: `npm run build`
4. Set **Start Command**: `npx serve dist`
5. Add this **Variable**:

```
VITE_API_URL=https://your-backend.railway.app
```
*(Replace with your actual backend URL from Step 4)*

6. Deploy → copy Frontend public URL

---

## Step 8 — Update Backend CORS

Go back to the **Backend API service** Variables:
- Update `FRONTEND_URL` to your actual frontend Railway URL

Then redeploy the backend service.

---

## Step 9 — Verify Deployment

1. Open your **Frontend URL** in browser
2. Register a new account
3. Add a domain in **Domains** page
4. Create a campaign with `sample_recipients.csv`
5. Watch the **Queue** page for live updates

---

## Gmail SMTP Setup (if using Gmail)

1. Enable 2-Factor Authentication on your Google account
2. Go to → https://myaccount.google.com/apppasswords
3. Create an app password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

---

## Troubleshooting

| Problem | Solution |
|---|---|
| DB connection failed | Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` match Railway MySQL vars exactly |
| Redis connection failed | Check `REDIS_HOST` and `REDIS_PORT` from Railway Redis service |
| CORS error in frontend | Make sure `FRONTEND_URL` in backend matches your deployed frontend URL |
| Worker not processing | Make sure worker service has same env vars as API service |
| Emails not sending | Verify SMTP credentials; for Gmail use App Password not account password |
