You are a senior backend engineer. Build a production-quality backend for a Smart Project & Task
Collaboration System.

## Tech Stack

- Runtime: Deno
- Framework: Hono
- ORM: Prisma
- Database: MongoDB
- Validation: Zod
- Auth: JWT access token + refresh token
- Password hashing: bcrypt or argon2
- API Docs: Swagger / OpenAPI
- Architecture: clean modular architecture

## Product Goal

Build a backend API for a team collaboration platform where users can create projects, manage tasks,
invite members, assign roles, track progress, comment on tasks, receive notifications, view
analytics, and export reports.

This project must be competition-ready, clean, secure, documented, and easy for judges to test.

## MongoDB + Prisma Requirements

- Use MongoDB as the database.
- Use Prisma ORM with MongoDB provider.
- Prisma IDs must use MongoDB ObjectId style.
- Use correct `@db.ObjectId`, `@map("_id")`, and relation reference fields.
- Use proper references between users, projects, project members, invitations, tasks, comments,
  mentions, notifications, activity logs, and refresh tokens.
- Include a complete `schema.prisma` configured for MongoDB.
- Use Prisma for all database operations.

## Core Modules

### 1. Authentication

- Signup
- Login
- Refresh access token
- Logout
- Get current user profile
- Secure password hashing
- JWT auth middleware
- Store refresh tokens securely
- Prevent duplicate email signup
- Return proper auth errors
- Add rate limiting on auth routes

### 2. Users

- Get current user
- Update profile
- Avatar URL support
- Search users by email/name for project invites
- Public user preview object should never expose password or secrets

### 3. Projects

- Create project
- Update project
- Archive project
- Delete project if allowed
- List my projects
- Get project details
- Project status: ACTIVE, COMPLETED, ARCHIVED
- Project owner and members
- Project progress percentage

### 4. Team Members and Invitations

- Invite member to project by email
- Accept invitation
- Reject invitation
- Remove member
- Change member role
- Roles: OWNER, MANAGER, MEMBER, VIEWER
- Role-based access control middleware
- Only OWNER can delete/archive project and change high-level roles
- OWNER and MANAGER can manage tasks and members
- MEMBER can work on assigned tasks and comment
- VIEWER can only read

### 5. Tasks

- Create task
- Update task
- Delete task
- Assign task to user
- Task status: TODO, IN_PROGRESS, REVIEW, DONE
- Priority: LOW, MEDIUM, HIGH, URGENT
- Due date
- Labels/tags
- Kanban ordering field
- Move task between Kanban columns
- Reorder task inside column
- Filter by project, assignee, status, priority, due date, label
- Search by title/description
- Pagination and sorting

### 6. Comments and Mentions

- Add comment to task
- Edit own comment
- Delete own comment
- Mention users using `@username`
- Store mentions
- Notify mentioned users
- Keep task comment count accurate

### 7. Activity Log / Audit Timeline

Track important actions:

- Project created
- Project updated
- Project archived
- Task created
- Task updated
- Task moved
- Task completed
- Member invited
- Member accepted invitation
- Member removed
- Role changed
- Comment added

Store:

- actor user
- action
- entity type
- entity ID
- metadata
- timestamp

### 8. Notifications

- Store notifications in MongoDB
- Notify when assigned to task
- Notify when mentioned
- Notify when invited to project
- Notify when task status changes if relevant
- List notifications
- List unread notifications
- Mark one as read
- Mark all as read
- Include unread count endpoint

### 9. Dashboard Analytics

Create endpoints for:

- Project count
- Task count by status
- Task count by priority
- Overdue tasks
- Completed tasks
- My assigned tasks
- Member workload
- Project progress percentage
- Recent activity
- Team productivity summary

### 10. Export

- Export project tasks as CSV
- Include title, status, priority, assignee, due date, labels, created date
- Secure route only for project OWNER or MANAGER

### 11. Health and System Status

- Add `/health` endpoint.
- Return API status, database status, runtime, timestamp, and version.
- This endpoint must be public.
- Frontend should be able to use this as a system status indicator.

## Swagger / OpenAPI Requirements

Swagger is mandatory.

- Add Swagger UI route at `/docs`.
- Add OpenAPI JSON route at `/openapi.json`.
- Every API endpoint must be documented.
- Swagger must include:
  - endpoint summary
  - description
  - request body schema
  - route params schema
  - query schema
  - success response schema
  - error response schemas
  - example request payloads
  - example responses
  - JWT Bearer authentication support

Protected routes must show an Authorization button in Swagger.

All APIs must be testable directly from Swagger UI.

Use `@hono/zod-openapi` and `@hono/swagger-ui` if suitable.

## Swagger Example Payloads

Add examples for:

- Signup
- Login
- Refresh token
- Create project
- Invite member
- Accept invitation
- Create task
- Update task
- Move task status
- Reorder Kanban task
- Add comment
- Mark notification as read
- Export CSV

## Required API Shape

Use consistent success response:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Use consistent error response:

```json
{
  "success": false,
  "message": "Error message",
  "error": {}
}
```

Return correct HTTP status codes.

## Suggested Route Groups

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users/search`
- `PATCH /api/users/me`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `POST /api/projects/:projectId/archive`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/invitations`
- `POST /api/invitations/:invitationId/accept`
- `POST /api/invitations/:invitationId/reject`
- `PATCH /api/projects/:projectId/members/:memberId/role`
- `DELETE /api/projects/:projectId/members/:memberId`
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `GET /api/tasks/:taskId`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `POST /api/tasks/:taskId/move`
- `POST /api/tasks/:taskId/reorder`
- `GET /api/tasks/:taskId/comments`
- `POST /api/tasks/:taskId/comments`
- `PATCH /api/comments/:commentId`
- `DELETE /api/comments/:commentId`
- `GET /api/projects/:projectId/activity`
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:notificationId/read`
- `PATCH /api/notifications/read-all`
- `GET /api/dashboard`
- `GET /api/projects/:projectId/analytics`
- `GET /api/projects/:projectId/export/tasks.csv`

## Folder Structure

Use this structure:

```txt
src/
  app.ts
  server.ts
  config/
    env.ts
    cors.ts
  docs/
    openapi.ts
  routes/
  controllers/
  services/
  middleware/
  validators/
  utils/
  prisma/
    client.ts
  types/
prisma/
  schema.prisma
  seed.ts
```

## Environment Variables

Create `.env.example`:

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

## Seed Data

Add seed script with realistic demo data:

- 5 users
- 3 projects
- members with different roles
- invitations
- tasks across all Kanban statuses
- comments with mentions
- notifications
- activity logs

Add demo credentials in README:

```txt
Owner: owner@example.com / Password123!
Manager: manager@example.com / Password123!
Member: member@example.com / Password123!
Viewer: viewer@example.com / Password123!
```

Seeded data must work immediately with Swagger testing.

## Testing Requirements

- Add README testing instructions.
- Explain how to test APIs with Swagger UI.
- Explain auth flow:
  1. open `/docs`
  2. call login
  3. copy access token
  4. click Authorize
  5. test protected APIs
- Add endpoint list.
- Add expected responses.
- Add common error examples.

## README Requirements

README must include:

- Project overview
- Feature list
- Tech stack
- Folder structure
- Environment setup
- MongoDB setup
- Prisma generate command
- Prisma db push command
- Seed command
- Development run command
- Swagger docs URL
- OpenAPI JSON URL
- Demo credentials
- Auth testing guide
- Role testing guide
- API endpoint list
- Deployment notes

## Implementation Rules

- Do not create fake placeholder logic.
- Implement real MongoDB + Prisma queries.
- Keep business logic in services, not route files.
- Keep controllers thin.
- Use Zod validation before service calls.
- Use centralized error handling.
- Use typed request context for authenticated user.
- Never expose password hashes or refresh tokens.
- Add clean helper utilities for pagination, CSV, tokens, password hashing, and API responses.
- Add comments only where necessary.
- Code must be clean, typed, secure, and production-style.
- The backend must be ready to connect with a Fresh frontend.

Now generate the full backend project with all necessary files.
