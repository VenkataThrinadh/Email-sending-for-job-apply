# 📧 EmailPro — High-Volume Email Marketing Infrastructure System

> **Skill Test Submission** — Email Marketing Engineer (Infrastructure-Focused)

A production-grade, high-volume outbound email POC built with Node.js, BullMQ, Prisma, MySQL, Redis, and React. Implements all six required infrastructure components: email pipeline, queueing, domain/IP rotation, personalization, bounce handling, and reputation management.

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
         │ INSERT recipients                       │ READ/WRITE via
         │ ADD jobs to queue                       │ Prisma ORM
         ▼                              ┌──────────▼───────┐
┌─────────────────┐                    │  MySQL Database  │
│  BullMQ Queue   │◄── Redis ──────────│  users           │
│  (email-queue)  │                    │  campaigns       │
└────────┬────────┘                    │  recipients      │
         │ process job                 │  logs            │
         ▼                             │  domains         │
┌─────────────────────────────────────│  suppressionList │
│         Email Worker Process        │  emailStats      │
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
│  Open ─────► Update openedAt + emailStats                           │
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
- Prisma ORM (Type-safe database interactions)
- MySQL
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
- Axios (HTTP client encapsulated in a service layer)

---

## 📁 Project Structure

```text
interview-test/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Prisma schema + DB models
│   ├── src/
│   │   ├── app.js                # Express app setup
│   │   ├── server.js             # Entry point
│   │   ├── config/               
│   │   │   └── redis.js          # Redis connection (ioredis)
│   │   ├── controllers/          # Route handlers using Prisma
│   │   ├── lib/                  
│   │   │   └── prisma.js         # Singleton Prisma client instance
│   │   ├── middleware/           # Auth and error handling
│   │   ├── queue/                # BullMQ Queue definition
│   │   ├── routes/               # Express routing
│   │   ├── services/             # Nodemailer and Personalization logic
│   │   ├── utils/                # CSV Parsing
│   │   └── workers/              # BullMQ worker process (emailWorker.js)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── context/              # React Context (Auth, Theme)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── layouts/              # Main layout shells
│   │   ├── pages/                # Page views
│   │   ├── routes/               # Centralized React Router configuration
│   │   ├── services/             # API services layer (Axios)
│   │   └── utils/                # Frontend utilities
│   ├── index.html
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start (Local)

### Prerequisites
- Node.js 18+
- MySQL 8+
- Redis 5.0+ (Docker or native)

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd interview-test

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials, DATABASE_URL, SMTP credentials, and JWT secret.
```

### 3. Database Setup (Prisma)
Because the project uses Prisma ORM, you don't need a manual `.sql` script. Just run:
```bash
npx prisma db push --force-reset
npx prisma generate
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
DATABASE_URL="mysql://root:your_password@localhost:3306/email_marketing"

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

## 📝 License

MIT
