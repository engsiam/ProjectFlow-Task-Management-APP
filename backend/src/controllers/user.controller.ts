// User controller. Reads validated input from c.req.valid (set by Hono's
// validator middleware that OpenAPIHono wires up via zValidator).

import type { Context } from "hono";
import * as userService from "../services/user.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
import type { SearchUsersQuery, UpdateMeInput } from "../validators/user.validator.ts";

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
