// Comment routes.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as commentCtrl from "../controllers/comment.controller.ts";
import { auth } from "../middleware/auth.ts";
import {
  bearerAuth,
  commentListResponse,
  commentSchema,
  createCommentBody,
  ErrorResponseSchema,
  jsonCreatedResponse,
  jsonErrorResponses,
  jsonOkResponse,
  updateCommentBody,
} from "../docs/openapi.ts";

const tag = ["Comments"];
const taskIdParam = z.object({ taskId: z.string().regex(/^[a-fA-F0-9]{24}$/) });
const commentIdParam = z.object({ commentId: z.string().regex(/^[a-fA-F0-9]{24}$/) });

export const listCommentsRoute = createRoute({
  method: "get",
  path: "/api/tasks/:taskId/comments",
  tags: tag,
  summary: "List comments on a task",
  description: "Returns comments in chronological order, including any @mentions.",
  security: [{ bearerAuth: [] }],
  request: {
    params: taskIdParam,
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  },
  responses: {
    200: jsonOkResponse("Comments", commentListResponse),
    ...jsonErrorResponses([{ status: 403, description: "Not a member" }, {
      status: 404,
      description: "Task not found",
    }]),
  },
});

export const createCommentRoute = createRoute({
  method: "post",
  path: "/api/tasks/:taskId/comments",
  tags: tag,
  summary: "Add a comment to a task",
  description: "Use @username to mention other users. The mentioned user is notified immediately.",
  security: [{ bearerAuth: [] }],
  request: {
    params: taskIdParam,
    body: { content: { "application/json": { schema: createCommentBody } }, required: true },
  },
  responses: {
    201: jsonCreatedResponse("Comment created", commentSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error" },
      { status: 403, description: "Not a member" },
      { status: 404, description: "Task not found" },
    ]),
  },
});

export const updateCommentRoute = createRoute({
  method: "patch",
  path: "/api/comments/:commentId",
  tags: tag,
  summary: "Edit a comment",
  description: "Only the author can edit their own comment. Re-extracts mentions.",
  security: [{ bearerAuth: [] }],
  request: {
    params: commentIdParam,
    body: { content: { "application/json": { schema: updateCommentBody } }, required: true },
  },
  responses: {
    200: jsonOkResponse("Comment updated", commentSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error" },
      { status: 403, description: "Not your comment" },
      { status: 404, description: "Comment not found" },
    ]),
  },
});

export const deleteCommentRoute = createRoute({
  method: "delete",
  path: "/api/comments/:commentId",
  tags: tag,
  summary: "Delete a comment",
  description: "Author or project manager+ can delete a comment.",
  security: [{ bearerAuth: [] }],
  request: { params: commentIdParam },
  responses: {
    200: jsonOkResponse(
      "Comment deleted",
      z.object({ deleted: z.boolean() }).openapi("DeleteResult"),
    ),
    ...jsonErrorResponses([
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Comment not found" },
    ]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const commentRouteEntries: RouteEntry[] = [
  {
    route: listCommentsRoute,
    handler: commentCtrl.listComments as Handler,
    middleware: m([auth()]),
  },
  {
    route: createCommentRoute,
    handler: commentCtrl.createComment as Handler,
    middleware: m([auth()]),
  },
  {
    route: updateCommentRoute,
    handler: commentCtrl.updateComment as Handler,
    middleware: m([auth()]),
  },
  {
    route: deleteCommentRoute,
    handler: commentCtrl.deleteComment as Handler,
    middleware: m([auth()]),
  },
];
