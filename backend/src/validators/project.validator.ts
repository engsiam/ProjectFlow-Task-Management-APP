// Project validators.

import { z } from "zod";
import { PROJECT_STATUSES, ROLES } from "../types/domain.ts";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100).trim(),
  description: z.string().max(2000).nullable().optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Color must be a hex code like #6366f1")
    .optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(2000).nullable().optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/)
    .optional(),
  status: z.enum(PROJECT_STATUSES as [string, ...string[]]).optional(),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid project id"),
});

export const listProjectsQuerySchema = z.object({
  status: z.enum(PROJECT_STATUSES as [string, ...string[]]).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(ROLES as [string, ...string[]]).default("MEMBER"),
  message: z.string().max(500).optional(),
});

export const invitationIdParamSchema = z.object({
  invitationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid invitation id"),
});

export const memberIdParamSchema = z.object({
  projectId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  memberId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid member id"),
});

export const changeRoleSchema = z.object({
  role: z.enum(ROLES as [string, ...string[]]),
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
