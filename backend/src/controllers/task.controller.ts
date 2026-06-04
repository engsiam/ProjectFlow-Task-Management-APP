// Task controller. Reads validated input from c.req.valid (set by Hono's
// validator middleware that OpenAPIHono wires up via zValidator).

import type { Context } from "hono";
import * as taskService from "../services/task.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
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
  const result = await taskService.listForUser(user.id, query);
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

export const getTask = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  const result = await taskService.getById(user.id, taskId);
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
