// Comment validators.

import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(5000).trim(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid comment id"),
});

export const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
