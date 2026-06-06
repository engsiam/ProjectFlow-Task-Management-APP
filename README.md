<div align="center">

# 🚀 ProjectFlow

### *The Smart Project & Task Collaboration Platform*

**Plan less. Ship more. Together.**

ProjectFlow is a full-stack, production-ready task management and project collaboration platform built for modern teams. Real-time kanban boards, granular role-based access control, OAuth login, project analytics, enterprise intelligence suite (Gantt timelines, activity heatmaps, workload balancer, insights assistant, portfolio risk matrix, PDF reports, health scoring), and a beautiful UI — all wired up with a Hono + Prisma + MongoDB backend and a Fresh + Preact frontend.

<br />

[![Live](https://img.shields.io/badge/🌐_Live_App-projectflow.engsiam.deno.net-00DC82?logo=deno)](https://projectflow.engsiam.deno.net)
[![API](https://img.shields.io/badge/⚡_API-projectflow--backend.engsiam.deno.net-000000?logo=deno)](https://projectflow-backend.engsiam.deno.net/docs)
[![Backend](https://img.shields.io/badge/Backend-Deno_2.x-black?logo=deno)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-Fresh_1.7-00DC82?logo=fresh)](frontend/)
[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-47A248?logo=mongodb)](https://www.mongodb.com/atlas)
[![ORM](https://img.shields.io/badge/ORM-Prisma_5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![Deploy](https://img.shields.io/badge/Deploy-Deno_Deploy-000000?logo=deno)](https://deno.com/deploy)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Made With](https://img.shields.io/badge/Made_with-❤️-red.svg)](#)

<br />

[**✨ Live Demo**](https://projectflow.engsiam.deno.net) · [**⚡ API Docs**](https://projectflow-backend.engsiam.deno.net/docs) · [**🐛 Report Bug**](../../issues) · [**💡 Request Feature**](../../issues)

<br />

<img src="https://i.ibb.co.com/jPcXWPXW/home.jpg" alt="ProjectFlow — Home" width="100%" />

<br />

</div>

---

## 📸 Screenshots

| | |
|---|---|
| <img src="https://i.ibb.co.com/jPcXWPXW/home.jpg" alt="Home" width="100%" /> | <img src="https://i.ibb.co.com/Df4FprLt/Screenshot-1.jpg" alt="Login" width="100%" /> |
| **🏠 Home / Landing** | **🔐 Sign in** |
| <img src="https://i.ibb.co.com/CpjpHp7X/project.jpg" alt="Projects" width="100%" /> | <img src="https://i.ibb.co.com/N2VmtsSL/pro-details.jpg" alt="Project Detail" width="100%" /> |
| **📁 Projects** | **📋 Project Detail** |
| <img src="https://i.ibb.co.com/jP8bLhbC/task.jpg" alt="Task / Kanban" width="100%" /> | <img src="https://i.ibb.co.com/d4kf5XW5/tashboard.jpg" alt="Dashboard" width="100%" /> |
| **✅ Tasks (Kanban)** | **📊 Dashboard** |
| <img src="https://i.ibb.co.com/HDc9xQ7r/analytics.jpg" alt="Analytics" width="100%" /> | <img src="https://i.ibb.co.com/FL1CG90R/members.jpg" alt="Members" width="100%" /> |
| **📈 Analytics** | **👥 Members** |
| <img src="https://i.ibb.co.com/C5xM9wTr/settings.jpg" alt="Settings" width="100%" /> | <img src="https://i.ibb.co.com/jP8bLhbC/task.jpg" alt="Task Board" width="100%" /> |
| **⚙️ Settings** | **✅ Tasks (Kanban)** |

---

## 🌐 Live Deployment

| Service | URL | Purpose |
|---|---|---|
| **Frontend** | https://projectflow.engsiam.deno.net | The user-facing app (Fresh + Preact) |
| **Backend API** | https://projectflow-backend.engsiam.deno.net | The Hono + Prisma API |
| **Swagger UI** | https://projectflow-backend.engsiam.deno.net/docs | Interactive API explorer |
| **OpenAPI JSON** | https://projectflow-backend.engsiam.deno.net/openapi.json | Machine-readable spec |
| **Health** | https://projectflow-backend.engsiam.deno.net/health | Liveness probe |
| **Readiness** | https://projectflow-backend.engsiam.deno.net/readyz | DB-backed readiness probe |

> **Demo accounts** (all use the password from the seed): `admin@projectflow.dev` · `olivia@projectflow.dev` · `liam@projectflow.dev` · `noah@projectflow.dev`. See [Demo accounts](#-demo-accounts-after-seeding) below.

---

## 📑 Table of Contents

- [📸 Screenshots](#-screenshots)
- [🌐 Live Deployment](#-live-deployment)
- [🌟 Why ProjectFlow?](#-why-projectflow)
- [✨ Features](#-features)
- [🏗️ Architecture](#-architecture)
- [🧰 Tech Stack](#-tech-stack)
- [📂 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Environment Variables](#-environment-variables)
- [🔐 Role-Based Access Control](#-role-based-access-control)
- [📡 API Endpoints](#-api-endpoints)
- [☁️ Deploy to Deno Deploy](#-deploy-to-deno-deploy)
- [🧪 Testing & Quality](#-testing--quality)
- [🛠️ Development Scripts](#-development-scripts)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

---

## 🌟 Why ProjectFlow?

> Most task managers are either **too simple** to run a real team or **too complex** to enjoy using. ProjectFlow hits the sweet spot.

- **🎯 Built for everyone** — solo founders, growing agencies, and 50-person engineering teams.
- **⚡ Blazing fast** — server-rendered islands + MongoDB indexes tuned for sub-100ms reads.
- **🔒 Secure by default** — 4-tier RBAC (Admin · Project Manager · Team Member · Viewer), JWT refresh rotation, OAuth 2.0, and per-project access checks.
- **🎨 Beautiful UI** — clean, accessible, dark-mode ready, mobile-first.
- **☁️ One-click deploy** — production-ready for [Deno Deploy](https://deno.com/deploy) with a verified cold-start pipeline.

## ✨ Features

### 🏠 Home / Landing

![Home Page](https://i.ibb.co.com/jPcXWPXW/home.jpg)

### 🔐 Sign-in & Sign-up

![Login](https://i.ibb.co.com/Df4FprLt/Screenshot-1.jpg)

### 🗂️ Project Management
- ✅ Create, edit, archive, restore, and delete projects
- 📅 Required start & deadline dates with overdue highlighting
- 🎨 Per-project color, member avatars, owner badges
- 📊 Live project health indicators (On Track / At Risk / Delayed)
- 🗂️ Status workflow: `Active` → `On Hold` → `Completed` (with `Archived` for soft-delete)

![Projects list](https://i.ibb.co.com/CpjpHp7X/project.jpg)
![Project Detail](https://i.ibb.co.com/N2VmtsSL/pro-details.jpg)

### ✅ Task Management
- 🎯 Three-column Kanban: **To Do → In Progress → Completed**
- 🏷️ Priority levels: `Low` · `Medium` · `High`
- 👥 Assignees, due dates, labels, attachments
- 💬 Threaded comments on every task
- 🔁 Bulk actions: set status / set priority / delete (admin-gated)
- 📄 CSV export of project tasks

![Task Board](https://i.ibb.co.com/jP8bLhbC/task.jpg)

### 👥 Collaboration
- 📨 Email + password auth, plus **Google** & **GitHub OAuth 2.0**
- 🔔 Real-time in-app notifications
- 🔍 Global command palette (⌘K / Ctrl+K) — search projects, tasks, and members
- 👤 Member directory with admin role management

![Members](https://i.ibb.co.com/FL1CG90R/members.jpg)

### 📊 Analytics & Insights
- 📈 Workspace dashboard: project count, task status mix, priority mix, 30-day trend
- 🏆 Per-project analytics: member workload, productivity, overdue comparison
- 🩺 Public `/health` and Deploy-friendly `/readyz` endpoints

### 🏛️ Enterprise Intelligence Suite

| Feature | Location | Description |
|---------|----------|-------------|
| **Executive Command Center** | Dashboard hero | Health score ring, project/task/completion/at-risk stats with weekly trend |
| **Project Timeline (Gantt)** | Project Detail → Timeline tab | Week-header Gantt rows, colored bars by status, overdue markers, today line |
| **Activity Heatmap** | Dashboard | GitHub-style 90-day contribution grid with 5-level intensity coloring |
| **Workload Balancer** | Dashboard | Balanced/overloaded/underutilized stats with bar chart & deterministic redistribution recommendations |
| **Insights Assistant** | Dashboard | Rule-based recommendations (overdue tasks, overloaded members, low velocity, unassigned tasks) |
| **Portfolio Page** | `/portfolio` route | Health score ring, risk matrix table, portfolio insights cards, expandable health intelligence per project |
| **PDF Report Export** | Project Detail | `window.print()` with `@media print` CSS — zero-dependency professional report |

### 🎯 Project Health Intelligence Engine** (continued below)

![Dashboard](https://i.ibb.co.com/d4kf5XW5/tashboard.jpg)
![Analytics](https://i.ibb.co.com/HDc9xQ7r/analytics.jpg)

### ⚙️ Settings
- 👤 Update profile, avatar, bio
- 🔑 Change password
- 🌗 Theme toggle (dark / light)
- 🔌 Connect / disconnect OAuth providers

![Settings](https://i.ibb.co.com/C5xM9wTr/settings.jpg)

### 📱 Mobile-first

- Fully responsive layouts for kanban, dashboard, project detail, and task detail
- Touch-friendly drag handles, swipe gestures, and bottom-tab navigation
- Installable as a PWA on iOS and Android

## 📊 Project Health Intelligence Engine

A deterministic, enterprise-grade **Project Health Intelligence** module — the same kind of risk assessment engine you find in Jira, Linear, Asana, ClickUp, Monday.com, and Notion Projects. Every project is continuously scored, classified, forecasted, and presented with a clear action plan. No third-party services, no API keys, no surprise billing — runs identically on the free Deno Deploy tier and on a $5 VPS.

### What it computes

A single 0–100 **Health Score** is blended from five weighted signals drawn from live project data:

| Signal | Weight | What it measures |
|---|---:|---|
| Overdue tasks | 30 | Ratio of overdue, non-completed tasks (hard cap on rot) |
| Completion velocity (7-day) | 20 | Tasks shipped in the last 7 days, scaled 2 pts/task |
| Deadline proximity | 25 | Distance from now to project deadline (tiered 0 / 8 / 15 / 20 / 25) |
| Team engagement | 15 | Active members in last 7 days vs. total members |
| Workload balance | 10 | Standard deviation of open tasks across assignees (lower = better) |

**Risk classification** (auto-derived from the score):

- 🟢 `ON_TRACK` — score ≥ 70
- 🟡 `AT_RISK` — score 40–69
- 🔴 `CRITICAL` — score < 40

**Predictive analytics:**

- **Predicted completion date** = `remaining tasks / 7-day velocity` (capped at project deadline)
- **On-track probability** — a 0–1 estimate bucketed by how far ahead/behind the predicted completion sits
- **Score trend** — `current - previous snapshot`, with `↑ / → / ↓` indicator
- **Historical trend chart** — SVG sparkline of the last 30 snapshots, with the line color following the current risk band

### What it surfaces

- **Top Risk Factors** — the three biggest reasons the score is what it is (e.g. "1 overdue task detected", "Completion rate below target", "Team workload imbalance", "Deadline approaching"), ordered by severity.
- **Recommended Actions** — concrete next steps derived from the same signals (e.g. "Resolve overdue tasks", "Increase sprint velocity", "Reassign overloaded team members", "Engage inactive team members", "Maintain cadence").
- **Health Score Breakdown** — collapsible per-signal contribution panel with progress bars (`Overdue -10 / 30`, `Velocity +20 / 20`, `Engagement +15 / 15`, `Workload Balance +10 / 10`, `Deadline Distance +36 / 25` → `Final 71 / 100`).
- **Workspace Health Overview** (dashboard) — average score, on-track / at-risk / critical counts, and the **Top 5 Risk** + **Top 5 Healthy** projects side-by-side.

### Screenshots

| | |
|---|---|
| ![Workspace Health Overview — dashboard widget](https://i.ibb.co.com/C5xM9wTr/settings.jpg) | ![Project Health Intelligence — project detail](https://i.ibb.co.com/jP8bLhbC/task.jpg) |
| **Workspace Health Overview** | **Project Health Intelligence** |

> Drop the real screenshots into `frontend/docs/screenshots/` and update the image URLs above once you have them.

### API surface

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/projects/:projectId/health`         | Current health score, risk, risk factors, recommendations, breakdown, trend |
| `POST` | `/api/projects/:projectId/health/refresh` | Force a fresh computation + persist a new `ProjectHealthSnapshot` + activity log |
| `GET`  | `/api/projects/:projectId/health/history` | Last 30 snapshots for the trend chart |
| `GET`  | `/api/dashboard/health`                   | Workspace summary: average, counts, top 5 risk + top 5 healthy |

### Capabilities (recruiter view)

- ✅ Health Score (0–100) with weighted multi-signal algorithm
- ✅ Risk Classification (`ON_TRACK` / `AT_RISK` / `CRITICAL`)
- ✅ Completion Forecasting (predicted completion date)
- ✅ On-Track Probability (0–1)
- ✅ Historical Trend Analysis (last 30 snapshots, sparkline)
- ✅ Top Risk Factors (severity-ranked)
- ✅ Recommended Actions (prescriptive next steps)
- ✅ Per-signal Score Breakdown (transparent, explainable)
- ✅ Workspace Health Monitoring (dashboard widget)
- ✅ Persistent snapshots + activity log integration
- ✅ Deterministic — no LLM, no external API, identical results everywhere

### How it stays free

- Pure CPU-bound computation: 1 Prisma query for the project tree, 5 arithmetic passes, 1 `prisma.create()`. No vector store, no embeddings, no GPU.
- Snapshot cache: a result is reused for 1 hour before being recomputed unless the user clicks **Refresh**.
- MongoDB Binary storage (no S3/R2 fees) — snapshots are ~1 KB JSON, well below the 16 MB document limit.

### 🛡️ Security & Permissions
- 🔐 JWT access tokens + rotating refresh tokens (15min / 7d)
- 🚦 IP-based rate limiting on auth endpoints
- 🛂 Per-project role: `OWNER` · `PROJECT_MANAGER` · `MEMBER` · `VIEWER`
- 🧱 Global role: `ADMIN` · `PROJECT_MANAGER` · `TEAM_MEMBER` · `VIEWER`
- 🚫 CORS locked to your frontend origin(s)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          🌐  Browser (Client)                         │
│  Fresh + Preact islands · Tailwind-free CSS · JWT in localStorage   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ HTTPS / JSON
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    ⚡  Hono on Deno (Backend)                        │
│   OpenAPI 3 · Zod validation · JWT auth · RBAC middleware            │
│   /health  /readyz  /docs  /openapi.json                             │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ Prisma 5
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│              🍃  MongoDB Atlas  (Prisma MongoDB connector)           │
│   Users · Projects · Tasks · Comments · Notifications · Activity     │
└──────────────────────────────────────────────────────────────────────┘
```

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | [Deno Fresh 1.7](https://fresh.deno.dev/) · [Preact 10](https://preactjs.com/) · TypeScript 5 |
| **Backend** | [Deno 2.x](https://deno.com/) · [Hono 4.6](https://hono.dev/) · OpenAPI 3 |
| **Validation** | [Zod 3.23](https://zod.dev/) via [@hono/zod-openapi](https://github.com/honojs/middleware) |
| **Auth** | [JWT](https://jwt.io/) (access + refresh rotation) · [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **OAuth** | Google + GitHub OAuth 2.0 |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas/) via [Prisma 5.22](https://www.prisma.io/) |
| **Deployment** | [Deno Deploy](https://deno.com/deploy) (verified) + local dev |
| **Charts** | Recharts (analytics dashboard) |
| **Tools** | Swagger UI · CORS · Helmet-style headers · Pino-style access log |

## 📂 Project Structure

```
ProjectFlow-Task-Management-APP/
├── 📁 backend/                # Deno + Hono + Prisma API
│   ├── 📁 src/
│   │   ├── 📁 config/         # env, CORS
│   │   ├── 📁 controllers/    # Hono route handlers
│   │   ├── 📁 middleware/     # auth, RBAC, rate-limit, error
│   │   ├── 📁 prisma/         # Prisma client singleton
│   │   ├── 📁 routes/         # OpenAPI route definitions
│   │   ├── 📁 services/       # Business logic
│   │   ├── 📁 types/          # Domain enums + context types
│   │   ├── 📁 utils/          # cache, errors, response, csv…
│   │   ├── 📄 app.ts          # Hono app factory
│   │   └── 📄 server.ts       # ⬅ Entrypoint
│   ├── 📁 prisma/
│   │   ├── 📄 schema.prisma   # MongoDB schema
│   │   └── 📄 seed.ts         # Demo data seeder
│   ├── 📁 scripts/
│   │   └── 📄 ensure-prisma.ts
│   ├── 📄 deno.json           # Tasks & import map
│   └── 📄 README.md           # Backend-specific docs
│
├── 📁 frontend/               # Deno Fresh + Preact UI
│   ├── 📁 islands/            # Interactive client components
│   ├── 📄 DashboardClient.tsx       # Dashboard with ECC hero, grid, teams, activity
│   ├── 📄 ExecutiveDashboard.tsx    # Workspace health overview widget
│   ├── 📄 ProjectDetailClient.tsx   # Project detail with tabs + PDF export
│   ├── 📄 ProjectHealthCard.tsx     # Health score ring + risk breakdown
│   ├── 📄 ProjectTimeline.tsx       # Gantt chart with week headers
│   ├── 📄 ActivityHeatmap.tsx       # 90-day GitHub-style contribution grid
│   ├── 📄 WorkloadBalancer.tsx      # Team workload analysis + recommendations
│   ├── 📄 InsightsAssistant.tsx     # Rule-based AI-style assistant
│   ├── 📄 PortfolioClient.tsx       # Portfolio page: risk matrix, insights, health
│   ├── 📄 AnalyticsClient.tsx       # Workspace analytics charts
│   ├── 📄 KanbanBoard.tsx           # Drag-and-drop task board
│   └── 📄 ...
│   ├── 📁 components/         # Server-rendered components
│   ├── 📁 lib/                # API client, auth, RBAC, validation
│   ├── 📁 routes/             # Fresh pages
│   ├── 📁 static/             # CSS + assets
│   ├── 📄 dev.ts              # Dev entrypoint
│   ├── 📄 main.ts             # Prod entrypoint
│   ├── 📄 fresh.config.ts
│   └── 📄 README.md           # Frontend-specific docs
│
├── 📁 design/                 # Mockups, brand assets
└── 📄 README.md               # ⬅ You are here
```

---

## 🚀 Quick Start

### 📋 Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| [Deno](https://deno.land/) | **2.0+** | Runs both backend and frontend |
| [MongoDB](https://www.mongodb.com/try) | **6.0+** | Database (or use Atlas free tier) |
| [Node.js](https://nodejs.org/) | **18+** | *Optional* — only for `npm:` specifiers cache |
| [Git](https://git-scm.com/) | latest | Clone the repo |

### ⚡ One-command bootstrap

```bash
# 1. Clone
git clone https://github.com/your-org/ProjectFlow-Task-Management-APP.git
cd ProjectFlow-Task-Management-APP

# 2. Spin up MongoDB (Docker)
docker run -d --name projectflow-mongo -p 27017:27017 mongo:7

# 3. Backend setup
cd backend
cp .env.example .env       # then edit DATABASE_URL
deno task prisma:push      # apply schema
deno task seed             # (optional) load demo data
deno task dev              # 🚀 http://localhost:8000

# 4. Frontend setup (new terminal)
cd ../frontend
cp .env.example .env       # set API_BASE_URL=http://localhost:8000/api
deno task dev              # 🎨 http://localhost:8001
```

That's it — open **<http://localhost:8001>** and sign in with one of the seeded demo accounts.

### 👤 Demo accounts (after seeding)

| Email | Password | Role |
|-------|----------|------|
| `admin@projectflow.dev` | `Admin#12345` | `ADMIN` |
| `olivia@projectflow.dev` | `Olivia#12345` | `PROJECT_MANAGER` |
| `liam@projectflow.dev` | `Liam#12345` | `TEAM_MEMBER` |
| `noah@projectflow.dev` | `Noah#12345` | `VIEWER` |

---

## ⚙️ Environment Variables

### 🔧 Backend (`backend/.env`)

```env
# ── Required ─────────────────────────────
DATABASE_URL="mongodb://localhost:27017/projectflow"
JWT_ACCESS_SECRET="<32+ random bytes>"
JWT_REFRESH_SECRET="<32+ random bytes>"

# ── Optional ─────────────────────────────
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:8001
OAUTH_REDIRECT_URL=http://localhost:8000/api/auth

# OAuth (Google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth (GitHub)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Storage (Deploy auto-sets to "disabled")
UPLOAD_DIR=uploads
STORAGE_BACKEND=local
```

### 🎨 Frontend (`frontend/.env`)

```env
API_BASE_URL=http://localhost:8000/api
```

> See [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md) for the full reference.

---

## 🔐 Role-Based Access Control

ProjectFlow uses a **two-layer RBAC** system — a global account role and a per-project role.

### 🌍 Global Account Role

| Role | Create Project | Manage Members | Manage Roles | Delete Anything |
|------|:--------------:|:--------------:|:------------:|:---------------:|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **PROJECT_MANAGER** | ✅ | ✅ (own projects) | ❌ | ❌ |
| **TEAM_MEMBER** | ❌ | ❌ | ❌ | ❌ |
| **VIEWER** | ❌ | ❌ | ❌ | ❌ |

### 📁 Per-Project Role

| Role | Edit Project | Invite | Create Tasks | Assign | Delete Tasks |
|------|:------------:|:------:|:------------:|:------:|:------------:|
| **OWNER** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **PROJECT_MANAGER** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **MEMBER** | ❌ | ❌ | ✅ (assigned only) | ❌ | ❌ |
| **VIEWER** | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Only `ADMIN` can delete projects, archive projects, or remove members.**

---

## 📡 API Endpoints

All endpoints live under `/api` and are documented live at **`/docs`** (Swagger UI) and **`/openapi.json`** (raw spec).

### 🔑 Auth (`/api/auth`)
- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — email + password
- `POST /api/auth/refresh` — rotate access token
- `POST /api/auth/logout` — invalidate session
- `GET  /api/auth/me` — current user
- `GET  /api/auth/google` · `GET /api/auth/github` — OAuth flows

### 👤 Users (`/api/users`)
- `PATCH /api/users/me` — update own profile
- `GET   /api/users/search` — find users to invite
- `GET   /api/users/:userId` — public profile
- **`PATCH /api/users/:userId/role`** — admin-only role change

### 📁 Projects (`/api/projects`)
- `GET    /api/projects` — list user's projects
- `POST   /api/projects` — create project
- `GET    /api/projects/:id` — project detail
- `PATCH  /api/projects/:id` — edit project
- `POST   /api/projects/:id/archive` — archive
- `DELETE /api/projects/:id` — admin-only
- `GET    /api/projects/:id/members` — list members
- `GET    /api/projects/:id/activity` — activity feed
- `GET    /api/projects/:id/export/tasks.csv` — CSV export

### ✅ Tasks (`/api/projects/:id/tasks`)
- `GET    /api/projects/:id/tasks` — list (paged, filtered, sorted)
- `POST   /api/projects/:id/tasks` — create
- `GET    /api/tasks/:id` — detail
- `PATCH  /api/tasks/:id` — update
- `POST   /api/tasks/:id/move` — change status
- `DELETE /api/tasks/:id` — admin-only

### 📊 Project Health Intelligence (`/api/projects/:id/health`, `/api/dashboard/health`)
- `GET   /api/projects/:projectId/health` — score, risk, top risk factors, recommendations, breakdown, trend
- `POST  /api/projects/:projectId/health/refresh` — recompute + persist snapshot + activity log
- `GET   /api/projects/:projectId/health/history?limit=30` — past snapshots (sparkline)
- `GET   /api/dashboard/health` — workspace summary (avg score, on-track/at-risk/critical, top 5 risk + top 5 healthy)

### 💬 Comments · 🔔 Notifications · 📎 Uploads
- `POST /api/tasks/:id/comments` · `GET /api/tasks/:id/comments`
- `GET  /api/notifications` · `PATCH /api/notifications/:id`
- `POST /api/uploads/avatar` (local dev only) · `POST /api/projects/:id/tasks/:taskId/attachments`

### 🩺 System
- `GET /health` — liveness (always 200)
- **`GET /readyz` — readiness (200 only when DB reachable)**
- `GET /api/dashboard` — personal dashboard
- `GET /api/dashboard/portfolio` — portfolio & executive overview
- `GET /api/dashboard/health` — workspace health summary
- `GET /api/analytics/dashboard` — workspace analytics
- `GET /api/analytics/project/:projectId` — per-project analytics KPIs

---

## ☁️ Deploy to Deno Deploy

ProjectFlow is **production-verified** for [Deno Deploy](https://deno.com/deploy).

### 🚀 One-Click Deploy

1. Push this repo to GitHub.
2. In the [Deno Deploy dashboard](https://dash.deno.com/), click **+ New Project** → **GitHub** → select the repo.
3. Configure the project:

   | Setting | Value |
   |---------|-------|
   | **App Directory** | `backend` |
   | **Entrypoint** | `src/server.ts` |
   | **Framework Preset** | *No Preset* |
   | **Runtime** | Deno Deploy (Deno 2.x) |
   | **Install Command** | *(leave empty — Deno Deploy runs `deno install` automatically)* |
   | **Build Command** | `deno task build:deploy` — runs `prisma generate` + the post-generate patch (see below) |
   | **Start Command** | *(leave empty — Deploy's default `deno run -A src/server.ts` works)* |
   | **Health Check Path** | `/readyz` |

   > ⚠️ **Why the Build Command is required:** the Prisma generated client at `backend/src/generated/prisma/` contains a *platform-specific* engine binary (`.dll.node` on Windows, `.so.node` on Linux). It's gitignored on purpose. Without a Build Command, Deploy clones the repo without the engine and the app crashes on boot with `MODULE_NOT_FOUND`.

   > 🔧 **Why the post-generate patch is required:** Prisma's generated client is CommonJS (`Object.defineProperty(exports, "__esModule", ...)` at line 2). Deno Deploy boots with `deno run -A src/server.ts` and does **not** read the `unstable: ["detect-cjs"]` field from `deno.json` — only `tasks`, `imports`, `compilerOptions`, and `nodeModulesDir`. The `scripts/patch-prisma-package-json.ts` post-generate step patches the generated `package.json` to add `"type": "commonjs"`, which makes Deno treat the `.js` files as CJS natively — no flag, no settings change, no CLI flag, works on every Deno runtime.

4. Add environment variables in **Settings → Environment Variables** (see [Backend env](#-environment-variables) above). At minimum:
   - `DATABASE_URL` — MongoDB Atlas connection string
   - `JWT_ACCESS_SECRET` — 32+ random bytes
   - `JWT_REFRESH_SECRET` — 32+ random bytes
5. Click **Deploy** → your API is live at `https://<project>.deno.dev` 🎉

### ✅ Pre-flight checklist

- [ ] `deno task prisma:generate` runs cleanly **locally**
- [ ] **`src/generated/` stays gitignored** — the Build Command regenerates it for Linux
- [ ] **Build Command is set** to `deno task build:deploy` in Deploy settings
- [ ] **Health Check Path is set** to `/readyz` in Deploy settings
- [ ] `DATABASE_URL` points to MongoDB Atlas (Deploy cannot reach `localhost`)
- [ ] `FRONTEND_URL` matches your deployed frontend's origin
- [ ] `JWT_*_SECRET` is set to strong random values
- [ ] First deploy: check Deploy logs for `[server] Deploy runtime: skipping eager DB connect; /readyz will validate.`

### 🩺 Health & warmup

| Endpoint | Purpose | Expected on Deploy |
|----------|---------|--------------------|
| `GET /health` | Liveness | `200 OK` always |
| `GET /readyz` | Readiness (DB ping) | `200` when DB reachable, `503` during cold start |
| `GET /docs` | Swagger UI | `200 OK` |

---

## 🧪 Testing & Quality

```bash
# Type-check (no emit)
deno task typecheck

# Format check
deno fmt --check

# Lint
deno lint

# Full CI sweep
deno task typecheck && deno fmt --check && deno lint
```

All three must pass before pushing. CI will fail the build otherwise.

---

## 🛠️ Development Scripts

### 📦 Backend

| Task | Description |
|------|-------------|
| `deno task dev` | Watch mode on `src/server.ts` with hot reload |
| `deno task start` | Production-style start |
| `deno task prisma:generate` | Regenerate Prisma client |
| `deno task prisma:push` | Push schema to MongoDB |
| `deno task prisma:studio` | Open Prisma Studio |
| `deno task seed` | Seed demo data |
| `deno task typecheck` | Type-check the entire backend |

### 🎨 Frontend

| Task | Description |
|------|-------------|
| `deno task dev` | Fresh dev server on `:8001` |
| `deno task start` | Build & start production server |
| `deno task build` | Pre-render static pages |
| `deno task check` | Type-check (Fresh + Preact) |

---

## 🤝 Contributing

We love contributions! 🛠️

1. 🍴 **Fork** the repository
2. 🌿 **Branch** from `main`: `git checkout -b feat/awesome-feature`
3. 💻 **Commit** your changes: `git commit -m "feat: add awesome feature"`
4. ✅ **Push** to your fork: `git push origin feat/awesome-feature`
5. 🎁 **Open a Pull Request**

Please make sure:
- `deno task typecheck` passes
- `deno fmt --check` passes
- `deno lint` passes
- New features include at least one new test or documented manual test

> Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License — do what you want, just don't sue us. ⚖️
```

---

## 🙏 Acknowledgments

Built with ❤️ using these amazing open-source projects:

- [Deno](https://deno.com/) · [Fresh](https://fresh.deno.dev/) · [Hono](https://hono.dev/)
- [Preact](https://preactjs.com/) · [Prisma](https://www.prisma.io/) · [MongoDB](https://www.mongodb.com/)
- [Zod](https://zod.dev/) · [Swagger UI](https://swagger.io/tools/swagger-ui/) · [Recharts](https://recharts.org/)
- And the entire [Deno community](https://discord.gg/deno) 💚

---

<div align="center">

### ⭐ If ProjectFlow helped you ship faster, give us a star!

<sub>Made with 🦕 by the ProjectFlow team</sub>

</div>
