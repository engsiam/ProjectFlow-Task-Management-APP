// Comment controller. Reads validated input from c.req.valid (set by Hono's
// validator middleware that OpenAPIHono wires up via zValidator).

import type { Context } from "hono";
import * as commentService from "../services/comment.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
import type {
  CreateCommentInput,
  ListCommentsQuery,
  UpdateCommentInput,
} from "../validators/comment.validator.ts";

export const listComments = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  // deno-lint-ignore no-explicit-any
  const query = (c.req as any).valid("query") as ListCommentsQuery;
  const result = await commentService.listForTask(user.id, user.role as never, taskId, query);
  return respondOk(c, result, "Comments");
};

export const createComment = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as CreateCommentInput;
  const result = await commentService.create(user.id, taskId, body);
  return respondOk(c, result, "Comment added", 201);
};

export const updateComment = async (c: Context) => {
  const user = getUser(c);
  const commentId = c.req.param("commentId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as UpdateCommentInput;
  const result = await commentService.update(user.id, commentId, body);
  return respondOk(c, result, "Comment updated");
};

export const deleteComment = async (c: Context) => {
  const user = getUser(c);
  const commentId = c.req.param("commentId");
  await commentService.remove(user.id, commentId);
  return respondOk(c, { deleted: true }, "Comment deleted");
};
