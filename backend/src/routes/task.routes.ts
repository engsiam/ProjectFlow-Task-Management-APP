// Task routes.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as taskCtrl from "../controllers/task.controller.ts";
import { auth } from "../middleware/auth.ts";
import { requireProjectContributor, requireProjectMember } from "../middleware/rbac.ts";
import {
  bearerAuth,
  createTaskBody,
  ErrorResponseSchema,
  jsonCreatedResponse,
  jsonErrorResponses,
  jsonOkResponse,
  moveTaskBody,
  priorityEnum,
  reorderTaskBody,
  taskListResponse,
  taskSchema,
  taskStatusEnum,
  updateTaskBody,
} from "../docs/openapi.ts";

const tag = ["Tasks"];
const projectIdParam = z.object({
  projectId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
const taskIdParam = z.object({
  taskId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

export const listTasksRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId/tasks",
  tags: tag,
  summary: "List tasks in a project",
  description:
    "Filter by status, priority, assignee, label, due date, or full-text search. Paginated.",
  security: [{ bearerAuth: [] }],
  request: {
    params: projectIdParam,
    query: z.object({
      status: taskStatusEnum.optional(),
      priority: priorityEnum.optional(),
      assigneeId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
      label: z.string().min(1).max(40).optional(),
      search: z.string().max(200).optional(),
      dueBefore: z.string().datetime().optional(),
      dueAfter: z.string().datetime().optional(),
      overdue: z.coerce.boolean().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      sort: z.string().optional(),
    }),
  },
  responses: {
    200: jsonOkResponse("Tasks", taskListResponse),
    ...jsonErrorResponses([{ status: 403, description: "Not a member" }, {
      status: 404,
      description: "Project not found",
    }]),
  },
});

export const createTaskRoute = createRoute({
  method: "post",
  path: "/api/projects/:projectId/tasks",
  tags: tag,
  summary: "Create a task in a project",
  description:
    "Requires MEMBER+. The creator is automatically the task creator; an assignee may be set.",
  security: [{ bearerAuth: [] }],
  request: {
    params: projectIdParam,
    body: { content: { "application/json": { schema: createTaskBody } }, required: true },
  },
  responses: {
    201: jsonCreatedResponse("Task created", taskSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error or project archived" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export const getTaskRoute = createRoute({
  method: "get",
  path: "/api/tasks/:taskId",
  tags: tag,
  summary: "Get a task by id",
  description: "Returns the task with creator, assignee, and project info.",
  security: [{ bearerAuth: [] }],
  request: { params: taskIdParam },
  responses: {
    200: jsonOkResponse("Task", taskSchema),
    ...jsonErrorResponses([{ status: 403, description: "Not a member" }, {
      status: 404,
      description: "Task not found",
    }]),
  },
});

export const updateTaskRoute = createRoute({
  method: "patch",
  path: "/api/tasks/:taskId",
  tags: tag,
  summary: "Update a task",
  description: "Update any field. Setting status to DONE records completedAt. Requires MEMBER+.",
  security: [{ bearerAuth: [] }],
  request: {
    params: taskIdParam,
    body: { content: { "application/json": { schema: updateTaskBody } }, required: true },
  },
  responses: {
    200: jsonOkResponse("Task updated", taskSchema),
    ...jsonErrorResponses([{ status: 400, description: "Validation error" }, {
      status: 403,
      description: "Forbidden",
    }, { status: 404, description: "Task not found" }]),
  },
});

export const deleteTaskRoute = createRoute({
  method: "delete",
  path: "/api/tasks/:taskId",
  tags: tag,
  summary: "Delete a task",
  description: "Only the creator or a MANAGER+ can delete a task.",
  security: [{ bearerAuth: [] }],
  request: { params: taskIdParam },
  responses: {
    200: jsonOkResponse("Task deleted", z.object({ deleted: z.boolean() }).openapi("DeleteResult")),
    ...jsonErrorResponses([{ status: 403, description: "Forbidden" }, {
      status: 404,
      description: "Task not found",
    }]),
  },
});

export const moveTaskRoute = createRoute({
  method: "post",
  path: "/api/tasks/:taskId/move",
  tags: tag,
  summary: "Move task to a different Kanban column",
  description:
    "Changes the task's status. Order is optional; if omitted, the task is appended to the new column.",
  security: [{ bearerAuth: [] }],
  request: {
    params: taskIdParam,
    body: { content: { "application/json": { schema: moveTaskBody } }, required: true },
  },
  responses: {
    200: jsonOkResponse("Task moved", taskSchema),
    ...jsonErrorResponses([{ status: 400, description: "Validation error" }, {
      status: 403,
      description: "Forbidden",
    }, { status: 404, description: "Task not found" }]),
  },
});

export const reorderTaskRoute = createRoute({
  method: "post",
  path: "/api/tasks/:taskId/reorder",
  tags: tag,
  summary: "Reorder a task within a column",
  description:
    "Set a new order value within a specific status column for drag-and-drop Kanban reordering.",
  security: [{ bearerAuth: [] }],
  request: {
    params: taskIdParam,
    body: { content: { "application/json": { schema: reorderTaskBody } }, required: true },
  },
  responses: {
    200: jsonOkResponse("Task reordered", taskSchema),
    ...jsonErrorResponses([{ status: 400, description: "Validation error" }, {
      status: 403,
      description: "Forbidden",
    }, { status: 404, description: "Task not found" }]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const taskRouteEntries: RouteEntry[] = [
  {
    route: listTasksRoute,
    handler: taskCtrl.listTasks as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
  {
    route: createTaskRoute,
    handler: taskCtrl.createTask as Handler,
    middleware: m([auth(), requireProjectContributor()]),
  },
  { route: getTaskRoute, handler: taskCtrl.getTask as Handler, middleware: m([auth()]) },
  { route: updateTaskRoute, handler: taskCtrl.updateTask as Handler, middleware: m([auth()]) },
  { route: deleteTaskRoute, handler: taskCtrl.deleteTask as Handler, middleware: m([auth()]) },
  { route: moveTaskRoute, handler: taskCtrl.moveTask as Handler, middleware: m([auth()]) },
  { route: reorderTaskRoute, handler: taskCtrl.reorderTask as Handler, middleware: m([auth()]) },
];
