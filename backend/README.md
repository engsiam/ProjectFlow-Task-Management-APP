# ProjectFlow Backend

A production-quality backend for a **Smart Project & Task Collaboration System**, built with
**Deno + Hono + Prisma + MongoDB**, fully documented via Swagger / OpenAPI.

> Every API endpoint is testable from `/docs` with JWT Bearer authentication, examples, and full
> schema definitions.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Quick Start](#quick-start)
5. [Environment Setup](#environment-setup)
6. [MongoDB Setup](#mongodb-setup)
7. [Prisma Commands](#prisma-commands)
8. [Seed Data](#seed-data)
9. [Run the Server](#run-the-server)
10. [Swagger / OpenAPI](#swagger--openapi)
11. [Demo Credentials](#demo-credentials)
12. [Auth Testing Guide](#auth-testing-guide)
13. [Role Testing Guide](#role-testing-guide)
14. [API Endpoint List](#api-endpoint-list)
15. [Expected Response Shape](#expected-response-shape)
16. [Common Error Examples](#common-error-examples)
17. [Deployment Notes](#deployment-notes)

---

## Features

- **Auth**: signup, login, refresh (with rotation), logout, `/me`. JWT access + refresh tokens,
  bcryptjs hashing, in-memory rate limit on auth routes, refresh tokens stored hashed in DB.
- **Users**: profile update, avatar, bio, public user search by email/name/username.
- **Projects**: CRUD, archive, status (`ACTIVE` / `COMPLETED` / `ARCHIVED`), owner-managed,
  role-based access, computed progress %.
- **Members & Invitations**: invite by email, accept/reject invitations, change role, remove
  members. Roles: `OWNER`, `MANAGER`, `MEMBER`, `VIEWER`.
- **Tasks**: full Kanban with `TODO` / `IN_PROGRESS` / `REVIEW` / `DONE`, priority, due dates,
  labels, drag-and-drop reorder, filter / search / pagination.
- **Comments & Mentions**: `@username` mentions resolved against the user table, mentioned users get
  notifications.
- **Activity Log**: full audit trail of project + task actions (who, what, when, where).
- **Notifications**: in-app feed, unread count, mark read / mark all read, typed notifications
  (assignment, mention, status, role, project updates).
- **Dashboard Analytics**: project counts, task breakdowns (status / priority), overdue, my open
  tasks, recent activity.
- **Per-Project Analytics**: status/priority breakdown, member workload, team productivity.
- **CSV Export**: export all project tasks as CSV (`OWNER` / `MANAGER` only).
- **Health endpoint**: public `/health` with DB status, runtime, version, timestamp.
- **Swagger UI**: complete OpenAPI 3.0 spec at `/openapi.json` and interactive UI at `/docs`.
  Persisted auth so you can call protected endpoints directly.

---

## Tech Stack

| Concern      | Tool                                                      |
| ------------ | --------------------------------------------------------- |
| Runtime      | [Deno 2.x](https://deno.land)                             |
| Framework    | [Hono 4.x](https://hono.dev)                              |
| ORM          | [Prisma 5.22](https://www.prisma.io)                      |
| Database     | [MongoDB](https://www.mongodb.com) (Atlas or self-hosted) |
| Validation   | [Zod 3.x](https://zod.dev) + `@hono/zod-openapi`          |
| Auth         | JWT (`jsonwebtoken`) + bcryptjs                           |
| API Docs     | `@hono/zod-openapi` + `@hono/swagger-ui`                  |
| Architecture | Clean modular: routes → controllers → services → Prisma   |

---

## Folder Structure

```
.
├── deno.json
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── app.ts                # OpenAPIHono app factory + Swagger mount
    ├── server.ts             # Bootstraps the HTTP server
    ├── config/
    │   ├── env.ts            # Strongly-typed env loading from .env
    │   └── cors.ts           # CORS policy
    ├── docs/
    │   └── openapi.ts        # Zod schemas + helpers + Swagger UI re-export
    ├── prisma/
    │   └── client.ts         # Singleton Prisma client + ping/connect helpers
    ├── types/
    │   ├── domain.ts         # Domain constants (statuses, roles, ranks)
    │   └── context.ts        # AuthUser, AppVariables types
    ├── utils/
    │   ├── errors.ts         # AppError + subclasses
    │   ├── response.ts       # Unified { success, message, data | error } shape
    │   ├── pagination.ts     # parsePageParams / buildPageResult
    │   ├── token.ts          # JWT sign / verify + expiry helpers
    │   ├── hashing.ts        # bcrypt hash / verify
    │   ├── csv.ts            # CSV serializer
    │   ├── id.ts             # ObjectId validation, mention extractor
    │   ├── rate-limit.ts     # In-memory token bucket
    │   └── serialize.ts      # PublicUser shape
    ├── middleware/
    │   ├── auth.ts           # JWT auth + optionalAuth
    │   ├── rbac.ts           # Project role middleware (requireProjectMember/Manager/Owner)
    │   ├── error.ts          # Centralized error handler
    │   ├── rate-limit.ts     # Auth route rate limit
    │   ├── request-id.ts     # X-Request-Id
    │   ├── logger.ts         # HTTP access log
    │   └── validate.ts       # Generic Zod validation
    ├── validators/
    │   ├── auth.validator.ts
    │   ├── user.validator.ts
    │   ├── project.validator.ts
    │   ├── task.validator.ts
    │   ├── comment.validator.ts
    │   └── notification.validator.ts
    ├── services/             # Business logic (no HTTP concerns)
    │   ├── auth.service.ts
    │   ├── user.service.ts
    │   ├── project.service.ts
    │   ├── task.service.ts
    │   ├── comment.service.ts
    │   ├── activity.service.ts
    │   ├── notification.service.ts
    │   ├── analytics.service.ts
    │   ├── export.service.ts
    │   └── health.service.ts
    ├── controllers/          # Thin Hono handlers, delegate to services
    │   ├── _helpers.ts
    │   ├── auth.controller.ts
    │   ├── user.controller.ts
    │   ├── project.controller.ts
    │   ├── task.controller.ts
    │   ├── comment.controller.ts
    │   ├── notification.controller.ts
    │   └── system.controller.ts
    └── routes/               # OpenAPI route definitions (createRoute)
        ├── auth.routes.ts
        ├── user.routes.ts
        ├── project.routes.ts
        ├── task.routes.ts
        ├── comment.routes.ts
        ├── notification.routes.ts
        └── system.routes.ts
```

---

## Quick Start

```bash
# 1. Install Deno (if not installed)
#    https://deno.land/

# 2. Copy env and fill in your secrets
cp .env.example .env

# 3. Generate the Prisma client + push schema to MongoDB
deno task prisma:generate
deno task prisma:push

# 4. Seed the database
deno task seed

# 5. Start the dev server (auto-reload)
deno task dev
```

Open <http://localhost:8000/docs> to use the Swagger UI.

---

## Environment Setup

Copy `.env.example` to `.env` and fill in real values:

```env
DATABASE_URL="mongodb+srv://USER:PASSWORD@HOST/DATABASE?retryWrites=true&w=majority"
JWT_ACCESS_SECRET="replace-with-strong-access-secret"
JWT_REFRESH_SECRET="replace-with-strong-refresh-secret"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:8001"
PORT="8000"
NODE_ENV="development"
```

> **Important:** change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in any non-development
> environment. The dev defaults are clearly marked weak.

---

## MongoDB Setup

You can use **MongoDB Atlas** (free tier is fine) or a local MongoDB.

1. Create a free Atlas cluster: <https://www.mongodb.com/cloud/atlas>
2. Create a database user and add your IP to the access list.
3. Grab the connection string and put it in `DATABASE_URL` in `.env`.

Local MongoDB example:

```
DATABASE_URL="mongodb://localhost:27017/projectflow"
```

---

## Prisma Commands

| Task            | Command                     | What it does                                                       |
| --------------- | --------------------------- | ------------------------------------------------------------------ |
| Generate client | `deno task prisma:generate` | Generates the typed Prisma client to `node_modules/.prisma/client` |
| Push schema     | `deno task prisma:push`     | Pushes the schema to your MongoDB (creates collections + indexes)  |
| Studio          | `deno task prisma:studio`   | Opens a Prisma Studio GUI in your browser                          |
| Seed            | `deno task seed`            | Runs `prisma/seed.ts` to populate demo data                        |

> **Note:** Prisma MongoDB uses `db push` rather than migrations because MongoDB is schemaless. We
> re-run `prisma:generate` any time `schema.prisma` changes.

---

## Seed Data

Running `deno task seed` creates:

- **5 users** with all 4 roles + 1 extra engineer
- **3 projects** with realistic descriptions and color coding
- **Mixed-role memberships** (OWNER / MANAGER / MEMBER / VIEWER) on each project
- **15 tasks** distributed across all 4 Kanban columns (TODO, IN_PROGRESS, REVIEW, DONE)
- **Comments with @mentions** that actually resolve to seeded users
- **Activity log entries** for the major actions
- **Notifications** (unread) so `/api/notifications` has data
- **A pending invitation** so accept/reject endpoints are testable

The seed is idempotent for users (upsert by email) and re-creates tasks / comments / activity /
notifications each run.

---

## Run the Server

| Task        | Command               |
| ----------- | --------------------- |
| Dev (watch) | `deno task dev`       |
| Prod        | `deno task start`     |
| Type-check  | `deno task typecheck` |

Server boots on `http://localhost:8000`.

---

## Swagger / OpenAPI

| Resource     | URL                                  |
| ------------ | ------------------------------------ |
| Swagger UI   | <http://localhost:8000/docs>         |
| OpenAPI JSON | <http://localhost:8000/openapi.json> |
| Health       | <http://localhost:8000/health>       |
| Root         | <http://localhost:8000/>             |

The Swagger UI supports the **Authorize** button — paste an access token once and all protected
endpoints can be called from the browser.

---

## Demo Credentials

All demo users share the same password: **`Password123!`**

| Role    | Email                 | Notes                         |
| ------- | --------------------- | ----------------------------- |
| OWNER   | `owner@example.com`   | Owner of Q4 Product Launch    |
| MANAGER | `manager@example.com` | Manager on multiple projects  |
| MEMBER  | `member@example.com`  | Member on all 3 projects      |
| VIEWER  | `viewer@example.com`  | Read-only                     |
| (extra) | `alex@example.com`    | Owner of Platform Reliability |

---

## Auth Testing Guide

1. Open <http://localhost:8000/docs>
2. Expand `Auth` → `POST /api/auth/login` → **Try it out**
3. Paste one of the demo credentials (e.g. `owner@example.com` / `Password123!`)
4. **Execute** — copy the `accessToken` from the response
5. Click the **Authorize** button at the top of the Swagger page, paste the token, and confirm
6. Now all protected endpoints will work — call `/api/auth/me` to verify, then explore projects,
   tasks, etc.

To **refresh** the token, use `POST /api/auth/refresh` with the `refreshToken` you got from login.
To **logout**, use `POST /api/auth/logout` (optionally with a `refreshToken` body to revoke a single
session).

---

## Role Testing Guide

Each project has a different mix of roles, so you can see RBAC in action:

| Project                    | Owner                 | Manager               | Members                                  | Viewers              |
| -------------------------- | --------------------- | --------------------- | ---------------------------------------- | -------------------- |
| Q4 Product Launch          | `owner@example.com`   | `manager@example.com` | `member@example.com`, `alex@example.com` | `viewer@example.com` |
| Marketing Website Redesign | `manager@example.com` | `member@example.com`  | —                                        | `owner@example.com`  |
| Platform Reliability       | `alex@example.com`    | `manager@example.com` | `member@example.com`                     | —                    |

Try this:

1. Log in as `member@example.com` (MEMBER on all projects).
2. Try `DELETE /api/projects/{launchId}` — expect **403 FORBIDDEN** (only OWNER can delete).
3. Try `POST /api/projects/{launchId}/invitations` — expect **403** (only OWNER/MANAGER).
4. Try `POST /api/projects/{launchId}/tasks` — expect **201** (MEMBER+ can create).
5. Now log in as `owner@example.com` and try the same delete — it works.
6. Log in as `viewer@example.com` and try to create a task — expect **403**.

---

## API Endpoint List

### Health & docs

| Method | Path            | Auth | Description              |
| ------ | --------------- | ---- | ------------------------ |
| GET    | `/`             | –    | API info                 |
| GET    | `/health`       | –    | API + DB health (public) |
| GET    | `/docs`         | –    | Swagger UI               |
| GET    | `/openapi.json` | –    | OpenAPI 3.0 spec         |

### Auth

| Method | Path                | Auth   | Description                     |
| ------ | ------------------- | ------ | ------------------------------- |
| POST   | `/api/auth/signup`  | –      | Register a new user             |
| POST   | `/api/auth/login`   | –      | Log in, get JWT tokens          |
| POST   | `/api/auth/refresh` | –      | Rotate access + refresh tokens  |
| POST   | `/api/auth/logout`  | Bearer | Revoke a refresh token (or all) |
| GET    | `/api/auth/me`      | Bearer | Current user profile            |

### Users

| Method | Path                 | Auth   | Description                         |
| ------ | -------------------- | ------ | ----------------------------------- |
| PATCH  | `/api/users/me`      | Bearer | Update my profile                   |
| GET    | `/api/users/search`  | Bearer | Search users by email/name/username |
| GET    | `/api/users/:userId` | Bearer | Get a user by id                    |

### Projects

| Method | Path                                              | Auth   | Role     | Description       |
| ------ | ------------------------------------------------- | ------ | -------- | ----------------- |
| GET    | `/api/projects`                                   | Bearer | –        | List my projects  |
| POST   | `/api/projects`                                   | Bearer | –        | Create a project  |
| GET    | `/api/projects/:projectId`                        | Bearer | MEMBER+  | Project details   |
| PATCH  | `/api/projects/:projectId`                        | Bearer | MANAGER+ | Update project    |
| DELETE | `/api/projects/:projectId`                        | Bearer | OWNER    | Delete project    |
| POST   | `/api/projects/:projectId/archive`                | Bearer | OWNER    | Archive project   |
| GET    | `/api/projects/:projectId/members`                | Bearer | MEMBER+  | List members      |
| POST   | `/api/projects/:projectId/invitations`            | Bearer | MANAGER+ | Invite by email   |
| POST   | `/api/invitations/:invitationId/accept`           | Bearer | –        | Accept invitation |
| POST   | `/api/invitations/:invitationId/reject`           | Bearer | –        | Reject invitation |
| PATCH  | `/api/projects/:projectId/members/:memberId/role` | Bearer | MANAGER+ | Change role       |
| DELETE | `/api/projects/:projectId/members/:memberId`      | Bearer | MANAGER+ | Remove member     |
| GET    | `/api/projects/:projectId/activity`               | Bearer | MEMBER+  | Activity log      |

### Tasks

| Method | Path                             | Auth   | Role               | Description                         |
| ------ | -------------------------------- | ------ | ------------------ | ----------------------------------- |
| GET    | `/api/projects/:projectId/tasks` | Bearer | MEMBER+            | List tasks (filter, sort, paginate) |
| POST   | `/api/projects/:projectId/tasks` | Bearer | MEMBER+            | Create task                         |
| GET    | `/api/tasks/:taskId`             | Bearer | MEMBER+            | Get task                            |
| PATCH  | `/api/tasks/:taskId`             | Bearer | MEMBER+            | Update task                         |
| DELETE | `/api/tasks/:taskId`             | Bearer | creator / MANAGER+ | Delete task                         |
| POST   | `/api/tasks/:taskId/move`        | Bearer | MEMBER+            | Move to a Kanban column             |
| POST   | `/api/tasks/:taskId/reorder`     | Bearer | MEMBER+            | Reorder within a column             |

### Comments

| Method | Path                          | Auth   | Description                         |
| ------ | ----------------------------- | ------ | ----------------------------------- |
| GET    | `/api/tasks/:taskId/comments` | Bearer | List comments                       |
| POST   | `/api/tasks/:taskId/comments` | Bearer | Add comment (supports @mentions)    |
| PATCH  | `/api/comments/:commentId`    | Bearer | Edit own comment                    |
| DELETE | `/api/comments/:commentId`    | Bearer | Delete comment (author or MANAGER+) |

### Notifications

| Method | Path                                      | Auth   | Description        |
| ------ | ----------------------------------------- | ------ | ------------------ |
| GET    | `/api/notifications`                      | Bearer | List notifications |
| GET    | `/api/notifications/unread-count`         | Bearer | Unread count       |
| PATCH  | `/api/notifications/:notificationId/read` | Bearer | Mark as read       |
| PATCH  | `/api/notifications/read-all`             | Bearer | Mark all as read   |

### Dashboard, analytics, export

| Method | Path                                        | Auth              | Description                  |
| ------ | ------------------------------------------- | ----------------- | ---------------------------- |
| GET    | `/api/dashboard`                            | Bearer            | Personal dashboard analytics |
| GET    | `/api/projects/:projectId/analytics`        | Bearer            | Per-project analytics        |
| GET    | `/api/projects/:projectId/export/tasks.csv` | Bearer (MANAGER+) | Export project tasks as CSV  |

---

## Expected Response Shape

### Success

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

---

## Common Error Examples

| Status | When                                       | Example body                                                                                                                                 |
| ------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | Bad input (e.g. invalid ObjectId)          | `{"success":false,"message":"Invalid projectId","error":{"code":"BAD_REQUEST"}}`                                                             |
| 401    | Missing / invalid token                    | `{"success":false,"message":"Unauthorized","error":{"code":"UNAUTHORIZED"}}`                                                                 |
| 403    | Authenticated but not allowed              | `{"success":false,"message":"Only OWNER can delete a project","error":{"code":"FORBIDDEN"}}`                                                 |
| 404    | Not found                                  | `{"success":false,"message":"Project not found","error":{"code":"NOT_FOUND"}}`                                                               |
| 409    | Conflict (duplicate email, already member) | `{"success":false,"message":"Email is already registered","error":{"code":"CONFLICT"}}`                                                      |
| 422    | Zod validation failed                      | `{"success":false,"message":"Validation failed","error":{"code":"VALIDATION_ERROR","details":[{"path":"email","message":"Invalid email"}]}}` |
| 429    | Rate limit exceeded                        | `{"success":false,"message":"Too many requests. Please try again later.","error":{"code":"RATE_LIMIT"}}`                                     |
| 500    | Unexpected                                 | `{"success":false,"message":"Internal server error","error":{"code":"INTERNAL_ERROR"}}`                                                      |

---

## Deployment Notes

- The `nodeModulesDir: "auto"` setting in `deno.json` lets Deno use `node_modules/` for Prisma's
  generated client. On Deno Deploy you may need to set `DENO_DEPLOYMENT_ID` and run `deno install`
  during build.
- For production, set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (32+ random bytes), and set
  `NODE_ENV=production`.
- The built-in in-memory rate limiter is single-instance. For multi-instance deploys, swap
  `src/utils/rate-limit.ts` for a Redis-backed implementation.
- MongoDB connection pooling is handled by Prisma; no additional config needed.
- The CORS policy reads `FRONTEND_URL` (comma-separated allowed origins).
- For container deploys: `Dockerfile` not included by default; use `denoland/deno:alpine` and run
  `deno task start`.

Happy hacking!
