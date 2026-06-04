export type ID = string;

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  error?: unknown;
};

export type User = {
  id: ID;
  name: string;
  email: string;
  username?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  role?: Role;
};

export type Role = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ProjectMember = {
  id: ID;
  role: Role;
  user: User;
};

export type Project = {
  id: ID;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId?: ID;
  progress?: number;
  currentRole?: Role | null;
  owner?: User;
  members?: ProjectMember[];
  taskCount?: number;
  taskStats?: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type Task = {
  id: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  creatorId?: ID;
  dueDate?: string | null;
  order?: number;
  labels?: string[];
  assignee?: User | null;
  project?: Project | null;
  projectId?: ID;
  commentCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Comment = {
  id: ID;
  content?: string;
  body: string;
  author: User;
  createdAt: string;
  updatedAt?: string;
};

export type Activity = {
  id: ID;
  action: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
  actor?: User;
  createdAt: string;
};

export type Notification = {
  id: ID;
  title: string;
  message: string;
  read: boolean;
  type?: string;
  data?: Record<string, unknown>;
  createdAt: string;
};

export type SearchResult = {
  projects: Project[];
  tasks: Task[];
  members: User[];
};

export type SearchGroup = {
  label: string;
  icon: string;
  items: {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    href: string;
    iconColor?: string;
  }[];
};

export type DashboardData = {
  projects?: {
    total: number;
    active: number;
    completed: number;
    archived: number;
  };
  tasks?: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<Priority, number>;
    overdue: number;
    completed: number;
  };
  mine?: {
    assignedOpen: number;
    byStatus: Record<TaskStatus, number>;
    overdue: number;
  };
  notifications?: { unread: number };
  projectCount?: number;
  activeProjects?: Project[];
  taskCountByStatus?: Record<TaskStatus, number>;
  taskCountByPriority?: Record<Priority, number>;
  overdueTasks?: Task[];
  myAssignedTasks?: Task[];
  memberWorkload?: { user: User; count: number }[];
  recentActivity?: Activity[];
  projectProgress?: { project: Project; progress: number }[];
};

// ---------- Analytics Charts ----------
export type AnalyticsKPI = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
};

export type PriorityDatum = {
  name: Priority;
  label: string;
  value: number;
  color: string;
};

export type StatusDatum = {
  name: TaskStatus;
  label: string;
  value: number;
  color: string;
};

export type TrendDatum = {
  date: string;
  label: string;
  created: number;
  completed: number;
};

export type ProductivityDatum = {
  userId: string;
  name: string;
  avatar?: string | null;
  completed: number;
  inProgress: number;
  total: number;
};

export type ComparisonDatum = {
  label: string;
  completed: number;
  overdue: number;
  pending: number;
};

export type AnalyticsCharts = {
  kpi: AnalyticsKPI;
  byPriority: PriorityDatum[];
  byStatus: StatusDatum[];
  trend: TrendDatum[];
  productivity: ProductivityDatum[];
  comparison: ComparisonDatum[];
  generatedAt: string;
};
