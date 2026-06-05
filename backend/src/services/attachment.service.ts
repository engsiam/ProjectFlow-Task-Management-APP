// Attachment service: file metadata CRUD plus on-disk storage helpers.
//
// Storage is platform-aware:
//   - Local (`STORAGE_BACKEND=local`): writes to UPLOAD_DIR/attachments on
//     the local filesystem; reads via Deno.readFile.
//   - Deno Deploy (`STORAGE_BACKEND=disabled`): the create/remove/read
//     paths return ServiceUnavailableError. The Prisma metadata is still
//     persisted so an admin can later migrate to object storage without
//     losing the record trail.

import { prisma } from "../prisma/client.ts";
import { env, storageDisabled } from "../config/env.ts";
import { ActivityAction, type RoleType } from "../types/domain.ts";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
} from "../utils/errors.ts";
import { isValidObjectId } from "../utils/id.ts";

export const ALLOWED_MIME_TYPES: ReadonlyArray<{ mime: string; ext: string }> = [
  { mime: "application/pdf", ext: ".pdf" },
  { mime: "application/msword", ext: ".doc" },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ".docx" },
  { mime: "image/png", ext: ".png" },
  { mime: "image/jpeg", ext: ".jpg" },
  { mime: "image/jpg", ext: ".jpg" },
  { mime: "application/zip", ext: ".zip" },
  { mime: "application/x-zip-compressed", ext: ".zip" },
];

export const ALLOWED_MIME_SET = new Set(ALLOWED_MIME_TYPES.map((t) => t.mime));

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const STORAGE_DIR = `${env.UPLOAD_DIR}/attachments`;

export const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".zip"];

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".zip": "application/zip",
};

const sanitize = (s: string) => s.replace(/[^\w.\-]+/g, "_").slice(0, 200);

const ensureDir = async (dir: string) => {
  await Deno.mkdir(dir, { recursive: true });
};

const assertStorage = () => {
  if (storageDisabled) {
    throw new ServiceUnavailableError(
      "Attachment storage is disabled on this deployment. Configure STORAGE_BACKEND with an object-storage provider (R2/S3) to enable uploads.",
    );
  }
};

const userSelect = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} as const;

const resolveTaskProject = async (taskId: string) => {
  if (!isValidObjectId(taskId)) {
    throw new BadRequestError("Invalid task id");
  }
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true },
  });
  if (!task) throw new NotFoundError("Task not found");
  return task;
};

/**
 * Verify the user can access the task's project. Global ADMIN and VIEWER
 * have workspace-wide read; project members with TEAM_MEMBER or higher may
 * write. Global ADMIN may also write to any task (delete is later re-checked
 * by the service's RBAC rules for the specific attachment).
 */
export const ensureTaskAccess = async (
  userId: string,
  userRole: RoleType | undefined,
  taskId: string,
  write: boolean,
) => {
  const task = await resolveTaskProject(taskId);
  const project = await prisma.project.findUnique({
    where: { id: task.projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) throw new NotFoundError("Project not found");

  const isOwner = project.ownerId === userId;
  const isGlobalAdmin = userRole === "ADMIN";
  const isGlobalViewer = userRole === "VIEWER";

  if (write) {
    // Global VIEWER can never write.
    if (isGlobalViewer) throw new ForbiddenError("Viewers cannot modify attachments");
    if (isOwner || isGlobalAdmin) return task;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
      select: { role: true },
    });
    if (!member) throw new ForbiddenError("You are not a member of this project");
    if (member.role === "VIEWER") {
      throw new ForbiddenError("Viewers cannot modify attachments");
    }
    return task;
  }

  // Read access
  if (isOwner) return task;
  if (isGlobalAdmin || isGlobalViewer) return task;
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId } },
    select: { role: true },
  });
  if (!member) throw new ForbiddenError("You are not a member of this project");
  return task;
};

export type AttachmentRecord = {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: { id: string; name: string; username: string; avatar: string | null };
  createdAt: string;
  updatedAt: string;
  downloadUrl: string;
};

const toRecord = (
  row: {
    id: string;
    taskId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    createdAt: Date;
    updatedAt: Date;
    uploadedBy: { id: string; name: string; username: string; avatar: string | null };
  },
): AttachmentRecord => ({
  id: row.id,
  taskId: row.taskId,
  fileName: row.fileName,
  mimeType: row.mimeType,
  fileSize: row.fileSize,
  uploadedBy: row.uploadedBy,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  downloadUrl: `/api/tasks/${row.taskId}/attachments/${row.id}/download`,
});

export const listForTask = async (
  userId: string,
  userRole: RoleType | undefined,
  taskId: string,
): Promise<AttachmentRecord[]> => {
  await ensureTaskAccess(userId, userRole, taskId, false);
  const rows = await prisma.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: userSelect } },
  });
  return rows.map(toRecord);
};

/**
 * Validate an uploaded file by type, extension, and size.
 */
export const validateFile = (file: { name?: string; type?: string; size: number }) => {
  if (!file.name) throw new BadRequestError("File is missing a name");
  if (file.size <= 0) throw new BadRequestError("File is empty");
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError("Maximum file size exceeded (10 MB limit)");
  }
  const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BadRequestError("Unsupported file type");
  }
  // If the browser supplied a mime, verify it; otherwise infer from extension.
  if (file.type) {
    if (!ALLOWED_MIME_SET.has(file.type)) {
      // Some browsers report empty mime for .doc; fall back to extension
      const inferred = EXT_TO_MIME[ext];
      if (!inferred) throw new BadRequestError("Unsupported file type");
    }
  } else {
    const inferred = EXT_TO_MIME[ext];
    if (!inferred) throw new BadRequestError("Unsupported file type");
  }
  return ext;
};

export const create = async (
  userId: string,
  userRole: RoleType | undefined,
  taskId: string,
  file: File,
): Promise<AttachmentRecord> => {
  assertStorage();
  await ensureTaskAccess(userId, userRole, taskId, true);
  const ext = validateFile(file);

  const safeOriginal = sanitize(file.name);
  const storedName = `${crypto.randomUUID()}${ext}`;
  const taskDir = `${STORAGE_DIR}/${taskId}`;
  await ensureDir(taskDir);
  const fullPath = `${taskDir}/${storedName}`;
  await Deno.writeFile(fullPath, new Uint8Array(await file.arrayBuffer()));

  const mimeType = file.type || EXT_TO_MIME[ext] || "application/octet-stream";

  const row = await prisma.attachment.create({
    data: {
      taskId,
      uploadedById: userId,
      fileName: safeOriginal,
      storedName,
      mimeType,
      fileSize: file.size,
      storagePath: fullPath,
    },
    include: { uploadedBy: { select: userSelect } },
  });

  // Best-effort activity log
  try {
    await prisma.activityLog.create({
      data: {
        actorId: userId,
        action: ActivityAction.ATTACHMENT_UPLOADED,
        entityType: "attachment",
        entityId: row.id,
        taskId,
        projectId: row.taskId
          ? (await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } }))
            ?.projectId
          : undefined,
        metadata: { fileName: safeOriginal, fileSize: file.size, mimeType },
      },
    });
  } catch (_err) {
    // ignore
  }

  return toRecord(row);
};

export const remove = async (
  userId: string,
  userRole: RoleType | undefined,
  taskId: string,
  attachmentId: string,
): Promise<{ deleted: boolean }> => {
  if (!isValidObjectId(attachmentId)) throw new BadRequestError("Invalid attachment id");
  await ensureTaskAccess(userId, userRole, taskId, true);
  const row = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { uploadedBy: { select: userSelect } },
  });
  if (!row || row.taskId !== taskId) throw new NotFoundError("Attachment not found");

  // Allow only the uploader, project owner, project manager/admin, or global admin.
  const project = await prisma.project.findUnique({
    where: {
      id: (await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } }))
        ?.projectId ?? "",
    },
    select: { id: true, ownerId: true },
  });
  const isOwner = project?.ownerId === userId;
  const isUploader = row.uploadedById === userId;
  const isGlobalAdmin = userRole === "ADMIN";
  let allowed = isOwner || isUploader || isGlobalAdmin;
  if (!allowed && project) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId } },
      select: { role: true },
    });
    if (member && (member.role === "PROJECT_MANAGER" || member.role === "ADMIN")) {
      allowed = true;
    }
  }
  if (!allowed) throw new ForbiddenError("You cannot delete this attachment");

  // Remove the file from disk; ignore errors if it's already gone.
  // On Deploy this is a no-op (the directory is read-only / ephemeral).
  if (!storageDisabled) {
    try {
      await Deno.remove(row.storagePath);
    } catch (_err) {
      // ignore
    }
  }
  await prisma.attachment.delete({ where: { id: attachmentId } });

  try {
    await prisma.activityLog.create({
      data: {
        actorId: userId,
        action: ActivityAction.ATTACHMENT_DELETED,
        entityType: "attachment",
        entityId: attachmentId,
        taskId,
        projectId: project?.id,
        metadata: { fileName: row.fileName },
      },
    });
  } catch (_err) {
    // ignore
  }

  return { deleted: true };
};

export const getFileForDownload = async (
  userId: string,
  userRole: RoleType | undefined,
  taskId: string,
  attachmentId: string,
): Promise<{ file: { name: string; mime: string; bytes: Uint8Array } }> => {
  if (!isValidObjectId(attachmentId)) throw new BadRequestError("Invalid attachment id");
  await ensureTaskAccess(userId, userRole, taskId, false);
  const row = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!row || row.taskId !== taskId) throw new NotFoundError("Attachment not found");
  assertStorage();
  let bytes: Uint8Array;
  try {
    bytes = await Deno.readFile(row.storagePath);
  } catch {
    throw new NotFoundError("File not found on disk");
  }
  return {
    file: {
      name: row.fileName,
      mime: row.mimeType,
      bytes,
    },
  };
};
