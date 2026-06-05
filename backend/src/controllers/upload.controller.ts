// Upload controller. Handles multipart file upload for avatars.
//
// Storage is platform-aware:
//   - Local: writes to UPLOAD_DIR on the local filesystem.
//   - Deno Deploy: returns 503 with a clear message; configure an
//     object-storage backend (R2/S3) for production deployments.

import type { Context } from "hono";
import { env, isDeploy, storageDisabled } from "../config/env.ts";
import { BadRequestError, ServiceUnavailableError } from "../utils/errors.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const extForType = (type: string) => {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return ".jpg";
};

export const uploadAvatar = async (c: Context) => {
  getUser(c); // Ensure authenticated

  if (storageDisabled) {
    throw new ServiceUnavailableError(
      isDeploy
        ? "File uploads are disabled on Deno Deploy. Configure STORAGE_BACKEND with an object-storage provider (R2/S3) for production storage."
        : "File uploads are disabled. Set STORAGE_BACKEND=local and UPLOAD_DIR to enable local filesystem storage.",
    );
  }

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) throw new BadRequestError("No file provided");

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new BadRequestError("Only PNG, JPEG, WebP, and GIF images are allowed.");
  }
  if (file.size > MAX_SIZE) {
    throw new BadRequestError("File size must be under 2 MB.");
  }

  const uploadDir = `${env.UPLOAD_DIR}/avatars`;
  const ext = extForType(file.type);
  const name = `${crypto.randomUUID()}${ext}`;
  const path = `${uploadDir}/${name}`;

  await Deno.mkdir(uploadDir, { recursive: true });
  await Deno.writeFile(path, new Uint8Array(await file.arrayBuffer()));

  // Build a URL the client can use to fetch the avatar. On local this is
  // the dev server origin; on Deploy the upload is unreachable from the
  // outside anyway, so this branch never executes.
  const url = new URL(c.req.url);
  url.pathname = `/uploads/${path}`;
  return respondOk(c, { url: url.toString() }, "Avatar uploaded");
};
