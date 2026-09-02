# 📧 EmailPro — High-Volume Email Marketing Infrastructure System

> **Skill Test Submission** — Email Marketing Engineer (Infrastructure-Focused)

A production-grade, high-volume outbound email POC built with Node.js, BullMQ, MySQL, Redis, and React. Implements all six required infrastructure components: email pipeline, queueing, domain/IP rotation, personalization, bounce handling, and reputation management.

---

## 🚀 Live Demo

> 🔗 **Hosted UI:** _[Add your deployment URL here]_
>
> Demo credentials — Register a new account on the hosted UI.

---

## 🏗️ Architecture

![EmailPro Architecture Diagram](./docs/architecture.png)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Dashboard (Frontend)                   │
│         Upload CSV · Manage Campaigns · Monitor Queue · Analytics   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ HTTP /api/*  (JWT Auth)
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Express API Server (Node.js)                     │
│  /campaign/create  /queue/*  /domains/*  /logs/*  /webhook/*        │
└────────┬────────────────────────────────────────┬───────────────────┘
         │ INSERT recipients                       │ READ/WRITE
         │ ADD jobs to queue                       ▼
         ▼                              ┌──────────────────┐
┌─────────────────┐                    │  MySQL Database  │
│  BullMQ Queue   │◄── Redis ──────────│  users           │
│  (email-queue)  │                    │  campaigns       │
└────────┬────────┘                    │  recipients      │
         │ process job                 │  logs            │
         ▼                             │  domains         │
┌─────────────────────────────────────│  suppression_list│
│         Email Worker Process        │  email_stats     │
│                                     └──────────────────┘
│  1. Rate limit check (N emails/min)
│  2. Personalize subject + body  {{name}}, {{email}}, etc.
│  3. Domain rotation → pick best active domain by reputation
│  4. Send via Nodemailer SMTP (AWS SES / Gmail / SendGrid)
│  5. Update DB: recipient status, campaign counters, daily stats
└─────────────────────────────────────────────────────────────────────┘
         │ Delivery result
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│            Webhook Handler  POST /api/webhook/email-status          │
│         (AWS SES SNS · SendGrid · Custom format)                    │
│                                                                     │
│  Bounce  ──► Update recipient + log ──► Hard bounce? Auto-suppress  │
│  Complaint ► Update recipient + log ──► Auto-suppress + reduce rep  │
│  Open ─────► Update opened_at + email_stats                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Features Implemented

| Requirement | Implementation |
|---|---|
| **Email Sending Pipeline** | Nodemailer SMTP — supports AWS SES, Gmail, SendGrid |
| **Queueing System** | BullMQ + Redis — persistent, retryable, rate-limited job queue |
| **Domain & IP Rotation** | Selects domain with highest reputation score + lowest daily usage |
| **Personalization Engine** | `{{variable}}` tags replaced from CSV columns per recipient |
| **Bounce & Complaint Handling** | Webhook handler auto-suppresses hard bounces + complaints |
| **Reputation Management** | Sender score, domain scores, inbox/spam ratio, 30-day trend |
| **CSV Upload** | Parse any CSV with email + name + custom columns |
| **Frontend Dashboard** | React + Vite + Tailwind — realtime queue, charts, full CRUD |

---

## 🛠️ Tech Stack

**Backend**
- Node.js + Express
- MySQL (mysql2 with connection pooling)
- Redis (ioredis)
- BullMQ (job queue + worker)
- Nodemailer (SMTP email sending)
- JWT (authentication)
- Multer (CSV file upload)

**Frontend**
- React 18 + Vite
- Tailwind CSS
- Recharts (analytics charts)
- Lucide React (icons)
- React Hot Toast (notifications)
- Axios (HTTP client with JWT interceptors)

---

## 📁 Project Structure

```
interview-test/
├── backend/
│   ├── app.js                    # Express app setup
│   ├── server.js                 # Entry point
│   ├── config/
│   │   ├── database.js           # MySQL connection pool
│   │   └── redis.js              # Redis connection (ioredis)
│   ├── controllers/
│   │   ├── authController.js     # Register, login, JWT
│   │   ├── campaignController.js # Campaign CRUD + CSV parse + queue push
│   │   ├── domainController.js   # Domain/IP pool management + rotation
│   │   ├── logController.js      # Bounces, suppression, reputation, analytics
│   │   ├── queueController.js    # BullMQ queue management
│   │   └── webhookController.js  # AWS SES / SendGrid webhook handler
│   ├── models/index.js           # Auto-creates all DB tables
│   ├── queue/emailQueue.js       # BullMQ Queue definition
│   ├── workers/emailWorker.js    # BullMQ Worker — email processor
│   ├── services/
│   │   ├── emailService.js       # Nodemailer SMTP sender
│   │   └── personalizationService.js  # {{variable}} template engine
│   ├── middleware/
│   │   ├── auth.js               # JWT middleware
│   │   └── errorHandler.js       # Global error handler
│   └── utils/csvParser.js        # CSV → recipients array
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx     # KPI cards, line chart, pie chart
│       │   ├── Campaigns.jsx     # Campaign list + status badges
│       │   ├── CampaignDetail.jsx # Recipients table, progress bars, preview
│       │   ├── CreateCampaign.jsx # Form + CSV upload + live email preview
│       │   ├── Queue.jsx         # BullMQ stats, pause/resume/retry/flush
│       │   ├── Domains.jsx       # Domain pool CRUD + reputation bars
│       │   ├── Bounces.jsx       # Bounce events + suppression list
│       │   ├── Reputation.jsx    # Score gauge, inbox/spam pie, trend chart
│       │   └── Personalization.jsx # Template variable tester
│       └── components/
│           ├── Sidebar.jsx
│           ├── TopBar.jsx
│           └── StatCard.jsx
├── database/schema.sql           # Full MySQL schema
├── sample_recipients.csv         # Sample CSV to test with
└── SETUP_GUIDE.md
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Node.js 18+
- MySQL 8+
- Redis (Docker or native)

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd interview-test

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Database Setup
```bash
# In MySQL Workbench or CLI
mysql -u root -p < database/schema.sql
```

### 3. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL password, SMTP credentials, JWT secret
```

### 4. Start Redis
```bash
# Option A: Docker
docker run -d -p 6379:6379 --name emailpro-redis redis:alpine

# Option B: Native (Windows)
redis-server
```

### 5. Start All Services

Open 3 terminals:

```bash
# Terminal 1 — Backend API (port 5000)
cd backend && npm run dev

# Terminal 2 — Email Worker
cd backend && npm run worker

# Terminal 3 — Frontend (port 5173)
cd frontend && npm run dev
```

Open: **http://localhost:5173**

---

## 🔑 Environment Variables

```env
PORT=5000
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=email_marketing

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# SMTP (Gmail, AWS SES, SendGrid)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME=EmailPro
SMTP_FROM_EMAIL=your@gmail.com

# Worker
EMAILS_PER_MINUTE=10
WORKER_CONCURRENCY=2
MAX_RETRIES=3
JOB_BACKOFF_DELAY=2000
```

---

## 📊 Webhook Integration

The system accepts bounce/complaint webhooks from:

- **AWS SES** (SNS notification format)
- **SendGrid** (event array format)
- **Custom** (`{ email, event, bounceType, reason }`)

**Endpoint:** `POST /api/webhook/email-status`

---

## 📄 CSV Format

```csv
email,name,link,company
john@example.com,John,https://example.com,Acme Corp
jane@example.com,Jane,https://example.com,Beta Ltd
```

Any column in the CSV can be used as a `{{variable}}` in the email subject or body.

---

## 🖼️ Screenshots

| Dashboard | Campaigns | Create Campaign |
|---|---|---|
| KPI cards + 30-day chart | Campaign list with status | CSV upload + live preview |

| Queue Monitor | Reputation | Bounces |
|---|---|---|
| Pause/resume/retry | Sender score gauge | Suppression list |

---

## 📝 License

MIT
