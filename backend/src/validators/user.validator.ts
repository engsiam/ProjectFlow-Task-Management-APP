// User validators.

import { z } from "zod";

export const updateMeSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/i, "Username may only contain letters, numbers, and underscores")
    .transform((v) => v.toLowerCase())
    .optional(),
  avatar: z.string().url().max(500).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
});

export const searchUsersQuerySchema = z.object({
  q: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const userIdParamSchema = z.object({
  userId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid user id"),
});

// Admin can promote/demote a user to any role except ADMIN (which would
// require a separate elevated flow). Self-demotion is also blocked.
export const updateUserRoleSchema = z.object({
  role: z.enum(["PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"]),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
