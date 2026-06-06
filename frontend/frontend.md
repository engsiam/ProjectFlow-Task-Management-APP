You are a senior frontend engineer and product designer. Build a premium Fresh
Framework frontend for a Smart Project & Task Collaboration System.

## Tech Stack

- Framework: Fresh
- Runtime: Deno
- Language: TypeScript
- Styling: Tailwind CSS or clean CSS with design tokens
- Architecture: Fresh routes + islands
- Backend API: `https://projectflow-backend.engsiam.deno.net/api`
- API docs: `https://projectflow-backend.engsiam.deno.net/docs`

## Product Goal

Build the logged-in product experience for a team collaboration platform. Users
should be able to manage projects, tasks, members, comments, notifications,
analytics, and work progress.

This must look and feel like a premium SaaS dashboard, not a landing page.

## Main UX Principle

The first screen after login must be the real dashboard. Do not create a
marketing homepage as the primary experience.

The app should feel useful, polished, fast, responsive, and competition-ready.

## Required Pages

### 1. Auth

- Signup page
- Login page
- Demo login buttons for seeded users
- Form validation
- API error states
- Password visibility toggle
- Loading states
- Persist auth session
- Redirect logged-in users to dashboard
- Redirect logged-out users to login

Demo users:

```txt
Owner: owner@example.com / Password123!
Manager: manager@example.com / Password123!
Member: member@example.com / Password123!
Viewer: viewer@example.com / Password123!
```

### 2. Main App Layout

- Sidebar navigation
- Topbar
- Global search
- Notification bell with unread badge
- Theme toggle
- User menu
- API/system status indicator using backend `/health`
- Responsive mobile navigation
- Protected route handling
- Loading states
- Empty states

### 3. Dashboard

Include:

- Project overview cards
- Task status summary
- Task priority summary
- Overdue task warning
- Recent activity feed
- Project progress chart
- My assigned tasks
- Team workload chart
- Quick actions: create project, create task, invite member

### 4. Projects

- Project list
- Project cards/table toggle
- Create project modal
- Project detail page
- Project members
- Project progress
- Project activity log
- Archive/delete project actions with confirmation
- Role-aware controls

### 5. Project Detail

Include tabs:

- Overview
- Board
- Tasks
- Members
- Activity
- Analytics

Header should show:

- Project name
- Status
- Progress percentage
- Member avatars
- Owner/manager controls

### 6. Kanban Board

Columns:

- TODO
- IN_PROGRESS
- REVIEW
- DONE

Requirements:

- Drag and drop task movement
- Smooth movement feedback
- Reorder inside column
- Task cards with title, priority, assignee, due date, labels, comment count
- Quick status update fallback if drag/drop fails
- Empty column state
- Optimistic UI update with rollback on API error

### 7. Tasks

- Task list view
- Table/list filters
- Search tasks
- Filter by assignee, status, priority, due date, label
- Create task modal
- Edit task modal
- Assign members
- Set priority
- Set due date
- Add labels
- Delete task confirmation

### 8. Task Detail

- Task title
- Description
- Status
- Priority
- Due date
- Assignee
- Labels
- Comments
- Add/edit/delete comment
- `@mention` UI
- Activity timeline

### 9. Members

- Project member list
- Invite member by email
- Role badge
- Change role
- Remove member
- Pending invitations
- Role-aware disabled states

### 10. Notifications

- Notification dropdown
- Notification page
- Mark one as read
- Mark all as read
- Unread count badge
- Empty state

### 11. Settings/Profile

- Update name
- Update avatar URL
- Theme preference
- Logout

## API Integration

Create:

```txt
lib/api.ts
lib/auth.ts
lib/constants.ts
lib/types.ts
lib/theme.ts
```

Requirements:

- Reusable API client
- Attach access token to protected requests
- Handle `401` by redirecting to login
- Use typed API response shape
- Show toast on errors
- Use real API data
- Avoid hardcoded mock data except for skeleton placeholders or demo fallback
  states
- Make all important actions call backend APIs

## Design System

Use this color system:

```txt
Primary: #2C5EAD
Accent: #1591DC
Info: #4BB8FA
Soft Surface: #C4E2F5
Light BG: #F8FAFC
Light Surface: #FFFFFF
Light Border: #E2E8F0
Light Text: #0F172A
Muted Text: #64748B
Dark BG: #0B1220
Dark Surface: #111827
Dark Card: #172033
Dark Border: #263247
Text Light: #F8FAFC
Text Muted: #94A3B8
Success: #22C55E
Warning: #F59E0B
Danger: #EF4444
```

## Dark Mode Rules

- Do not use pure black.
- Use deep navy background.
- Cards should use dark blue-gray surfaces.
- Borders should be subtle.
- Text must have strong contrast.
- Use subtle blue highlight for selected states.
- Use soft accent glow only where useful.
- Dark mode must feel like a premium night workspace, not a black page.
- Every page and modal must work in dark mode.

## UI Quality Requirements

- Premium SaaS dashboard feel.
- Clean, professional, information-dense layout.
- Use real app screens, not marketing sections.
- Rounded corners around 8px.
- No giant hero sections.
- No random decorative illustrations.
- No excessive gradients.
- No plain black dark mode.
- No cards inside cards.
- Good spacing and alignment.
- Mobile responsive.
- Accessible labels.
- Keyboard-friendly modals and buttons.
- Visible focus states.
- Proper hover, active, disabled, loading states.
- Text must not overflow buttons/cards.

## Components

Create reusable components:

- AppShell
- Sidebar
- Topbar
- Button
- Input
- Select
- Modal
- ConfirmDialog
- Toast
- Badge
- Avatar
- ProgressBar
- StatCard
- EmptyState
- Skeleton
- Tabs
- Dropdown
- TaskCard
- KanbanColumn
- ActivityTimeline
- NotificationMenu
- SystemStatus
- ThemeToggle

## Islands

Use Fresh islands for interactive parts:

- LoginForm
- SignupForm
- ThemeToggle
- NotificationDropdown
- ProjectCreateModal
- TaskCreateModal
- TaskEditModal
- KanbanBoard
- TaskFilters
- CommentBox
- InviteMemberModal
- ConfirmDialog
- ToastProvider
- SearchCommand
- SystemStatus

## Extra Features for Competition Polish

### 1. Demo Mode

- Add demo login buttons on login page.
- Explain demo users in UI subtly.
- Let judges enter quickly.

### 2. Audit Timeline

- Show activity timeline in project detail.
- Use action icons and readable timestamps.
- Make it visually polished.

### 3. System Status

- Use backend `/health`.
- Show small status indicator in topbar.
- Show "API online" or "API offline" with retry state.

### 4. Swagger Link

- Add a developer-friendly link to backend Swagger docs in settings or sidebar
  footer.
- Link: `https://projectflow-backend.engsiam.deno.net/docs`

## Folder Structure

Use this structure:

```txt
routes/
  index.tsx
  login.tsx
  signup.tsx
  dashboard.tsx
  projects/
  tasks/
  notifications.tsx
  settings.tsx
components/
islands/
lib/
types/
static/
```

## Data and State

- Use real backend API calls.
- Use loading skeletons while fetching.
- Use empty states when no data exists.
- Use optimistic UI for Kanban movement.
- Roll back optimistic UI on API failure.
- Use toasts for success/error.
- Keep components small and clean.

## Final Acceptance Criteria

- User can signup/login.
- Demo login works.
- Dashboard loads backend data.
- User can create project.
- User can invite members.
- User can create/edit/move tasks.
- Kanban drag/drop works.
- Comments and mentions UI work.
- Notifications display unread count.
- Activity timeline displays real data.
- Analytics page displays useful summaries.
- Dark/light mode both look premium.
- Mobile layout is usable.
- API offline state is handled.
- Code is clean, typed, and organized.

Now generate the full Fresh frontend project with clean code and all required
files.
