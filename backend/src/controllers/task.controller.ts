// Task controller. Reads validated input from c.req.valid (set by Hono's
// validator middleware that OpenAPIHono wires up via zValidator).

import type { Context } from "hono";
import * as taskService from "../services/task.service.ts";
import * as attachmentService from "../services/attachment.service.ts";
import type { AttachmentRecord } from "../services/attachment.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
import { BadRequestError } from "../utils/errors.ts";
import type {
  CreateTaskInput,
  ListTasksQuery,
  MoveTaskInput,
  ReorderTaskInput,
  UpdateTaskInput,
} from "../validators/task.validator.ts";

export const listAllTasks = async (c: Context) => {
  const user = getUser(c);
  // deno-lint-ignore no-explicit-any
  const query = (c.req as any).valid("query") as ListTasksQuery;
  const result = await taskService.listForUser(user.id, user.role as never, query);
  return respondOk(c, result, "Tasks");
};

export const listTasks = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  // deno-lint-ignore no-explicit-any
  const query = (c.req as any).valid("query") as ListTasksQuery;
  const result = await taskService.listForProject(user.id, projectId, query);
  return respondOk(c, result, "Tasks");
};

export const createTask = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as CreateTaskInput;
  const result = await taskService.create(user.id, projectId, body);
  return respondOk(c, result, "Task created", 201);
};

/**
 * Create a task plus attachments in one multipart request.
 * Form fields: title, description, status, priority, assigneeId, dueDate, labels (JSON or comma list).
 * File fields: file[] (one or many).
 */
export const createTaskWithAttachments = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const form = await c.req.parseBody();

  const getField = (key: string) => {
    const v = form[key];
    if (typeof v === "string") return v;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    return undefined;
  };

  const title = getField("title");
  if (!title || !title.trim()) throw new BadRequestError("Task title is required");

  let labels: string[] = [];
  const labelsRaw = getField("labels");
  if (labelsRaw) {
    try {
      const parsed = JSON.parse(labelsRaw);
      if (Array.isArray(parsed)) {
        labels = parsed.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      labels = labelsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const dueDateRaw = getField("dueDate");
  let dueDate: Date | null = null;
  if (dueDateRaw) {
    const parsed = new Date(dueDateRaw);
    if (!isNaN(parsed.getTime())) dueDate = parsed;
  }

  const input: CreateTaskInput = {
    title: title.trim(),
    description: getField("description") || undefined,
    status: (getField("status") as CreateTaskInput["status"]) || "TODO",
    priority: (getField("priority") as CreateTaskInput["priority"]) || "MEDIUM",
    assigneeId: getField("assigneeId") || undefined,
    dueDate,
    labels,
  };

  const task = await taskService.create(user.id, projectId, input);

  const rawFiles = form["file"];
  const fileList: File[] = Array.isArray(rawFiles)
    ? rawFiles.filter((f): f is File => f instanceof File)
    : rawFiles instanceof File
    ? [rawFiles]
    : [];

  const attachments: AttachmentRecord[] = [];
  for (const file of fileList) {
    try {
      const rec = await attachmentService.create(user.id, user.role as never, task.id, file);
      attachments.push(rec);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File upload failed";
      // Roll back partial task creation if any attachment fails so the user sees a clean error.
      try {
        await taskService.remove(user.id, task.id);
      } catch (_e) {
        // ignore
      }
      throw new BadRequestError(msg);
    }
  }

  return c.json(
    { success: true, message: "Task created", data: { ...task, attachments } },
    201,
  );
};

export const getTask = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  const result = await taskService.getById(user.id, user.role as never, taskId);
  return respondOk(c, result, "Task");
};

export const updateTask = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as UpdateTaskInput;
  const result = await taskService.update(user.id, taskId, body);
  return respondOk(c, result, "Task updated");
};

export const deleteTask = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  await taskService.remove(user.id, taskId);
  return respondOk(c, { deleted: true }, "Task deleted");
};

export const moveTask = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as MoveTaskInput;
  const result = await taskService.move(user.id, taskId, body);
  return respondOk(c, result, "Task moved");
};

export const reorderTask = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as ReorderTaskInput;
  const result = await taskService.reorder(user.id, taskId, body);
  return respondOk(c, result, "Task reordered");
};
