## Complete Step-by-Step Setup Guide

---

## Prerequisites

### 1. MySQL — Already done ✅
You have MySQL installed. Run `database/schema.sql` in MySQL Workbench.

---

### 2. Redis — REQUIRED for Email Queue

Redis is mandatory because BullMQ (the email queue) uses it as its data store.

---

#### OPTION A: Docker Desktop (Easiest on Windows)

**Step 1:** Download Docker Desktop
→ https://www.docker.com/products/docker-desktop/
→ Install and restart PC

**Step 2:** Open Docker Desktop from Start Menu
→ Wait for green "running" status in system tray

**Step 3:** Open PowerShell or CMD (any folder) and run:
```
docker run -d -p 6379:6379 --name emailpro-redis redis:alpine
```

**Step 4:** Verify Redis is running:
```
docker ps
```
You should see `emailpro-redis` listed.

---

#### OPTION B: Native Redis for Windows (No Docker needed)

**Step 1:** Download from:
→ https://github.com/microsoftarchive/redis/releases
→ Choose: Redis-x64-3.0.504.msi

**Step 2:** Install it (check "Add to PATH")

**Step 3:** Open PowerShell and run:
```
redis-server
```
Keep this terminal open.

---

#### OPTION C: WSL2 / Ubuntu Terminal

```bash
sudo apt-get install redis-server
sudo service redis-server start
redis-cli ping   # Should output: PONG
```

---

## Full Startup Sequence

Open **3 separate terminals** and run these in order:

### Terminal 1 — MySQL
Make sure MySQL service is running (Windows Services or XAMPP)

### Terminal 2 — Redis
Either Docker Desktop is running (Option A) OR redis-server is running (Option B/C)

### Terminal 3 — Backend API
```bash
cd backend
npm run dev
```
Expected output:
```
✅ MySQL connected successfully
✅ All database tables initialized
✅ Redis connected successfully
✅ Server running on http://localhost:5000
```

### Terminal 4 — Email Worker
```bash
cd backend
npm run worker
```
Expected output:
```
✅ MySQL connected successfully
✅ Redis connected successfully  
🚀 Email worker started (10 emails/min, concurrency: 2)
```

### Terminal 5 — Frontend
```bash
cd frontend
npm run dev
```
Expected output:
```
VITE v5.x.x  ready in Xms
➜  Local:   http://localhost:5173/
```

---

## Configure Your .env

Edit `backend/.env` before starting:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE   ← Change this
DB_NAME=email_marketing

JWT_SECRET=any_random_string_here       ← Change this

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youremail@gmail.com
SMTP_PASS=your_gmail_app_password
```

---

## First Time Use

1. Open → http://localhost:5173
2. Click **Register** → create your account
3. You're in the Dashboard!
4. Upload `sample_recipients.csv` when creating a campaign
