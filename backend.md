# BACKEND DEVELOPMENT PROMPT
## Stack: Deno + Hono + Prisma ORM + PostgreSQL (Supabase)

You are an expert backend engineer. Build a **complete, production-ready REST API** for a Smart Project & Task Collaboration System. Write clean, modular, well-commented code. No placeholders. No TODOs. Every function fully implemented.

---

## TECH STACK
- **Runtime**: Deno (latest)
- **Framework**: Hono — `npm:hono`
- **ORM**: Prisma + Supabase PostgreSQL
- **Auth**: JWT (access token 15min + refresh token 7 days) via `jose`
- **Validation**: Zod
- **Password**: `npm:bcryptjs`
- **Real-time**: Deno WebSocket built-in
- **File Upload**: Cloudinary SDK
- **Email**: Resend API `npm:resend`
- **Cron**: `Deno.cron`

---

## PROJECT STRUCTURE

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rbac.ts
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   ├── modules/
│   │   ├── auth/         (routes, controller, service, schema)
│   │   ├── users/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── comments/
│   │   ├── activity/
│   │   ├── notifications/
│   │   └── analytics/
│   ├── websocket/
│   │   └── ws.handler.ts
│   ├── cron/
│   │   └── deadline.cron.ts
│   └── utils/
│       ├── jwt.ts
│       ├── response.ts
│       └── pagination.ts
├── deno.json
└── .env.example
```

---

## PRISMA SCHEMA — generate complete `prisma/schema.prisma`

Models required:
- **User**: id(cuid), name, email(unique), password, role(ADMIN|PROJECT_MANAGER|TEAM_MEMBER), avatar?, createdAt, updatedAt → relations: projectMembers, assignedTasks, createdTasks, comments, notifications, activities, refreshTokens
- **Project**: id, name, description?, deadline(DateTime), status(ACTIVE|COMPLETED|ON_HOLD), createdById, timestamps → relations: members, tasks, activities
- **ProjectMember**: id, projectId, userId, joinedAt → @@unique([projectId, userId])
- **Task**: id, title, description?, projectId, assignedToId?, createdById, dueDate, priority(HIGH|MEDIUM|LOW), status(TODO|IN_PROGRESS|COMPLETED), timestamps → relations: project, assignedTo, createdBy, comments, attachments
- **Comment**: id, content, taskId, userId, createdAt
- **Attachment**: id, url, filename, taskId, createdAt
- **ActivityLog**: id, action, entity, entityId, userId, projectId?, metadata(Json?), createdAt
- **Notification**: id, userId, title, message, isRead(false), type, createdAt
- **RefreshToken**: id, token(unique), userId, expiresAt, createdAt

---

## ALL API ENDPOINTS

### `/api/auth` — Public
- POST `/register` — Register, hash password, return tokens
- POST `/login` — Validate credentials, return accessToken + refreshToken
- POST `/refresh` — Verify refreshToken in DB, return new accessToken
- POST `/logout` — Delete refreshToken from DB
- GET `/me` — Return current user (requires auth middleware)

### `/api/users` 
- GET `/` — All users (Admin only)
- GET `/:id` — User profile (Auth)
- PATCH `/:id` — Update own profile (Auth, own only)
- DELETE `/:id` — Delete user (Admin)
- GET `/:id/workload` — { totalTasks, completedTasks, pendingTasks, inProgressTasks, tasks[] }

### `/api/projects`
- GET `/` — List with filters + pagination
- POST `/` — Create (PM+)
- GET `/:id` — Project detail with member count, task stats
- PATCH `/:id` — Update (PM+)
- DELETE `/:id` — Delete + cascade (Admin/PM)
- POST `/:id/members` — Add member { userId } (PM+)
- DELETE `/:id/members/:userId` — Remove member (PM+)
- GET `/:id/members` — Member list with workload
- GET `/:id/activity` — Latest 20 activity logs
- GET `/:id/stats` — { totalTasks, completedTasks, completionPercent, overdueTasks, memberCount }

### `/api/tasks`
- GET `/` — List with full filtering (see Query Features below)
- POST `/` — Create with validations
- GET `/:id` — Task detail with comments, attachments
- PATCH `/:id` — Update task
- DELETE `/:id` — Delete task
- PATCH `/:id/status` — Quick status update { status }
- GET `/project/:projectId` — Tasks for project
- POST `/:id/attachments` — Upload via multipart, save to Cloudinary

### `/api/comments`
- GET `/task/:taskId` — All comments for task
- POST `/task/:taskId` — Add comment { content }
- DELETE `/:id` — Delete own comment

### `/api/analytics`
- GET `/dashboard` — { totalProjects, totalTasks, completedTasks, pendingTasks, overdueTasks, recentActivities[], upcomingDeadlines[], highPriorityTasks[], memberWorkload[] }
- GET `/tasks-by-priority` — [{ priority, count }]
- GET `/project-progress` — [{ projectId, name, completionPercent, totalTasks }]
- GET `/team-productivity` — [{ userId, name, completedTasks, totalTasks, productivity% }]

### `/api/notifications`
- GET `/` — User's notifications (paginated)
- PATCH `/:id/read` — Mark read
- PATCH `/read-all` — Mark all read

---

## VALIDATION RULES (implement in service layer, throw HTTPException)

```
Task create/update:
1. title unique in project → 409 "This task already exists in the project."
2. dueDate >= today → 400 "Please select a valid deadline."
3. Cannot reassign COMPLETED task → 400 "Completed tasks cannot be reassigned."
4. assignedTo must be project member → 403 "User is not a member of this project."

Project:
5. deadline must not be past → 400 "Project deadline cannot be in the past."
6. name unique per user → 409 "Project with this name already exists."
```

---

## STANDARDIZED RESPONSE FORMAT

Always return:
```typescript
// Success: { success: true, message: string, data: any }
// List: { success: true, message: string, data: any[], meta: { page, limit, total, totalPages } }
// Error: { success: false, message: string }
```

---

## QUERY PARAMETERS (all list endpoints)

```
?page=1&limit=10
&search=text          ← searches title + description
&status=IN_PROGRESS
&priority=HIGH
&projectId=xxx
&assignedToId=xxx
&deadlineStatus=overdue|upcoming   ← overdue=past due, upcoming=within 3 days
&sortBy=dueDate|createdAt|priority|updatedAt
&sortOrder=asc|desc
```

---

## WEBSOCKET HANDLER

```typescript
// ws.handler.ts
// Maintain Map<string, WebSocket[]> for rooms: "project:{id}" and "user:{id}"
// Events to emit after mutations:
// task:created, task:updated, task:deleted, task:status → broadcast to project room
// notification → send to specific user room
// activity → broadcast to project room
// All messages: JSON.stringify({ event, data, timestamp })
```

---

## ACTIVITY LOG HELPER

Auto-call after every mutation:
```typescript
// Format: action="created"|"updated"|"deleted"|"assigned"|"status_changed"|"member_added"|"member_removed"|"commented"
// entity="Project"|"Task"|"Comment"|"Member"
// message generated: "{userName} {past_tense_action} {entity} '{entityName}'"
// Store in ActivityLog + emit WebSocket "activity" event
```

---

## CRON JOB

```typescript
// deadline.cron.ts — runs "0 9 * * *" (9 AM daily)
// 1. Query tasks where dueDate is within next 24 hours AND status != COMPLETED
// 2. For each: create Notification record for assignedTo user
// 3. Send email via Resend with task details
// 4. Emit WebSocket "notification" event to user room
```

---

## RBAC MIDDLEWARE

```typescript
// Roles hierarchy: ADMIN > PROJECT_MANAGER > TEAM_MEMBER
// Admin: full access
// PM: create/edit projects and tasks, add/remove members
// Member: view project data they're in, update only their own assigned tasks' status
// Implement as: requireRole(...roles: Role[]) middleware factory
```

---

## RATE LIMITING

```typescript
// In-memory Map<ip, { count, resetAt }>
// Limit: 100 requests per 15 minutes per IP
// Return 429 with "Too many requests. Try again in X minutes."
```

---

## ENV VARIABLES (.env.example)

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=your-secret-256-bit
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
PORT=8000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

---

## deno.json

```json
{
  "tasks": {
    "dev": "deno run --allow-net --allow-env --allow-read --allow-write src/index.ts",
    "db:generate": "deno run --allow-all npm:prisma generate",
    "db:migrate": "deno run --allow-all npm:prisma migrate dev",
    "db:seed": "deno run --allow-all src/config/seed.ts"
  },
  "imports": {
    "hono": "npm:hono",
    "hono/": "npm:hono/",
    "@prisma/client": "npm:@prisma/client",
    "zod": "npm:zod",
    "bcryptjs": "npm:bcryptjs",
    "jose": "npm:jose",
    "resend": "npm:resend",
    "cloudinary": "npm:cloudinary"
  }
}
```

---

## SEED DATA

Create `src/config/seed.ts` that seeds:
- 1 Admin user: admin@demo.com / Admin@123
- 1 Project Manager: pm@demo.com / PM@123  
- 3 Team Members: member1@demo.com, member2@demo.com, member3@demo.com / Member@123
- 3 sample projects
- 10 sample tasks distributed across projects
- Sample activity logs

---

## OUTPUT REQUIRED — GENERATE ALL FILES COMPLETELY

Generate every file with full working implementation. Include all imports. Handle all errors with try/catch and proper HTTP status codes. Use Prisma transactions where multiple DB operations must be atomic. Every service function must log activity after successful mutations.
