// Attachment controller: list, upload, download, delete.

import type { Context } from "hono";
import * as attachmentService from "../services/attachment.service.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";

export const listAttachments = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  const items = await attachmentService.listForTask(user.id, user.role as never, taskId);
  return respondOk(c, items, "Attachments");
};

export const uploadAttachment = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) {
    return c.json({ success: false, message: "No file provided", error: { code: "BAD_REQUEST" } }, 400);
  }
  try {
    const record = await attachmentService.create(user.id, user.role as never, taskId, file);
    return respondOk(c, record, "Attachment uploaded", 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    if (message === "Unsupported file type" || message === "Maximum file size exceeded (10 MB limit)") {
      return c.json({ success: false, message, error: { code: "BAD_REQUEST" } }, 400);
    }
    throw err;
  }
};

export const downloadAttachment = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  const attachmentId = c.req.param("attachmentId");
  const { file } = await attachmentService.getFileForDownload(
    user.id,
    user.role as never,
    taskId,
    attachmentId,
  );
  c.header("Content-Type", file.mime);
  c.header("Content-Disposition", `attachment; filename="${file.name.replace(/"/g, "")}"`);
  c.header("Content-Length", String(file.bytes.length));
  return c.body(file.bytes as unknown as ArrayBuffer);
};

export const deleteAttachment = async (c: Context) => {
  const user = getUser(c);
  const taskId = c.req.param("taskId");
  const attachmentId = c.req.param("attachmentId");
  const result = await attachmentService.remove(user.id, user.role as never, taskId, attachmentId);
  return respondOk(c, result, "Attachment deleted");
};
