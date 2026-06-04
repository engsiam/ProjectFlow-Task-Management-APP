\# FRONTEND DEVELOPMENT PROMPT

\## Stack: Deno Fresh Framework + Preact + Tailwind CSS



You are an expert frontend engineer specializing in Deno Fresh. Build a \*\*complete, production-ready frontend\*\* for a Smart Project \& Task Collaboration System. Write clean, modular code with exceptional UI/UX. No placeholders. Every component fully implemented and connected to the backend API.



\---



\## TECH STACK

\- \*\*Framework\*\*: Deno Fresh (latest) — file-based routing + Islands architecture

\- \*\*UI Components\*\*: Preact (Fresh default)

\- \*\*Styling\*\*: Tailwind CSS (Fresh plugin)

\- \*\*State\*\*: Preact Signals (`@preact/signals`)

\- \*\*HTTP Client\*\*: `fetch` with typed wrappers

\- \*\*Charts\*\*: Chart.js via CDN in islands

\- \*\*Drag \& Drop\*\*: `@dnd-kit` or native HTML5 DnD API

\- \*\*Icons\*\*: Heroicons (inline SVG)

\- \*\*Notifications\*\*: Custom toast system

\- \*\*Theme\*\*: CSS variables (dark/light)

\- \*\*Forms\*\*: Controlled components with Zod validation (client-side mirror of backend)



\---



\## COLOR SYSTEM — MANDATORY



Use EXACTLY these colors. Define as CSS variables:



```css

:root {

&#x20; /\* Brand Blues \*/

&#x20; --blue-900: #2C5EAD;   /\* Primary dark blue — sidebar, headers \*/

&#x20; --blue-600: #1591DC;   /\* Primary blue — buttons, links, active states \*/

&#x20; --blue-400: #4BB8FA;   /\* Accent blue — highlights, badges, hover \*/

&#x20; --blue-100: #C4E2F5;   /\* Light blue — backgrounds, subtle fills \*/



&#x20; /\* Light Mode \*/

&#x20; --bg-primary: #F0F7FF;       /\* Main page background \*/

&#x20; --bg-secondary: #FFFFFF;     /\* Card/panel background \*/

&#x20; --bg-tertiary: #E8F4FD;      /\* Subtle section background \*/

&#x20; --text-primary: #0F2A4A;     /\* Main text \*/

&#x20; --text-secondary: #4A6FA5;   /\* Muted text \*/

&#x20; --text-muted: #8AAFD4;       /\* Placeholder text \*/

&#x20; --border: #C4E2F5;           /\* Border color \*/

&#x20; --shadow: rgba(44, 94, 173, 0.12);  /\* Shadow \*/



&#x20; /\* Semantic \*/

&#x20; --success: #10B981;

&#x20; --warning: #F59E0B;

&#x20; --danger: #EF4444;

&#x20; --info: #1591DC;

}



\[data-theme="dark"] {

&#x20; --bg-primary: #0A1628;       /\* Deep navy — main background \*/

&#x20; --bg-secondary: #0F2040;     /\* Card background \*/

&#x20; --bg-tertiary: #162D52;      /\* Elevated surface \*/

&#x20; --text-primary: #E8F4FD;     /\* Near-white text \*/

&#x20; --text-secondary: #90BAE4;   /\* Muted text \*/

&#x20; --text-muted: #4A6FA5;       /\* Disabled/placeholder \*/

&#x20; --border: #1E3A6E;           /\* Subtle border \*/

&#x20; --shadow: rgba(0, 0, 0, 0.4);

&#x20; /\* Blues stay same — they work in both modes \*/

}

```



\*\*DARK MODE RULES:\*\*

\- NEVER use pure black (#000) for backgrounds — use deep navy shades

\- Sidebar in dark: `--blue-900` with slight transparency overlay

\- Cards in dark: `--bg-secondary` (#0F2040) with `--border` borders

\- Text always readable: minimum 4.5:1 contrast ratio

\- Buttons: same blue, slightly brighter on dark hover

\- Active nav items: `--blue-400` text on dark, `--blue-600` bg with opacity



\---



\## TYPOGRAPHY



```css

/\* Import in \_app.tsx \*/

@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800\&family=JetBrains+Mono:wght@400;500\&display=swap');



body { font-family: 'Plus Jakarta Sans', sans-serif; }

code, pre { font-family: 'JetBrains Mono', monospace; }



/\* Scale \*/

\--text-xs: 0.75rem;

\--text-sm: 0.875rem;

\--text-base: 1rem;

\--text-lg: 1.125rem;

\--text-xl: 1.25rem;

\--text-2xl: 1.5rem;

\--text-3xl: 1.875rem;

```



\---



\## PROJECT STRUCTURE



```

frontend/

├── routes/

│   ├── \_app.tsx              # Root: theme provider, font, globals

│   ├── \_layout.tsx           # Auth layout wrapper

│   ├── index.tsx             # Redirect to /dashboard or /login

│   ├── login.tsx             # Login page (SSR)

│   ├── register.tsx          # Register page (SSR)

│   └── (app)/

│       ├── \_layout.tsx       # App shell: sidebar + header

│       ├── dashboard.tsx     # Dashboard page

│       ├── projects/

│       │   ├── index.tsx     # Projects list

│       │   ├── new.tsx       # Create project

│       │   └── \[id]/

│       │       ├── index.tsx     # Project detail

│       │       ├── tasks.tsx     # Project tasks (Kanban)

│       │       └── members.tsx   # Project members

│       ├── tasks/

│       │   └── index.tsx     # All tasks view

│       ├── team/

│       │   └── index.tsx     # Team members + workload

│       ├── analytics/

│       │   └── index.tsx     # Charts page

│       └── settings/

│           └── index.tsx     # Profile + preferences

├── islands/

│   ├── ThemeToggle.tsx       # Dark/light toggle (interactive)

│   ├── AuthForm.tsx          # Login/Register form with validation

│   ├── Sidebar.tsx           # Navigation sidebar

│   ├── Header.tsx            # Top header with search + notifications

│   ├── Dashboard/

│   │   ├── KPICards.tsx      # Animated stat cards

│   │   ├── ActivityFeed.tsx  # Live activity log

│   │   ├── UpcomingDeadlines.tsx

│   │   └── Charts.tsx        # Chart.js charts

│   ├── Projects/

│   │   ├── ProjectCard.tsx   # Project card with progress bar

│   │   ├── ProjectForm.tsx   # Create/edit modal

│   │   ├── ProjectList.tsx   # Filterable project list

│   │   └── ProjectStats.tsx  # Project detail stats

│   ├── Tasks/

│   │   ├── KanbanBoard.tsx   # Drag \& drop Kanban (TODO/IN\_PROGRESS/DONE)

│   │   ├── TaskCard.tsx      # Task card for Kanban + list view

│   │   ├── TaskForm.tsx      # Create/edit task modal

│   │   ├── TaskFilters.tsx   # Filter panel

│   │   └── TaskList.tsx      # Table/list view with sort

│   ├── Team/

│   │   ├── MemberCard.tsx    # Member with workload bar

│   │   └── WorkloadSummary.tsx

│   ├── Notifications/

│   │   └── NotificationDropdown.tsx  # Bell icon dropdown

│   ├── Comments/

│   │   └── CommentThread.tsx  # Comment list + add form

│   ├── FileUpload.tsx        # Drag-drop file attachment

│   ├── SearchBar.tsx         # Global search with debounce

│   ├── Toast.tsx             # Toast notification system

│   └── WebSocketProvider.tsx # WS connection + event handling

├── components/

│   ├── ui/

│   │   ├── Button.tsx        # Button variants: primary, secondary, ghost, danger

│   │   ├── Input.tsx         # Styled input with error state

│   │   ├── Select.tsx        # Custom select dropdown

│   │   ├── Modal.tsx         # Portal modal with backdrop

│   │   ├── Badge.tsx         # Status/priority badges

│   │   ├── Avatar.tsx        # User avatar with initials fallback

│   │   ├── Card.tsx          # Base card component

│   │   ├── ProgressBar.tsx   # Animated progress bar

│   │   ├── Skeleton.tsx      # Loading skeleton

│   │   ├── Dropdown.tsx      # Generic dropdown menu

│   │   ├── Pagination.tsx    # Page navigation

│   │   ├── EmptyState.tsx    # No data illustration

│   │   └── Tooltip.tsx       # Hover tooltip

│   └── layouts/

│       ├── AppShell.tsx      # Sidebar + main content layout

│       └── AuthLayout.tsx    # Centered auth layout

├── lib/

│   ├── api/

│   │   ├── client.ts         # Base fetch wrapper with auth headers

│   │   ├── auth.ts           # Auth API calls

│   │   ├── projects.ts       # Project API calls

│   │   ├── tasks.ts          # Task API calls

│   │   ├── users.ts          # User API calls

│   │   ├── analytics.ts      # Analytics API calls

│   │   └── notifications.ts  # Notification API calls

│   ├── store/

│   │   ├── auth.store.ts     # Auth state (signals)

│   │   ├── theme.store.ts    # Theme state

│   │   └── ws.store.ts       # WebSocket state

│   ├── hooks/

│   │   ├── useDebounce.ts

│   │   ├── usePagination.ts

│   │   └── useIntersection.ts

│   └── utils/

│       ├── date.ts           # Format dates, check overdue

│       ├── validation.ts     # Client-side Zod schemas

│       └── cn.ts             # className utility

├── static/

│   ├── styles.css            # Global CSS variables + resets

│   └── fonts/                # Self-hosted fallback fonts

├── fresh.config.ts

└── tailwind.config.ts

```



\---



\## DESIGN SYSTEM COMPONENTS



\### Button Component

```

Variants: primary | secondary | ghost | danger | outline

Sizes: sm | md | lg

States: loading (spinner), disabled

Always include hover/active transitions (150ms ease)

Primary: bg-\[#1591DC] hover:bg-\[#2C5EAD] text-white

Secondary: bg-\[#C4E2F5] hover:bg-\[#4BB8FA] text-\[#0F2A4A]

Ghost: transparent hover:bg-blue-50/10

```



\### Badge Component

```

Priority badges:

&#x20; HIGH → red-500 bg + text

&#x20; MEDIUM → amber-500 bg + text  

&#x20; LOW → emerald-500 bg + text



Status badges:

&#x20; TODO → gray bg

&#x20; IN\_PROGRESS → blue-400 bg (--blue-400)

&#x20; COMPLETED → emerald bg



Project status:

&#x20; ACTIVE → blue-600 bg

&#x20; ON\_HOLD → amber bg

&#x20; COMPLETED → emerald bg

```



\### Card Component

```

Light: bg-white border border-\[--border] shadow-sm rounded-xl

Dark: bg-\[--bg-secondary] border border-\[--border] rounded-xl

Hover state: shadow-md transform translateY(-2px) transition-all

```



\---



\## PAGE DESIGNS



\### Login / Register Page

\- Split layout: left side = blue gradient mesh with product tagline, right = form

\- Left bg: radial gradient from #1591DC to #2C5EAD with floating geometric shapes

\- Form: white card with subtle shadow (light) / dark navy card (dark)

\- Input focus: blue ring using --blue-400

\- Demo Login button: outlined variant, pre-fills email/password

\- Smooth slide-in animation on load



\### Dashboard Page

Layout: 

```

\[Header: breadcrumb + actions]

\[KPI Row: 5 stat cards]

\[Row: Project Progress (chart) | Recent Activity]

\[Row: Upcoming Deadlines | High Priority Tasks | Team Workload]

```

KPI Cards: icon + number (animated count-up) + label + trend indicator

Each card has left colored border accent: blue-900 / blue-600 / blue-400 / success / danger



\### Projects Page

\- Grid view (3 cols) with toggle to list view

\- Each ProjectCard: name, description truncated, deadline, status badge, member avatars (stacked), progress bar, task count

\- Progress bar: gradient fill from --blue-600 to --blue-400

\- Filter sidebar: status, deadline range

\- Create button: prominent primary button top-right



\### Kanban Board (Tasks)

\- 3 columns: TODO / IN PROGRESS / COMPLETED

\- Column headers: colored top border + task count badge

\- Task cards: priority badge, title, assignee avatar, due date, comment count

\- Drag between columns to update status → optimistic update + API call

\- Column TODO: border-gray, IN\_PROGRESS: border-\[--blue-600], COMPLETED: border-emerald

\- Add task button at bottom of each column



\### Task Card (in Kanban)

```

┌─────────────────────────────┐

│ \[HIGH] tag                  │

│ Task Title here             │

│ Project Name                │

├─────────────────────────────┤

│ \[Avatar] John Doe  📅 Dec 5  │

│ 💬 3    📎 2                 │

└─────────────────────────────┘

```



\### Team Page

\- Member grid: avatar (large, with online dot), name, role badge, task completion ring chart, workload bar

\- Workload bar: red if >80%, amber if >60%, green otherwise

\- Click member → slide panel showing their tasks



\### Analytics Page

Charts to render with Chart.js:

1\. \*\*Doughnut\*\*: Task Status Distribution (TODO/IN\_PROGRESS/DONE) — blue palette

2\. \*\*Bar\*\*: Tasks by Priority (HIGH/MEDIUM/LOW) — blue gradient bars

3\. \*\*Line\*\*: Project Progress Trend (last 7 days) — smooth curve, blue fill

4\. \*\*Horizontal Bar\*\*: Team Productivity (tasks completed per member)

All charts: custom blue color scheme matching --blue-900, --blue-600, --blue-400, --blue-100



\---



\## SIDEBAR DESIGN



```

Width: 260px (collapsed: 72px)

Background light: linear-gradient(180deg, #2C5EAD 0%, #1591DC 100%)

Background dark: #0F2040 with #1E3A6E border-right



Logo area: top 64px, logo + "TaskFlow" wordmark

Nav items: icon + label, 48px height, 12px padding

&#x20; - inactive: white/70 opacity

&#x20; - active: white bg-white/20 rounded-lg white text

&#x20; - hover: bg-white/10 transition



Nav sections:

&#x20; 📊 Dashboard

&#x20; 📁 Projects

&#x20; ✅ Tasks  

&#x20; 👥 Team

&#x20; 📈 Analytics

&#x20; ⚙️ Settings



Bottom: user avatar + name + role badge + logout button



Collapsed state: show only icons, tooltip on hover

Toggle button: arrow icon at bottom of sidebar

```



\---



\## HEADER DESIGN



```

Height: 64px

Background: --bg-secondary with border-bottom

Left: Breadcrumb (Home > Projects > Project Name)

Center: Global SearchBar (Cmd+K shortcut)

Right: 

&#x20; \[ThemeToggle] \[NotificationBell (badge count)] \[UserAvatar dropdown]



SearchBar: 

&#x20; - Opens full-width overlay on focus

&#x20; - Shows: recent searches, project results, task results

&#x20; - Debounce 300ms

&#x20; - Keyboard navigation (arrow keys)



NotificationDropdown:

&#x20; - List of unread notifications

&#x20; - Mark as read on click

&#x20; - "Mark all read" button

&#x20; - Time ago format

```



\---



\## API CLIENT



```typescript

// lib/api/client.ts

// Base wrapper around fetch:

// - Auto-attach Authorization: Bearer {token} header

// - Auto-refresh token on 401

// - Return typed { data, error, meta } response

// - Handle network errors gracefully



export async function apiCall<T>(

&#x20; path: string,

&#x20; options: RequestInit = {}

): Promise<ApiResponse<T>>



// Specific clients:

// GET, POST, PUT, PATCH, DELETE wrappers

// All return: { success, data, message, meta? }

```



\---



\## AUTH FLOW



```

1\. Login → store accessToken in memory (signal) + refreshToken in httpOnly cookie

2\. Every API call → attach Bearer token

3\. On 401 → call /auth/refresh → update accessToken → retry original request

4\. On logout → clear memory + call /auth/logout → redirect /login

5\. Fresh route middleware: check auth signal in \_app.tsx, redirect if needed

6\. Token stored in: localStorage('accessToken') + refresh via cookie

```



\---



\## WEBSOCKET INTEGRATION



```typescript

// islands/WebSocketProvider.tsx

// Connect on app mount: ws://API\_URL/ws?token=JWT

// Handle events:

//   task:created → add to task list signal

//   task:updated → update task in signals

//   task:status → update Kanban column optimistically

//   notification → show toast + update notification badge

//   activity → prepend to activity feed

// Reconnect with exponential backoff on disconnect

// Show "Live" green dot in header when connected

```



\---



\## KANBAN DRAG \& DROP



```typescript

// islands/Tasks/KanbanBoard.tsx

// HTML5 Drag API approach (no external lib needed):

// - dragstart: set dragging task id + source column

// - dragover: highlight drop zone column

// - drop: 

//   1. Optimistic update (move card in UI)

//   2. PATCH /api/tasks/:id/status { status: newColumn }

//   3. On error: revert UI + show error toast

// Visual: dragging card shows ghost with 0.5 opacity

// Drop zone: blue-400 dashed border + bg-blue-50/10

```



\---



\## ANIMATIONS \& TRANSITIONS



```css

/\* Page transitions: fade-slide \*/

.page-enter { opacity: 0; transform: translateY(8px); }

.page-enter-active { opacity: 1; transform: translateY(0); transition: all 200ms ease; }



/\* Card hover \*/

.card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--shadow); }



/\* KPI count-up: use requestAnimationFrame to count from 0 to value over 800ms \*/



/\* Skeleton loading: shimmer animation \*/

@keyframes shimmer {

&#x20; 0% { background-position: -200% 0; }

&#x20; 100% { background-position: 200% 0; }

}



/\* Sidebar item active: slide-in left border \*/

/\* Notification badge: pulse animation \*/

/\* Kanban drag: scale(1.03) + rotate(1deg) \*/

```



\---



\## TOAST NOTIFICATION SYSTEM



```typescript

// islands/Toast.tsx

// Position: bottom-right, stack up to 5

// Types: success (green), error (red), info (blue), warning (amber)

// Auto-dismiss: 4 seconds

// Manual dismiss: X button

// Animation: slide-in from right, slide-out right

// API: toast.success("Task created!") / toast.error("Failed")

```



\---



\## FORM VALIDATION



All forms must validate client-side with matching rules:

```

\- Task title: required, min 3 chars, max 100 chars

\- Due date: must be today or future

\- Project deadline: must be future

\- Password: min 8 chars, uppercase + number required

\- Email: valid format

Show errors inline below each field, red color, shake animation on submit-fail

```



\---



\## RESPONSIVE DESIGN



```

Desktop (1280px+): full sidebar + content

Tablet (768-1279px): collapsed sidebar (icons only)

Mobile (<768px): bottom navigation bar, hidden sidebar

Breakpoints via Tailwind: sm, md, lg, xl

Cards: 3-col → 2-col → 1-col

Kanban: horizontal scroll on mobile

Tables: horizontal scroll on mobile

```



\---



\## DARK MODE IMPLEMENTATION



```typescript

// lib/store/theme.store.ts

// Persist preference in localStorage('theme')

// Apply data-theme="dark" on <html> element

// Default: system preference via matchMedia



// ThemeToggle island:

// Sun icon (light) / Moon icon (dark)

// Smooth transition: all CSS vars change with transition: background 200ms, color 200ms

```



\---



\## FRESH CONFIG



```typescript

// fresh.config.ts

import { defineConfig } from "$fresh/server.ts";

import tailwind from "$fresh/plugins/tailwind.ts";



export default defineConfig({

&#x20; plugins: \[tailwind()],

});

```



\---



\## tailwind.config.ts



```typescript

export default {

&#x20; content: \["{routes,islands,components}/\*\*/\*.{ts,tsx}"],

&#x20; darkMode: \["class", "\[data-theme='dark']"],

&#x20; theme: {

&#x20;   extend: {

&#x20;     colors: {

&#x20;       brand: {

&#x20;         900: "#2C5EAD",

&#x20;         600: "#1591DC",

&#x20;         400: "#4BB8FA",

&#x20;         100: "#C4E2F5",

&#x20;       }

&#x20;     },

&#x20;     fontFamily: {

&#x20;       sans: \["Plus Jakarta Sans", "sans-serif"],

&#x20;       mono: \["JetBrains Mono", "monospace"],

&#x20;     },

&#x20;     animation: {

&#x20;       "shimmer": "shimmer 2s linear infinite",

&#x20;       "count-up": "countUp 800ms ease-out",

&#x20;       "slide-in": "slideIn 200ms ease-out",

&#x20;       "fade-up": "fadeUp 200ms ease-out",

&#x20;     }

&#x20;   }

&#x20; }

};

```



\---



\## DEMO CREDENTIALS (hardcode in login form)



```

Admin:    admin@demo.com / Admin@123

PM:       pm@demo.com / PM@123

Member:   member1@demo.com / Member@123

```



\---



\## OUTPUT REQUIRED — GENERATE ALL FILES COMPLETELY



Generate every route, island, component, and utility file with full implementation. 

Include all imports. All API calls wired up. All forms validated. Dark mode working. 

WebSocket connected. Charts rendering. Kanban drag-and-drop functional.

Every interactive element has loading states and error handling.



