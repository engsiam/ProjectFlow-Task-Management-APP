// OpenAPI spec builder. Uses @hono/zod-openapi to register routes, then
// generates the spec that the Swagger UI consumes.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { env } from "../config/env.ts";

// ---------- Shared Schemas ----------

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z
    .object({
      code: z.string().optional(),
      details: z.unknown().optional(),
    })
    .optional(),
});

export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });

export const IdParamSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

// ---------- Public User ----------
export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---------- Auth ----------
export const signupBodySchema = z.object({
  email: z.string().email().openapi({ example: "owner@example.com" }),
  password: z.string().min(8).openapi({ example: "Password123!" }),
  name: z.string().openapi({ example: "Olivia Owner" }),
  username: z.string().min(3).optional().openapi({ example: "olivia" }),
});

export const loginBodySchema = z.object({
  email: z.string().email().toLowerCase().trim().openapi({ example: "owner@example.com" }),
  password: z.string().min(1).openapi({ example: "Password123!" }),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().openapi({ example: "eyJhbGciOi..." }),
});

export const authResponseSchema = z.object({
  user: PublicUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  refreshExpiresIn: z.number().int(),
});

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  refreshExpiresIn: z.number().int(),
});

export const bearerAuth = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Enter the access token from /api/auth/login",
  },
};

// ---------- Pagination ----------
export const paginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// ---------- Health ----------
export const healthSchema = z.object({
  status: z.string().openapi({ example: "ok" }),
  api: z.string().openapi({ example: "running" }),
  database: z.string().openapi({ example: "connected" }),
  runtime: z.string().openapi({ example: "Deno 2.8.1" }),
  timestamp: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
  version: z.string().openapi({ example: "1.0.0" }),
  environment: z.string().openapi({ example: "development" }),
});

export const healthResponseData = z.object({
  success: z.boolean(),
  message: z.string(),
  data: healthSchema,
});

// ---------- Project ----------
export const projectStatusEnum = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);
export const roleEnum = z.enum(["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"]);
export const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const projectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: projectStatusEnum,
  ownerId: z.string(),
  progress: z.number().int(),
  taskCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createProjectBody = z.object({
  name: z.string().min(1).openapi({ example: "Q4 Marketing Launch" }),
  description: z.string().optional().openapi({ example: "Cross-team launch plan" }),
  color: z.string().optional().openapi({ example: "#10b981" }),
});

export const updateProjectBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  status: projectStatusEnum.optional(),
});

export const projectListResponse = z.object({
  items: z.array(projectSummarySchema.extend({
    _count: z.object({ tasks: z.number().int(), members: z.number().int() }).optional(),
    owner: z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      avatar: z.string().nullable().optional(),
    }).optional(),
  })),
  pagination: paginationSchema,
});

export const projectDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: projectStatusEnum,
  ownerId: z.string(),
  owner: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    avatar: z.string().nullable().optional(),
    email: z.string().email(),
  }),
  members: z.array(z.object({
    id: z.string(),
    role: roleEnum,
    joinedAt: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      email: z.string().email(),
      avatar: z.string().nullable().optional(),
    }),
  })),
  progress: z.number().int(),
  taskStats: z.object({
    total: z.number().int(),
    todo: z.number().int(),
    inProgress: z.number().int(),
    review: z.number().int(),
    done: z.number().int(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---------- Invitations ----------
export const inviteBody = z.object({
  email: z.string().email().openapi({ example: "teammate@example.com" }),
  role: roleEnum.default("TEAM_MEMBER"),
  message: z.string().optional(),
});

export const invitationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  email: z.string().email(),
  role: roleEnum,
  status: z.string(),
  invitedById: z.string(),
  invitedUserId: z.string().nullable().optional(),
  expiresAt: z.string(),
  message: z.string().nullable().optional(),
  createdAt: z.string(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
  }).optional(),
  invitedBy: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
  }).optional(),
});

export const changeRoleBody = z.object({
  role: roleEnum,
});

// ---------- Members ----------
export const memberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: roleEnum,
  joinedAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string().email(),
    avatar: z.string().nullable().optional(),
  }),
});

// ---------- Tasks ----------
export const taskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: taskStatusEnum,
  priority: priorityEnum,
  assigneeId: z.string().nullable().optional(),
  creatorId: z.string(),
  dueDate: z.string().nullable().optional(),
  labels: z.array(z.string()),
  order: z.number().int(),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assignee: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    avatar: z.string().nullable().optional(),
  }).nullable().optional(),
  creator: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    avatar: z.string().nullable().optional(),
  }).optional(),
  _count: z.object({ comments: z.number().int() }).optional(),
});

export const createTaskBody = z.object({
  title: z.string().min(1).openapi({ example: "Design landing page" }),
  description: z.string().optional().openapi({ example: "Hero, features, pricing" }),
  status: taskStatusEnum.default("TODO"),
  priority: priorityEnum.default("MEDIUM"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional().openapi({ example: "2025-02-01T00:00:00.000Z" }),
  labels: z.array(z.string()).default([]).openapi({ example: ["design", "frontend"] }),
  order: z.number().int().optional(),
});

export const updateTaskBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: priorityEnum.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  order: z.number().int().optional(),
});

export const moveTaskBody = z.object({
  status: taskStatusEnum,
  order: z.number().int().optional(),
});

export const reorderTaskBody = z.object({
  status: taskStatusEnum,
  order: z.number().int().min(0),
});

export const taskListResponse = z.object({
  items: z.array(taskSchema),
  pagination: paginationSchema,
});

// ---------- Comments ----------
export const commentSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  taskId: z.string(),
  edited: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    avatar: z.string().nullable().optional(),
  }),
  mentions: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    username: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
    }).optional(),
  })),
});

export const createCommentBody = z.object({
  content: z.string().min(1).openapi({ example: "Looks good @manager!" }),
});

export const updateCommentBody = z.object({
  content: z.string().min(1),
});

export const commentListResponse = z.object({
  items: z.array(commentSchema),
  pagination: paginationSchema,
});

// ---------- Notifications ----------
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.unknown().nullable().optional(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const notificationListResponse = z.object({
  items: z.array(notificationSchema),
  pagination: paginationSchema,
});

// ---------- Users ----------
export const updateMeBody = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  avatar: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
});

export const searchUsersResponse = z.object({
  items: z.array(PublicUserSchema),
  total: z.number().int(),
});

// ---------- Activity ----------
export const activityLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  projectId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
  createdAt: z.string(),
  actor: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    avatar: z.string().nullable().optional(),
  }),
});

export const activityListResponse = z.object({
  items: z.array(activityLogSchema),
  pagination: paginationSchema,
});

// ---------- Analytics ----------
export const dashboardResponseData = z.object({
  projects: z.object({
    total: z.number().int(),
    active: z.number().int(),
    completed: z.number().int(),
    archived: z.number().int(),
  }),
  tasks: z.object({
    total: z.number().int(),
    byStatus: z.object({
      TODO: z.number().int(),
      IN_PROGRESS: z.number().int(),
      REVIEW: z.number().int(),
      DONE: z.number().int(),
    }),
    byPriority: z.object({
      LOW: z.number().int(),
      MEDIUM: z.number().int(),
      HIGH: z.number().int(),
      URGENT: z.number().int(),
    }),
    overdue: z.number().int(),
    completed: z.number().int(),
  }),
  mine: z.object({
    assignedOpen: z.number().int(),
    byStatus: z.object({
      TODO: z.number().int(),
      IN_PROGRESS: z.number().int(),
      REVIEW: z.number().int(),
      DONE: z.number().int(),
    }),
    overdue: z.number().int(),
  }),
  notifications: z.object({ unread: z.number().int() }),
  recentActivity: z.array(activityLogSchema),
});

export const projectAnalyticsData = z.object({
  project: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    status: projectStatusEnum,
    progress: z.number().int(),
  }),
  tasks: z.object({
    total: z.number().int(),
    done: z.number().int(),
    overdue: z.number().int(),
    byStatus: z.object({
      TODO: z.number().int(),
      IN_PROGRESS: z.number().int(),
      REVIEW: z.number().int(),
      DONE: z.number().int(),
    }),
    byPriority: z.object({
      LOW: z.number().int(),
      MEDIUM: z.number().int(),
      HIGH: z.number().int(),
      URGENT: z.number().int(),
    }),
  }),
  members: z.array(z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      avatar: z.string().nullable().optional(),
    }),
    role: roleEnum,
    totalTasks: z.number().int(),
    openTasks: z.number().int(),
    doneTasks: z.number().int(),
  })),
  teamProductivity: z.object({
    completionRate: z.number().int(),
    averageTasksPerMember: z.number().int(),
    activeMembers: z.number().int(),
  }),
});

// ---------- Helpers ----------
export const jsonOkResponse = <T extends z.ZodTypeAny>(description: string, data: T) => ({
  description,
  content: {
    "application/json": { schema: SuccessResponseSchema(data) },
  },
});

export const jsonCreatedResponse = <T extends z.ZodTypeAny>(description: string, data: T) => ({
  description,
  content: {
    "application/json": { schema: SuccessResponseSchema(data) },
  },
});

export const jsonErrorResponses = (
  codes: Array<{ status: number; description: string; code?: string }>,
) => {
  const out: Record<
    string,
    { description: string; content: { "application/json": { schema: typeof ErrorResponseSchema } } }
  > = {};
  for (const c of codes) {
    out[String(c.status)] = {
      description: c.description,
      content: { "application/json": { schema: ErrorResponseSchema } },
    };
  }
  return out;
};

export { createRoute, OpenAPIHono, swaggerUI };
