// Task validators.

import { z } from "zod";
import { PRIORITIES, TASK_STATUSES } from "../types/domain.ts";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200).trim(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).default("TODO"),
  priority: z.enum(PRIORITIES as [string, ...string[]]).default("MEDIUM"),
  assigneeId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .datetime({ message: "dueDate must be ISO 8601" })
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  labels: z.array(z.string().min(1).max(40)).max(20).default([]),
  order: z.number().int().min(0).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).optional(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).optional(),
  assigneeId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  labels: z.array(z.string().min(1).max(40)).max(20).optional(),
  order: z.number().int().min(0).optional(),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid task id"),
});

export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
  order: z.number().int().min(0).optional(),
});

export const reorderTaskSchema = z.object({
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
  order: z.number().int().min(0),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES as [string, ...string[]]).optional(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).optional(),
  assigneeId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  label: z.string().min(1).max(40).optional(),
  search: z.string().max(200).optional(),
  dueBefore: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  dueAfter: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  overdue: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type ReorderTaskInput = z.infer<typeof reorderTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
