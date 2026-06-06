// User controller. Reads validated input from c.req.valid (set by Hono's
// validator middleware that OpenAPIHono wires up via zValidator).

import type { Context } from "hono";
import { prisma } from "../prisma/client.ts";
import * as userService from "../services/user.service.ts";
import { NotFoundError } from "../utils/errors.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
import type {
  SearchUsersQuery,
  UpdateMeInput,
  UpdateUserRoleInput,
} from "../validators/user.validator.ts";
import { isValidObjectId } from "../utils/id.ts";

export const updateMe = async (c: Context) => {
  const user = getUser(c);
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as UpdateMeInput;
  const result = await userService.updateMe(user.id, body);
  return respondOk(c, result, "Profile updated");
};

export const searchUsers = async (c: Context) => {
  const user = getUser(c);
  // deno-lint-ignore no-explicit-any
  const query = (c.req as any).valid("query") as SearchUsersQuery;
  const result = await userService.searchUsers(query, user.id);
  return respondOk(c, { items: result, total: result.length }, "Users");
};

export const getById = async (c: Context) => {
  const id = c.req.param("userId");
  const result = await userService.getById(id);
  return respondOk(c, result, "User");
};

export const updateRole = async (c: Context) => {
  const user = getUser(c);
  const targetId = c.req.param("userId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as UpdateUserRoleInput;
  const result = await userService.updateUserRole(
    user.id,
    user.role,
    targetId,
    body,
  );
  return respondOk(c, result, "Role updated");
};

// Public — streams a user's DB-stored avatar. Returns 404 when the user
// has no avatarData (e.g. they use an external URL like Gravatar or
// pravatar.cc). The user-service never deletes avatarData on profile
// update, so an upload always wins until a new upload replaces it.
export const getAvatar = async (c: Context) => {
  const userId = c.req.param("userId");
  if (!isValidObjectId(userId)) throw new NotFoundError("User not found");
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true, avatarMime: true },
  });
  if (!row || !row.avatarData) {
    throw new NotFoundError("No DB-stored avatar for this user");
  }
  c.header("Content-Type", row.avatarMime ?? "application/octet-stream");
  c.header("Cache-Control", "private, max-age=300");
  const bytes = row.avatarData instanceof Uint8Array
    ? row.avatarData
    : new Uint8Array(row.avatarData as unknown as ArrayBuffer);
  c.header("Content-Length", String(bytes.length));
  return c.body(bytes as unknown as ArrayBuffer);
};
