// Project routes - includes projects, members, invitations, activity.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as projectCtrl from "../controllers/project.controller.ts";
import { auth } from "../middleware/auth.ts";
import {
  requireGlobalRole,
  requireProjectManager,
  requireProjectMember,
  requireProjectOwner,
} from "../middleware/rbac.ts";
import {
  activityListResponse,
  bearerAuth,
  changeRoleBody,
  createProjectBody,
  ErrorResponseSchema,
  invitationSchema,
  inviteBody,
  jsonCreatedResponse,
  jsonErrorResponses,
  jsonOkResponse,
  memberSchema,
  paginationSchema,
  projectDetailSchema,
  projectListResponse,
  projectStatusEnum,
  updateProjectBody,
} from "../docs/openapi.ts";

const tag = ["Projects"];
const projectIdParam = z.object({
  projectId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
const invitationIdParam = z.object({
  invitationId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
const memberIdParam = z.object({
  projectId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  memberId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
const membersListResponse = z.object({
  items: z.array(memberSchema),
  total: z.number().int(),
});
const simpleOk = z.object({ deleted: z.boolean() }).openapi("DeleteResult");
const archived = z.object({ removed: z.boolean() }).openapi("RemoveResult");

export const listProjectsRoute = createRoute({
  method: "get",
  path: "/api/projects",
  tags: tag,
  summary: "List my projects",
  description:
    "Returns projects the caller owns or is a member of. Supports filtering and pagination.",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      status: projectStatusEnum.optional(),
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sort: z.string().optional(),
    }),
  },
  responses: {
    200: jsonOkResponse("List of projects", projectListResponse),
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const createProjectRoute = createRoute({
  method: "post",
  path: "/api/projects",
  tags: tag,
  summary: "Create a new project",
  description: "The caller becomes the OWNER and is added as the first member.",
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: createProjectBody } }, required: true },
  },
  responses: {
    201: jsonCreatedResponse("Project created", z.object({}).passthrough()),
    ...jsonErrorResponses([{ status: 400, description: "Validation error" }]),
  },
});

export const getProjectRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId",
  tags: tag,
  summary: "Get project details",
  description: "Returns the project with owner, members, progress, and task statistics.",
  security: [{ bearerAuth: [] }],
  request: { params: projectIdParam },
  responses: {
    200: jsonOkResponse("Project detail", projectDetailSchema),
    ...jsonErrorResponses([
      { status: 403, description: "Not a member" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export const updateProjectRoute = createRoute({
  method: "patch",
  path: "/api/projects/:projectId",
  tags: tag,
  summary: "Update a project",
  description: "Update name/description/color/status. Requires OWNER or MANAGER.",
  security: [{ bearerAuth: [] }],
  request: {
    params: projectIdParam,
    body: { content: { "application/json": { schema: updateProjectBody } }, required: true },
  },
  responses: {
    200: jsonOkResponse("Project updated", z.object({}).passthrough()),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export const archiveProjectRoute = createRoute({
  method: "post",
  path: "/api/projects/:projectId/archive",
  tags: tag,
  summary: "Archive a project",
  description: "Mark the project as ARCHIVED. OWNER only.",
  security: [{ bearerAuth: [] }],
  request: { params: projectIdParam },
  responses: {
    200: jsonOkResponse("Project archived", z.object({}).passthrough()),
    ...jsonErrorResponses([
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export const deleteProjectRoute = createRoute({
  method: "delete",
  path: "/api/projects/:projectId",
  tags: tag,
  summary: "Delete a project",
  description: "Permanently delete a project and all its data. OWNER only.",
  security: [{ bearerAuth: [] }],
  request: { params: projectIdParam },
  responses: {
    200: jsonOkResponse("Project deleted", simpleOk),
    ...jsonErrorResponses([
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Project not found" },
    ]),
  },
});

export const listMembersRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId/members",
  tags: tag,
  summary: "List project members",
  description: "Returns all members including the OWNER.",
  security: [{ bearerAuth: [] }],
  request: { params: projectIdParam },
  responses: {
    200: jsonOkResponse("Members", membersListResponse),
    ...jsonErrorResponses([{ status: 403, description: "Not a member" }, {
      status: 404,
      description: "Project not found",
    }]),
  },
});

export const inviteRoute = createRoute({
  method: "post",
  path: "/api/projects/:projectId/invitations",
  tags: tag,
  summary: "Invite a member to a project",
  description:
    "Send an invitation by email. Requires OWNER or MANAGER. If the user already has an account they are notified immediately.",
  security: [{ bearerAuth: [] }],
  request: {
    params: projectIdParam,
    body: { content: { "application/json": { schema: inviteBody } }, required: true },
  },
  responses: {
    201: jsonCreatedResponse("Invitation sent", invitationSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Validation error" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Project not found" },
      { status: 409, description: "Already a member" },
    ]),
  },
});

export const acceptInvitationRoute = createRoute({
  method: "post",
  path: "/api/invitations/:invitationId/accept",
  tags: tag,
  summary: "Accept an invitation",
  description: "The caller accepts the invitation and becomes a member of the project.",
  security: [{ bearerAuth: [] }],
  request: { params: invitationIdParam },
  responses: {
    200: jsonOkResponse("Invitation accepted", invitationSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Invalid or expired invitation" },
      { status: 403, description: "Not your invitation" },
      { status: 404, description: "Invitation not found" },
    ]),
  },
});

export const rejectInvitationRoute = createRoute({
  method: "post",
  path: "/api/invitations/:invitationId/reject",
  tags: tag,
  summary: "Reject an invitation",
  description: "The caller declines the invitation.",
  security: [{ bearerAuth: [] }],
  request: { params: invitationIdParam },
  responses: {
    200: jsonOkResponse("Invitation rejected", invitationSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Invalid invitation" },
      { status: 403, description: "Not your invitation" },
      { status: 404, description: "Invitation not found" },
    ]),
  },
});

export const changeRoleRoute = createRoute({
  method: "patch",
  path: "/api/projects/:projectId/members/:memberId/role",
  tags: tag,
  summary: "Change a member's role",
  description: "OWNER or MANAGER can change roles. Only OWNER can promote to MANAGER.",
  security: [{ bearerAuth: [] }],
  request: {
    params: memberIdParam,
    body: { content: { "application/json": { schema: changeRoleBody } }, required: true },
  },
  responses: {
    200: jsonOkResponse("Role updated", memberSchema),
    ...jsonErrorResponses([
      { status: 400, description: "Cannot change OWNER" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Member not found" },
    ]),
  },
});

export const removeMemberRoute = createRoute({
  method: "delete",
  path: "/api/projects/:projectId/members/:memberId",
  tags: tag,
  summary: "Remove a project member",
  description: "OWNER or MANAGER can remove a member (with rank restrictions).",
  security: [{ bearerAuth: [] }],
  request: { params: memberIdParam },
  responses: {
    200: jsonOkResponse("Member removed", archived),
    ...jsonErrorResponses([
      { status: 400, description: "Cannot remove OWNER" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Member not found" },
    ]),
  },
});

export const listActivityRoute = createRoute({
  method: "get",
  path: "/api/projects/:projectId/activity",
  tags: tag,
  summary: "Project activity log",
  description: "Returns recent activity entries for a project in reverse chronological order.",
  security: [{ bearerAuth: [] }],
  request: {
    params: projectIdParam,
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  },
  responses: {
    200: jsonOkResponse("Activity", activityListResponse),
    ...jsonErrorResponses([{ status: 403, description: "Not a member" }, {
      status: 404,
      description: "Project not found",
    }]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const projectRouteEntries: RouteEntry[] = [
  {
    route: listProjectsRoute,
    handler: projectCtrl.listProjects as Handler,
    middleware: m([auth()]),
  },
  {
    route: createProjectRoute,
    handler: projectCtrl.createProject as Handler,
    middleware: m([auth(), requireGlobalRole("PROJECT_MANAGER")]),
  },
  {
    route: getProjectRoute,
    handler: projectCtrl.getProject as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
  {
    route: updateProjectRoute,
    handler: projectCtrl.updateProject as Handler,
    middleware: m([auth(), requireProjectManager()]),
  },
  {
    route: archiveProjectRoute,
    handler: projectCtrl.archiveProject as Handler,
    middleware: m([auth(), requireProjectOwner()]),
  },
  {
    route: deleteProjectRoute,
    handler: projectCtrl.deleteProject as Handler,
    middleware: m([auth(), requireProjectOwner()]),
  },
  {
    route: listMembersRoute,
    handler: projectCtrl.listMembers as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
  {
    route: inviteRoute,
    handler: projectCtrl.invite as Handler,
    middleware: m([auth(), requireProjectManager()]),
  },
  {
    route: acceptInvitationRoute,
    handler: projectCtrl.acceptInvitation as Handler,
    middleware: m([auth()]),
  },
  {
    route: rejectInvitationRoute,
    handler: projectCtrl.rejectInvitation as Handler,
    middleware: m([auth()]),
  },
  {
    route: changeRoleRoute,
    handler: projectCtrl.changeMemberRole as Handler,
    middleware: m([auth(), requireProjectManager()]),
  },
  {
    route: removeMemberRoute,
    handler: projectCtrl.removeMember as Handler,
    middleware: m([auth(), requireProjectManager()]),
  },
  {
    route: listActivityRoute,
    handler: projectCtrl.listActivity as Handler,
    middleware: m([auth(), requireProjectMember()]),
  },
];

// Allow unused - re-export for symmetry
export const _ = paginationSchema;
