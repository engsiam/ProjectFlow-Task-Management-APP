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
  avatarUrl?: string | null;
  role?: Role;
};

export type Role = "OWNER" | "MANAGER" | "MEMBER" | "VIEWER";
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
  progress?: number;
  owner?: User;
  members?: ProjectMember[];
  taskCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Task = {
  id: ID;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
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
  createdAt: string;
};

export type DashboardData = {
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
