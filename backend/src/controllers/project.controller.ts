// Project controller. Reads validated input from c.req.valid (set by Hono's
// validator middleware that OpenAPIHono wires up via zValidator).

import type { Context } from "hono";
import * as projectService from "../services/project.service.ts";
import * as activityService from "../services/activity.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";
import type {
  ActivityQuery,
  ChangeRoleInput,
  CreateProjectInput,
  InviteInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from "../validators/project.validator.ts";

export const listProjects = async (c: Context) => {
  const user = getUser(c);
  // deno-lint-ignore no-explicit-any
  const query = (c.req as any).valid("query") as ListProjectsQuery;
  const result = await projectService.listMine(user.id, user.role as never, query);
  return respondOk(c, result, "Projects");
};

export const createProject = async (c: Context) => {
  const user = getUser(c);
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as CreateProjectInput;
  const result = await projectService.create(user.id, body);
  return respondOk(c, result, "Project created", 201);
};

export const getProject = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const result = await projectService.getById(user.id, user.role as never, projectId);
  return respondOk(c, result, "Project");
};

export const updateProject = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as UpdateProjectInput;
  const result = await projectService.update(user.id, projectId, body);
  return respondOk(c, result, "Project updated");
};

export const archiveProject = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const result = await projectService.archive(user.id, projectId);
  return respondOk(c, result, "Project archived");
};

export const deleteProject = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  await projectService.remove(user.id, projectId);
  return respondOk(c, { deleted: true }, "Project deleted");
};

export const listMembers = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const result = await projectService.listMembers(user.id, user.role as never, projectId);
  return respondOk(c, { items: result, total: result.length }, "Members");
};

export const invite = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as InviteInput;
  const result = await projectService.invite(user.id, projectId, body);
  return respondOk(c, result, "Invitation sent", 201);
};

export const acceptInvitation = async (c: Context) => {
  const user = getUser(c);
  const invitationId = c.req.param("invitationId");
  const result = await projectService.acceptInvitation(user.id, invitationId);
  return respondOk(c, result, "Invitation accepted");
};

export const rejectInvitation = async (c: Context) => {
  const user = getUser(c);
  const invitationId = c.req.param("invitationId");
  const result = await projectService.rejectInvitation(user.id, invitationId);
  return respondOk(c, result, "Invitation rejected");
};

export const changeMemberRole = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const memberId = c.req.param("memberId");
  // deno-lint-ignore no-explicit-any
  const body = (c.req as any).valid("json") as ChangeRoleInput;
  const result = await projectService.changeRole(
    user.id,
    projectId,
    memberId,
    body.role as never,
  );
  return respondOk(c, result, "Role updated");
};

export const removeMember = async (c: Context) => {
  const user = getUser(c);
  const projectId = c.req.param("projectId");
  const memberId = c.req.param("memberId");
  await projectService.removeMember(user.id, projectId, memberId);
  return respondOk(c, { removed: true }, "Member removed");
};

export const listActivity = async (c: Context) => {
  const projectId = c.req.param("projectId");
  // deno-lint-ignore no-explicit-any
  const query = (c.req as any).valid("query") as ActivityQuery;
  const result = await activityService.listProjectActivity(projectId, query.page, query.limit);
  return respondOk(c, result, "Activity log");
};
