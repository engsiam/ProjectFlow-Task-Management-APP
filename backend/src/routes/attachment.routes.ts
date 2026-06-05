// Attachment routes — task-scoped file attachment CRUD.

import { createRoute, z } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as attachCtrl from "../controllers/attachment.controller.ts";
import { auth } from "../middleware/auth.ts";
import {
  bearerAuth,
  ErrorResponseSchema,
  jsonCreatedResponse,
  jsonErrorResponses,
  jsonOkResponse,
} from "../docs/openapi.ts";

const tag = ["Attachments"];
const security = [{ bearerAuth: [] }];

const taskIdParam = z.object({
  taskId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

const attachmentIdParam = z.object({
  taskId: z.string().regex(/^[a-fA-F0-9]{24}$/),
  attachmentId: z.string().regex(/^[a-fA-F0-9]{24}$/),
});

const userLite = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatar: z.string().nullable().optional(),
});

const attachmentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int(),
  uploadedBy: userLite,
  createdAt: z.string(),
  updatedAt: z.string(),
  downloadUrl: z.string(),
});

const attachmentListResponse = z.array(attachmentSchema);

const attachmentUploadResponse = z.object({
  success: z.literal(true),
  message: z.string(),
  data: attachmentSchema,
});

export const listAttachmentsRoute = createRoute({
  method: "get",
  path: "/api/tasks/:taskId/attachments",
  tags: tag,
  summary: "List task attachments",
  description: "Returns every attachment uploaded to a task the user can access.",
  security,
  request: { params: taskIdParam },
  responses: {
    200: jsonOkResponse("Attachments", attachmentListResponse),
    ...jsonErrorResponses([
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Not a member" },
      { status: 404, description: "Task not found" },
    ]),
  },
});

export const uploadAttachmentRoute = createRoute({
  method: "post",
  path: "/api/tasks/:taskId/attachments",
  tags: tag,
  summary: "Upload a task attachment",
  description:
    "Upload a PDF, DOC, DOCX, PNG, JPG, JPEG, or ZIP file up to 10 MB. Viewers cannot upload.",
  security,
  request: {
    params: taskIdParam,
    body: {
      // Multipart: Hono's parseBody() returns a File object, not a string.
      // We use z.any() to bypass Zod's body validator — the controller
      // (attachmentService.create → validateFile) does the real validation.
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.any().openapi({ type: "string", format: "binary" }),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: jsonCreatedResponse("Attachment uploaded", attachmentUploadResponse.shape.data),
    ...jsonErrorResponses([
      { status: 400, description: "Unsupported file type or maximum file size exceeded" },
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Task not found" },
    ]),
  },
});

export const downloadAttachmentRoute = createRoute({
  method: "get",
  path: "/api/tasks/:taskId/attachments/:attachmentId/download",
  tags: tag,
  summary: "Download a task attachment",
  description: "Streams the attachment binary with Content-Disposition: attachment.",
  security,
  request: { params: attachmentIdParam },
  responses: {
    200: {
      description: "File binary",
      content: {
        "application/octet-stream": { schema: z.string().openapi({ type: "string", format: "binary" }) },
      },
    },
    ...jsonErrorResponses([
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Attachment not found" },
    ]),
  },
});

export const deleteAttachmentRoute = createRoute({
  method: "delete",
  path: "/api/tasks/:taskId/attachments/:attachmentId",
  tags: tag,
  summary: "Delete a task attachment",
  description: "Removes the attachment metadata and file from storage.",
  security,
  request: { params: attachmentIdParam },
  responses: {
    200: jsonOkResponse("Attachment deleted", z.object({ deleted: z.boolean() })),
    ...jsonErrorResponses([
      { status: 401, description: "Unauthorized" },
      { status: 403, description: "Forbidden" },
      { status: 404, description: "Attachment not found" },
    ]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

const m = (mw: MiddlewareHandler[]) => mw;

export const attachmentRouteEntries: RouteEntry[] = [
  {
    route: listAttachmentsRoute,
    handler: attachCtrl.listAttachments as Handler,
    middleware: m([auth()]),
  },
  {
    route: uploadAttachmentRoute,
    handler: attachCtrl.uploadAttachment as Handler,
    middleware: m([auth()]),
  },
  {
    route: downloadAttachmentRoute,
    handler: attachCtrl.downloadAttachment as Handler,
    middleware: m([auth()]),
  },
  {
    route: deleteAttachmentRoute,
    handler: attachCtrl.deleteAttachment as Handler,
    middleware: m([auth()]),
  },
];
